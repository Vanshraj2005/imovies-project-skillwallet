import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSeat, clearSeats } from '../features/booking/bookingSlice';
import Button from '../components/common/Button';
import { toast } from 'react-toastify';

// Realistic seat matrix structure
const seatTiers = [
  {
    tierName: 'Platinum VIP Recliner',
    price: 16.50,
    rows: ['A', 'B'],
    seatsPerRow: 10,
  },
  {
    tierName: 'Gold Executive',
    price: 14.50,
    rows: ['C', 'D'],
    seatsPerRow: 12,
  },
  {
    tierName: 'Silver Standard',
    price: 12.50,
    rows: ['E', 'F', 'G'],
    seatsPerRow: 12,
  },
];

// Pre-reserved seats for realistic cinema state
const reservedSeats = new Set(['A4', 'A5', 'B8', 'C5', 'C6', 'C7', 'D2', 'F6', 'F7']);
const wheelchairSeats = new Set(['G1', 'G12']);

const SeatSelectionPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  const {
    selectedMovie,
    selectedTheatre,
    selectedDate,
    selectedShowtime,
    selectedSeats,
    ticketSubtotal,
    convenienceFee,
  } = useSelector((state) => state.booking);

  // Fallback defaults if page was accessed directly
  const movieTitle = selectedMovie?.title || 'Interstellar: Beyond Time';
  const theatreName = selectedTheatre?.name || 'IMovies Grand Cinema - Times Square';
  const showTime = selectedShowtime?.time || '05:15 PM';
  const showDate = selectedDate || new Date().toISOString().split('T')[0];

  // Hold timer countdown (10 minutes)
  const [secondsRemaining, setSecondsRemaining] = useState(600);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.warning('Seat selection session expired. Please refresh showtimes.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSeatClick = (seatObj) => {
    if (reservedSeats.has(seatObj.id)) {
      toast.info(`Seat ${seatObj.id} is already reserved by another customer.`);
      return;
    }

    const isSelected = selectedSeats.some((s) => s.id === seatObj.id);
    if (!isSelected && selectedSeats.length >= 8) {
      toast.warning('Maximum of 8 seats allowed per booking transaction.');
      return;
    }

    dispatch(toggleSeat(seatObj));
  };

  const handleProceedToCheckout = () => {
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat to proceed.');
      return;
    }
    navigate('/checkout');
  };

  return (
    <div className="container py-4">
      {/* Top Showtime Info & Hold Timer */}
      <div className="bg-white border rounded p-3 mb-4 shadow-sm">
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                Seat Selection
              </span>
              <span className="text-muted small">Audi 1 (Laser 4K)</span>
            </div>
            <h1 className="h5 fw-bold text-dark mb-0">{movieTitle}</h1>
            <div className="text-secondary small">
              {theatreName} • <strong>{showDate}</strong> at <strong>{showTime}</strong>
            </div>
          </div>

          {/* Session Timer */}
          <div className="d-flex align-items-center gap-2 px-3 py-2 bg-light border rounded text-secondary">
            <i className="bi bi-clock-history text-danger" />
            <span className="small">
              Hold expires in: <strong className="text-danger font-monospace">{formatTimer(secondsRemaining)}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Seat Layout Viewport */}
        <div className="col-lg-8">
          <div className="bg-white border rounded p-4 shadow-sm mb-4">
            {/* Screen Direction Indicator */}
            <div className="text-center mb-5">
              <div className="cinema-screen-bar mx-auto mb-2" style={{ maxWidth: '440px' }} />
              <span
                className="small text-uppercase text-muted fw-bold tracking-wider"
                style={{ letterSpacing: '2px', fontSize: '0.75rem' }}
              >
                Screen This Way
              </span>
            </div>

            {/* Matrix of Seats by Tier */}
            <div className="d-flex flex-column gap-4 align-items-center">
              {seatTiers.map((tier) => (
                <div key={tier.tierName} className="w-100 text-center">
                  <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                    <span className="small fw-bold text-secondary">{tier.tierName}</span>
                    <span className="text-muted small">•</span>
                    <span className="small fw-semibold text-primary">${tier.price.toFixed(2)}</span>
                  </div>

                  <div className="d-flex flex-column gap-2 align-items-center">
                    {tier.rows.map((rowLetter) => (
                      <div key={rowLetter} className="d-flex align-items-center gap-2">
                        {/* Row letter */}
                        <span
                          className="fw-bold text-muted small"
                          style={{ width: '20px', textAlign: 'center' }}
                        >
                          {rowLetter}
                        </span>

                        {/* Seats in row */}
                        <div className="d-flex gap-1">
                          {Array.from({ length: tier.seatsPerRow }).map((_, idx) => {
                            const seatNumber = idx + 1;
                            const seatId = `${rowLetter}${seatNumber}`;
                            const isReserved = reservedSeats.has(seatId);
                            const isWheelchair = wheelchairSeats.has(seatId);
                            const isSelected = selectedSeats.some((s) => s.id === seatId);

                            let seatClass = 'available';
                            if (isReserved) seatClass = 'reserved';
                            else if (isSelected) seatClass = 'selected';
                            else if (isWheelchair) seatClass = 'wheelchair';

                            return (
                              <button
                                key={seatId}
                                type="button"
                                className={`cinema-seat ${seatClass}`}
                                onClick={() =>
                                  handleSeatClick({
                                    id: seatId,
                                    row: rowLetter,
                                    number: seatNumber,
                                    price: tier.price,
                                    tier: tier.tierName,
                                  })
                                }
                                disabled={isReserved}
                                title={`Seat ${seatId} (${tier.tierName}) - $${tier.price.toFixed(2)}`}
                                aria-label={`Seat ${seatId}, ${isReserved ? 'Reserved' : isSelected ? 'Selected' : 'Available'}`}
                              >
                                {isWheelchair && !isSelected ? (
                                  <i className="bi bi-universal-access" />
                                ) : (
                                  seatNumber
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Row letter right */}
                        <span
                          className="fw-bold text-muted small"
                          style={{ width: '20px', textAlign: 'center' }}
                        >
                          {rowLetter}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Seat Legend (Accessible with both color, border, and text label) */}
            <div className="d-flex flex-wrap justify-content-center gap-4 mt-5 pt-4 border-top">
              <div className="d-flex align-items-center gap-2 small">
                <span className="cinema-seat available" style={{ width: '22px', height: '22px' }} />
                <span>Available</span>
              </div>
              <div className="d-flex align-items-center gap-2 small">
                <span className="cinema-seat selected" style={{ width: '22px', height: '22px' }}>
                  <i className="bi bi-check" />
                </span>
                <span className="fw-medium text-primary">Selected</span>
              </div>
              <div className="d-flex align-items-center gap-2 small">
                <span className="cinema-seat reserved" style={{ width: '22px', height: '22px' }} />
                <span className="text-muted">Reserved</span>
              </div>
              <div className="d-flex align-items-center gap-2 small">
                <span className="cinema-seat wheelchair" style={{ width: '22px', height: '22px' }}>
                  <i className="bi bi-universal-access" />
                </span>
                <span className="text-success">Wheelchair Accessible</span>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Summary Panel */}
        <div className="col-lg-4">
          <div className="bg-white border rounded p-4 shadow-sm sticky-top" style={{ top: '80px' }}>
            <h2 className="h6 fw-bold text-dark mb-3 pb-2 border-bottom">Booking Summary</h2>

            {/* Selected Seats Listing */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small text-secondary fw-semibold">
                  Selected Seats ({selectedSeats.length})
                </span>
                {selectedSeats.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-danger text-decoration-none p-0 small"
                    onClick={() => dispatch(clearSeats())}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {selectedSeats.length > 0 ? (
                <div className="d-flex flex-wrap gap-1 mb-3">
                  {selectedSeats.map((seat) => (
                    <span
                      key={seat.id}
                      className="badge bg-primary-subtle text-primary border border-primary-subtle p-2 d-flex align-items-center gap-1"
                    >
                      <strong>{seat.id}</strong>
                      <span className="text-muted small">(${seat.price.toFixed(2)})</span>
                      <i
                        className="bi bi-x ms-1 cursor-pointer"
                        style={{ cursor: 'pointer' }}
                        onClick={() => dispatch(toggleSeat(seat))}
                      />
                    </span>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-light border rounded text-center text-muted small mb-3">
                  <i className="bi bi-cursor text-primary me-1" />
                  Click on available seats on the map to begin
                </div>
              )}
            </div>

            {/* Price Calculations */}
            <div className="d-flex flex-column gap-2 mb-3 pb-3 border-bottom small">
              <div className="d-flex justify-content-between text-secondary">
                <span>Tickets Subtotal:</span>
                <span className="fw-semibold text-dark">${ticketSubtotal.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between text-secondary">
                <span>Convenience & Booking Fee:</span>
                <span>${selectedSeats.length > 0 ? convenienceFee.toFixed(2) : '0.00'}</span>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4">
              <span className="fw-bold text-dark">Estimated Total:</span>
              <span className="h5 fw-bold text-primary mb-0">
                $
                {selectedSeats.length > 0
                  ? (ticketSubtotal + convenienceFee).toFixed(2)
                  : '0.00'}
              </span>
            </div>

            {/* Call To Action */}
            <Button
              variant="primary"
              className="w-100 py-2"
              disabled={selectedSeats.length === 0}
              onClick={handleProceedToCheckout}
            >
              Proceed to Checkout ({selectedSeats.length} {selectedSeats.length === 1 ? 'Seat' : 'Seats'})
            </Button>

            <div className="text-center text-muted small mt-2" style={{ fontSize: '0.75rem' }}>
              <i className="bi bi-shield-check text-success me-1" />
              Seats are held for 10 minutes upon proceeding
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatSelectionPage;
