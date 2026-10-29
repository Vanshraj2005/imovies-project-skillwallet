import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setBookingConfirmation } from '../features/booking/bookingSlice';
import Button from '../components/common/Button';
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
    ticketSubtotal,
    convenienceFee,
  } = useSelector((state) => state.booking);

  const { user } = useSelector((state) => state.auth);

  const [selectedFood, setSelectedFood] = useState([]);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // If user navigated directly without selecting seats, fallback or alert
  const hasSeats = selectedSeats.length > 0;
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
  const grandTotal = ticketSubtotal + (hasSeats ? convenienceFee : 0) + foodSubtotal;

  const handleCompletePayment = () => {
    if (!agreedToTerms) {
      toast.warning('Please agree to the cinema terms and refund policy to proceed.');
      return;
    }

    setIsProcessing(true);

    // Simulate reliable booking generation & confirmation
    setTimeout(() => {
      const confirmationPayload = {
        bookingId: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
        movieTitle,
        theatreName,
        showDate,
        showTime,
        seats: selectedSeats.map((s) => s.id),
        foodItems: selectedFood.map((f) => f.name),
        totalAmount: grandTotal,
        paymentStatus: 'COMPLETED (Mock Dev Provider)',
        paymentMethod: 'Test Card (Ending in 4242)',
        bookedAt: new Date().toISOString(),
        customerEmail: user?.email || 'customer@imovies.com',
        customerName: user?.name || 'Valued Guest',
      };

      dispatch(setBookingConfirmation(confirmationPayload));
      setIsProcessing(false);
      toast.success('Payment authorized! Your e-tickets are confirmed.');
      navigate('/confirmation');
    }, 1200);
  };

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1 className="h3 fw-bold text-dark mb-1">Review & Checkout</h1>
        <p className="text-secondary small mb-0">
          Verify your booking details, customize refreshments, and complete your reservation
        </p>
      </div>

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
                        {s.id}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="small text-danger fw-semibold">
                    No seats selected. (Defaulting to A1, A2 for checkout test)
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
                  Payment Mode: Development Mock Gateway Active
                </strong>
                <span className="small text-secondary">
                  This environment uses an authorized development mock gateway. No real monetary transactions will occur. Part 4 will integrate the live Stripe and Razorpay payment credentials.
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
                    Mock Card / Direct Authorization
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

            {/* Terms Agreement Checkbox */}
            <div className="form-check mt-3">
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
            <h2 className="h6 fw-bold text-dark mb-3 pb-2 border-bottom">Payment Breakdown</h2>

            <div className="d-flex flex-column gap-2 mb-3 pb-3 border-bottom small">
              <div className="d-flex justify-content-between text-secondary">
                <span>Tickets ({selectedSeats.length || 2} seats):</span>
                <span className="fw-semibold text-dark">
                  ${(ticketSubtotal || 25.0).toFixed(2)}
                </span>
              </div>

              <div className="d-flex justify-content-between text-secondary">
                <span>Booking & Convenience Fee:</span>
                <span>${(convenienceFee || 1.5).toFixed(2)}</span>
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
                ${grandTotal > 0 ? grandTotal.toFixed(2) : '26.50'}
              </span>
            </div>

            <Button
              variant="primary"
              className="w-100 py-2 fs-6"
              loading={isProcessing}
              disabled={!agreedToTerms}
              onClick={handleCompletePayment}
            >
              <i className="bi bi-lock-fill me-1" />
              Complete & Pay ${(grandTotal > 0 ? grandTotal : 26.5).toFixed(2)}
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
