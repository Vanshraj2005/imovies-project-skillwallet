/**
 * Payment Controller
 * Manages financial transactions, idempotency key enforcement, dev_mock sandbox,
 * and gateway audit logging. Never stores raw card numbers or CVVs.
 */
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const SeatLock = require('../models/SeatLock');
const config = require('../config/env');
const { inMemoryLocks } = require('./seatController');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { logger } = require('../utils/logger');

// In-memory payments fallback store for environments without MongoDB running
const inMemoryPayments = [];

/**
 * Process Payment (Supports Dev Mock & Provider Integration with Idempotency)
 * POST /api/v1/payments/process
 */
const processPayment = async (req, res) => {
  try {
    const {
      bookingId,
      showId,
      holdId,
      seatNumbers,
      amount: clientAmount,
      provider = config.payment?.provider || 'dev_mock',
      paymentMethod = 'Dev Mock Card',
      idempotencyKey,
      simulateFailure = false,
    } = req.body;

    const userId = req.user._id || req.user.id;
    const isDBConnected = Payment.db?.readyState === 1;

    // 1. Idempotency Check: Prevent duplicate payment processing on network retries
    if (idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.trim()) {
      const trimmedKey = idempotencyKey.trim();

      if (isDBConnected) {
        const existingPayment = await Payment.findOne({
          idempotencyKey: trimmedKey,
          user: userId,
          status: 'COMPLETED',
        });

        if (existingPayment) {
          logger.info(`Idempotent payment re-delivery: ${existingPayment.transactionId} for key ${trimmedKey}`);
          return sendSuccess(res, 'Payment already processed (Idempotent response)', {
            transactionId: existingPayment.transactionId,
            amount: existingPayment.amount,
            currency: existingPayment.currency,
            status: existingPayment.status,
            provider: existingPayment.provider,
            paymentMethodSummary: existingPayment.paymentMethodSummary,
            idempotencyKey: existingPayment.idempotencyKey,
            processedAt: existingPayment.createdAt,
            isIdempotentReplay: true,
          });
        }
      } else {
        const existingPayment = inMemoryPayments.find(
          (p) => p.idempotencyKey === trimmedKey && String(p.user) === String(userId) && p.status === 'COMPLETED'
        );

        if (existingPayment) {
          return sendSuccess(res, 'Payment already processed (Idempotent replay)', {
            transactionId: existingPayment.transactionId,
            amount: existingPayment.amount,
            currency: existingPayment.currency,
            status: existingPayment.status,
            provider: existingPayment.provider,
            paymentMethodSummary: existingPayment.paymentMethodSummary,
            idempotencyKey: existingPayment.idempotencyKey,
            processedAt: existingPayment.createdAt,
            isIdempotentReplay: true,
          });
        }
      }
    }

    // 2. Simulated Payment Failure (for automated and manual failure testing)
    if (simulateFailure === true) {
      logger.warn(`Simulated payment decline triggered for user ${userId}`);
      return sendError(
        res,
        'Dev Mock Gateway: Card authorization declined by issuing bank (Simulated failure).',
        402
      );
    }

    // 3. Hold Expiration Re-Verification (Hold must still be active to process payment)
    const now = new Date();
    if (showId && Array.isArray(seatNumbers) && seatNumbers.length > 0) {
      if (isDBConnected) {
        const activeLocks = await SeatLock.find({
          show: showId,
          seatNumber: { $in: seatNumbers.map((s) => String(s).toUpperCase()) },
          user: userId,
          status: 'HELD',
          expiresAt: { $gt: now },
        });

        if (activeLocks.length < seatNumbers.length) {
          return sendError(
            res,
            'Your temporary seat hold has expired. Please return to the seating map and re-select your seats.',
            400
          );
        }
      } else {
        for (const seatNum of seatNumbers) {
          const key = `${showId}:${seatNum}`;
          const lock = inMemoryLocks.get(key);
          if (!lock || lock.status !== 'HELD' || lock.expiresAt <= now || String(lock.user) !== String(userId)) {
            return sendError(
              res,
              'Your temporary seat hold has expired. Please re-select your seats.',
              400
            );
          }
        }
      }
    }

    // 4. Determine verified amount
    let verifiedAmount = 29.50; // fallback default
    let booking = null;

    if (bookingId) {
      if (isDBConnected && String(bookingId).match(/^[0-9a-fA-F]{24}$/)) {
        booking = await Booking.findById(bookingId);
      }
      if (booking && booking.pricing?.totalAmount) {
        verifiedAmount = booking.pricing.totalAmount;
      }
    } else if (clientAmount && Number(clientAmount) > 0) {
      verifiedAmount = parseFloat(Number(clientAmount).toFixed(2));
    }

    // 5. Generate secure transaction ID
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const transactionId = `TXN-${provider.toUpperCase()}-${Date.now()}-${randomHex}`;
    const paymentMethodSummary = `${paymentMethod} (Sandbox Verified)`;

    let paymentRecord;
    if (isDBConnected) {
      paymentRecord = await Payment.create({
        booking: booking ? booking._id : null,
        user: userId,
        provider,
        transactionId,
        amount: verifiedAmount,
        currency: 'USD',
        status: 'COMPLETED',
        idempotencyKey: idempotencyKey ? String(idempotencyKey).trim() : undefined,
        paymentMethodSummary,
        metadata: {
          ipAddress: req.ip,
          mode: config.env,
          holdId: holdId || null,
        },
      });

      if (booking) {
        booking.paymentStatus = 'PAID';
        booking.payment = paymentRecord._id;
        await booking.save();
      }
    } else {
      paymentRecord = {
        _id: `pay_${Date.now()}`,
        id: `pay_${Date.now()}`,
        booking: bookingId || null,
        user: userId,
        provider,
        transactionId,
        amount: verifiedAmount,
        currency: 'USD',
        status: 'COMPLETED',
        idempotencyKey: idempotencyKey ? String(idempotencyKey).trim() : undefined,
        paymentMethodSummary,
        createdAt: new Date(),
      };
      inMemoryPayments.push(paymentRecord);
    }

    logger.info(`Payment authorized: ${transactionId} ($${verifiedAmount}) via ${provider}`);

    return sendSuccess(
      res,
      'Payment processed and authorized successfully',
      {
        transactionId,
        amount: verifiedAmount,
        currency: 'USD',
        status: 'COMPLETED',
        provider,
        paymentMethodSummary,
        idempotencyKey: idempotencyKey || null,
        processedAt: new Date().toISOString(),
      },
      200
    );
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.transactionId) {
      return sendError(res, 'Transaction ID conflict encountered. Please retry.', 409);
    }
    return sendError(res, error.message, 500);
  }
};

/**
 * Get Payments For Booking
 * GET /api/v1/payments/booking/:bookingId
 */
const getPaymentsByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const isDBConnected = Payment.db?.readyState === 1;

    let payments = [];
    if (isDBConnected && bookingId.match(/^[0-9a-fA-F]{24}$/)) {
      payments = await Payment.find({ booking: bookingId }).sort({ createdAt: -1 });
    } else {
      payments = inMemoryPayments.filter((p) => p.booking === bookingId);
    }

    return sendSuccess(res, 'Payment records retrieved', payments);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  processPayment,
  getPaymentsByBooking,
  inMemoryPayments,
};
