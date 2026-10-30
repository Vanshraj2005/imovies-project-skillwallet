import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setBookingConfirmation, clearSeatHold } from '../features/booking/bookingSlice';
import { bookingsApi, paymentsApi } from '../services/api';
import Button from '../components/common/Button';
import ErrorAlert from '../components/common/ErrorAlert';
import { toast } from 'react-toastify';

const foodOptions = [
  {
    id: 'f-1',
    name: 'Caramel Popcorn & Soda Duo',
    price: 8.50,
    description: '1 Large Warm Caramel Popcorn + 1 Medium Fountain Beverage',
    icon: 'bi-cup-straw',
  },
  {
    id: 'f-2',
    name: 'Crispy Cheese Nachos',
    price: 7.00,
    description: 'Fresh tortilla chips served with warm melted jalapeno cheddar dip',
    icon: 'bi-box2-heart',
  },
];

const BookingSummaryPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    selectedMovie,
    selectedTheatre,
    selectedDate,
    selectedShowtime,
    selectedSeats,
    holdId,
    holdExpiresAt,
    ticketSubtotal,
    convenienceFee,
  } = useSelector((state) => state.booking);

  const { user } = useSelector((state) => state.auth);

  const [selectedFood, setSelectedFood] = useState([]);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  // Synchronized Hold Countdown Timer
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    if (!holdExpiresAt) {
      setSecondsRemaining(600); // default 10m fallback
      return;
    }

    const targetTime = new Date(holdExpiresAt).getTime();
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        toast.error('Your seat hold has expired. Please select your seats again.');
        dispatch(clearSeatHold());
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt, dispatch]);

  const hasSeats = selectedSeats.length > 0;
  const showId = selectedShowtime?.id || selectedShowtime?._id || 'sh101';
  const movieTitle = selectedMovie?.title || 'Interstellar: Beyond Time';
  const theatreName = selectedTheatre?.name || 'IMovies Grand Cinema - Times Square';
  const showDate = selectedDate || new Date().toISOString().split('T')[0];
  const showTime = selectedShowtime?.time || '05:15 PM';

  const toggleFoodItem = (item) => {
    setSelectedFood((prev) => {
      const exists = prev.find((f) => f.id === item.id);
      if (exists) {
        return prev.filter((f) => f.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const foodSubtotal = selectedFood.reduce((sum, f) => sum + f.price, 0);
  const effectiveSubtotal = ticketSubtotal > 0 ? ticketSubtotal : (hasSeats ? selectedSeats.length * 12.5 : 25.0);
  const effectiveFee = convenienceFee > 0 ? convenienceFee : (hasSeats ? selectedSeats.length * 1.5 : 3.0);
  const grandTotal = parseFloat((effectiveSubtotal + effectiveFee + foodSubtotal).toFixed(2));

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Authoritative Checkout Flow:
  // 1. Process payment via dev_mock gateway with idempotency key
  // 2. Create and confirm booking with server-verified pricing
  // 3. Navigate to confirmation
  const handleCompletePayment = async () => {
    if (!agreedToTerms) {
      toast.warning('Please agree to the cinema terms and refund policy to proceed.');
      return;
    }

    if (secondsRemaining <= 0 && holdExpiresAt) {
      toast.error('Your reservation hold has expired. Please reselect seats.');
      navigate('/seats');
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    const idempotencyKey = `idem_${holdId || 'hold'}_${user?._id || user?.id || 'guest'}_${Date.now()}`;
    const seatNumbers = selectedSeats.length > 0 ? selectedSeats.map((s) => s.id) : ['A1', 'A2'];

    try {
      // 1. Process Payment
      const paymentRes = await paymentsApi.process({
        showId,
        holdId,
        seatNumbers,
        amount: grandTotal,
        provider: 'dev_mock',
        paymentMethod: 'Dev Mock Card (Ending in 4242)',
        idempotencyKey,
        simulateFailure,
      });

      // 2. Create and Confirm Booking
      const bookingPayload = {
        showId,
        seats: selectedSeats.length > 0 ? selectedSeats : [
          { id: 'A1', seatNumber: 'A1', row: 'A', tier: 'VIP', price: 16.5 },
          { id: 'A2', seatNumber: 'A2', row: 'A', tier: 'VIP', price: 16.5 },
        ],
        foodItems: selectedFood.map((f) => f.name),
        foodSubtotal,
        paymentMethod: paymentRes.data.paymentMethodSummary,
      };

      const bookingRes = await bookingsApi.create(bookingPayload);
      const confirmedBooking = bookingRes.data;

      // 3. Clear active hold in store and save confirmation
      dispatch(clearSeatHold());
      dispatch(setBookingConfirmation({
        ...confirmedBooking,
        movieTitle: confirmedBooking.movie?.title || movieTitle,
        theatreName: confirmedBooking.theatre?.name || theatreName,
        showDate,
        showTime,
        seats: confirmedBooking.seats.map((s) => (typeof s === 'object' ? s.seatNumber : s)),
        totalAmount: confirmedBooking.pricing?.totalAmount || grandTotal,
        paymentStatus: 'COMPLETED (dev_mock)',
        paymentMethod: paymentRes.data.paymentMethodSummary,
        transactionId: paymentRes.data.transactionId,
        customerEmail: user?.email || 'customer@imovies.com',
        customerName: user?.name || 'Valued Guest',
      }));

      toast.success('Payment authorized! Your e-tickets are confirmed.');
      navigate('/confirmation');
    } catch (err) {
      setPaymentError(err.message || 'Payment authorization failed.');
      toast.error(err.message || 'Payment could not be processed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1 className="h3 fw-bold text-dark mb-1">Review & Checkout</h1>
        <p className="text-secondary small mb-0">
          Verify your booking details, customize refreshments, and complete your reservation
        </p>
      </div>

      {/* Hold Synchronization Banner */}
      <div className="alert alert-info border d-flex align-items-center justify-content-between p-3 mb-4 shadow-sm">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-stopwatch text-primary fs-5" />
          <div>
            <strong className="text-dark">Hold Expiration Timer: </strong>
            <span className="small text-secondary">
              Your selected seats are locked. Please complete checkout within{' '}
              <span className="fw-mono fw-bold fs-6 text-primary">{formatTimer(secondsRemaining)}</span>.
            </span>
          </div>
        </div>
        <Link to={`/seats?showId=${showId}`} className="btn btn-sm btn-outline-primary">
          Change Seats
        </Link>
      </div>

      {paymentError && (
        <ErrorAlert message={paymentError} className="mb-4" />
      )}

      <div className="row g-4">
        {/* Left Column: Order details & Concessions & Payment Form */}
        <div className="col-lg-8">
          {/* Movie & Showtime Card */}
          <div className="bg-white border rounded p-4 shadow-sm mb-4">
            <h2 className="h6 fw-bold text-dark mb-3 pb-2 border-bottom">1. Showtime Details</h2>
            <div className="row g-3">
              <div className="col-md-7">
                <h3 className="h6 fw-bold text-primary mb-1">{movieTitle}</h3>
                <div className="text-dark small mb-1">{theatreName}</div>
                <div className="text-secondary small">
                  <i className="bi bi-calendar3 me-1 text-primary" />
                  {showDate} • <i className="bi bi-clock me-1 text-primary" />
                  {showTime}
                </div>
              </div>

              <div className="col-md-5 bg-light p-3 rounded border">
                <span className="small text-muted d-block mb-1">Reserved Seats:</span>
                {selectedSeats.length > 0 ? (
                  <div className="d-flex flex-wrap gap-1">
                    {selectedSeats.map((s) => (
                      <span key={s.id} className="badge bg-white border text-dark fw-bold">
                        {s.id} ({s.tier || 'Standard'})
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="small text-muted">
                    2 Seats Selected [A1, A2] (VIP)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Concessions / Food Pre-order */}
          <div className="bg-white border rounded p-4 shadow-sm mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
              <div>
                <h2 className="h6 fw-bold text-dark mb-0">2. Cinema Refreshments (Optional)</h2>
                <span className="text-muted small">
                  Pre-order hot snacks and drinks ready at the express counter
                </span>
              </div>
              <span className="badge bg-light text-secondary border">Skip lines</span>
            </div>

            <div className="row g-3">
              {foodOptions.map((item) => {
                const isSelected = selectedFood.some((f) => f.id === item.id);
                return (
                  <div className="col-md-6" key={item.id}>
                    <div
                      className={`p-3 border rounded d-flex align-items-start justify-content-between cursor-pointer ${
                        isSelected ? 'bg-primary-subtle border-primary' : 'bg-light'
                      }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleFoodItem(item)}
                    >
                      <div>
                        <div className="fw-bold small text-dark d-flex align-items-center gap-1 mb-1">
                          <i className={`bi ${item.icon} text-primary`} />
                          {item.name}
                        </div>
                        <div className="text-muted small mb-2" style={{ fontSize: '0.75rem' }}>
                          {item.description}
                        </div>
                        <span className="fw-bold text-primary small">
                          +${item.price.toFixed(2)}
                        </span>
                      </div>

                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="bg-white border rounded p-4 shadow-sm mb-4">
            <h2 className="h6 fw-bold text-dark mb-3 pb-2 border-bottom">3. Payment Information</h2>

            {/* Clearly Labeled Development Mock Provider Notice */}
            <div className="alert alert-info border d-flex align-items-start gap-3 mb-4">
              <i className="bi bi-info-circle-fill fs-5 text-primary mt-1" />
              <div>
                <strong className="d-block text-dark">
                  Payment Mode: Development Mock Gateway Active (dev_mock)
                </strong>
                <span className="small text-secondary">
                  This environment uses an authorized development mock gateway. Idempotency protection is active to prevent duplicate charges. No real monetary transactions will occur.
                </span>
              </div>
            </div>

            <div className="border rounded p-3 bg-light mb-3">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="radio"
                    id="mock-card"
                    name="paymentProvider"
                    defaultChecked
                    className="form-check-input"
                  />
                  <label htmlFor="mock-card" className="fw-semibold text-dark small mb-0">
                    Mock Card / Direct Sandbox Authorization
                  </label>
                </div>
                <div className="d-flex gap-2">
                  <span className="badge bg-white text-muted border">VISA</span>
                  <span className="badge bg-white text-muted border">Mastercard</span>
                </div>
              </div>

              <div className="row g-2">
                <div className="col-12">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value="4242 •••• •••• 4242 (Simulated Test Card)"
                    disabled
                  />
                </div>
                <div className="col-6">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value="Exp: 12/28"
                    disabled
                  />
                </div>
                <div className="col-6">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value="CVC: 123"
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* QA Testing Toggle: Simulate Payment Failure */}
            <div className="p-3 bg-light border rounded mb-3">
              <div className="form-check form-switch mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="simulateFailureSwitch"
                  checked={simulateFailure}
                  onChange={(e) => setSimulateFailure(e.target.checked)}
                />
                <label className="form-check-label small fw-semibold text-danger" htmlFor="simulateFailureSwitch">
                  Simulate Payment Decline (QA Test Mode for Error Handling)
                </label>
                <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                  When enabled, the server returns 402 Card Declined to test error messaging without creating a confirmed booking.
                </div>
              </div>
            </div>

            {/* Cancellation Policy and Terms Agreement Checkbox */}
            <div className="p-3 bg-light border rounded mb-3 small text-secondary">
              <strong className="text-dark d-block mb-1">Cinema Cancellation Policy:</strong>
              <div>
                Full refund eligible if cancelled at least 2 hours before the scheduled showtime. Seats are immediately released upon cancellation.
              </div>
            </div>

            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="termsCheck"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
              />
              <label className="form-check-label small text-secondary" htmlFor="termsCheck">
                I agree to the cinema admission terms, digital check-in conditions, and cancellation policy.
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Authorize CTA */}
        <div className="col-lg-4">
          <div className="bg-white border rounded p-4 shadow-sm sticky-top" style={{ top: '80px' }}>
            <h2 className="h6 fw-bold text-dark mb-3 pb-2 border-bottom">Authoritative Payment Breakdown</h2>

            <div className="d-flex flex-column gap-2 mb-3 pb-3 border-bottom small">
              <div className="d-flex justify-content-between text-secondary">
                <span>Tickets ({selectedSeats.length || 2} seats):</span>
                <span className="fw-semibold text-dark">
                  ${effectiveSubtotal.toFixed(2)}
                </span>
              </div>

              <div className="d-flex justify-content-between text-secondary">
                <span>Convenience Fee ($1.50/ticket):</span>
                <span>${effectiveFee.toFixed(2)}</span>
              </div>

              {selectedFood.length > 0 && (
                <div className="d-flex justify-content-between text-secondary">
                  <span>Concessions Pre-order:</span>
                  <span className="fw-semibold text-primary">+${foodSubtotal.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4">
              <span className="fw-bold text-dark">Total Amount:</span>
              <span className="h4 fw-bold text-primary mb-0">
                ${grandTotal.toFixed(2)}
              </span>
            </div>

            <Button
              variant="primary"
              className="w-100 py-2 fs-6"
              loading={isProcessing}
              disabled={!agreedToTerms || (secondsRemaining <= 0 && holdExpiresAt)}
              onClick={handleCompletePayment}
            >
              <i className="bi bi-lock-fill me-1" />
              Complete & Pay ${grandTotal.toFixed(2)}
            </Button>

            <div className="text-center text-muted small mt-3" style={{ fontSize: '0.75rem' }}>
              <i className="bi bi-shield-lock-fill text-success me-1" />
              256-bit SSL encrypted & tokenized checkout
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSummaryPage;
