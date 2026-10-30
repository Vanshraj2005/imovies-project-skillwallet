import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSeat, clearSeats } from '../features/booking/bookingSlice';
import { seatsApi, showsApi } from '../services/api';
import Button from '../components/common/Button';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorAlert from '../components/common/ErrorAlert';
import { toast } from 'react-toastify';

const SeatSelectionPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  const urlShowId = searchParams.get('showId');
  const urlMovieId = searchParams.get('movieId');

  const {
    selectedMovie,
    selectedTheatre,
    selectedDate,
    selectedShowtime,
    selectedSeats,
    ticketSubtotal,
    convenienceFee,
  } = useSelector((state) => state.booking);

  const showId = urlShowId || selectedShowtime?.id || 'sh101';

  const [layoutData, setLayoutData] = useState(null);
  const [showDetails, setShowDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load layout inventory from backend API
  const loadSeatInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const [layoutRes, showRes] = await Promise.all([
        seatsApi.getLayout(showId),
        showsApi.getById(showId).catch(() => null),
      ]);

      setLayoutData(layoutRes.data);
      if (showRes?.data) {
        setShowDetails(showRes.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve real-time seat inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeatInventory();
  }, [showId]);

  const movieTitle =
    showDetails?.movie?.title || selectedMovie?.title || 'Interstellar: Beyond Time';
  const theatreName =
    showDetails?.theatre?.name ||
    selectedTheatre?.name ||
    'IMovies Grand Cinema - Times Square';
  const screenName =
    showDetails?.screenName || selectedTheatre?.screen || 'Audi 1 (IMAX Laser)';
  const showDate =
    selectedDate ||
    (showDetails?.startTime ? new Date(showDetails.startTime).toISOString().split('T')[0] : '');

  // Group seats by tier and row
  const tiersGrouped = React.useMemo(() => {
    if (!layoutData?.seats) return [];

    const tierMap = new Map();
    layoutData.seats.forEach((seat) => {
      const tName = seat.tier || 'Standard';
      if (!tierMap.has(tName)) {
        tierMap.set(tName, {
          tierName: tName,
          price: seat.price || 12.5,
          rows: new Map(),
        });
      }

      const tierObj = tierMap.get(tName);
      if (!tierObj.rows.has(seat.row)) {
        tierObj.rows.set(seat.row, []);
      }
      tierObj.rows.get(seat.row).push(seat);
    });

    return Array.from(tierMap.values()).map((t) => ({
      ...t,
      rowsList: Array.from(t.rows.entries()).map(([rowLabel, rowSeats]) => ({
        rowLabel,
        seats: rowSeats.sort((a, b) => a.number - b.number),
      })),
    }));
  }, [layoutData]);

  const handleSeatClick = (seatObj) => {
    if (seatObj.status === 'RESERVED') {
      toast.info(`Seat ${seatObj.seatNumber} is already reserved by another customer.`);
      return;
    }

    if (seatObj.status === 'HELD' && !seatObj.isHeldByMe) {
      toast.warning(`Seat ${seatObj.seatNumber} is currently on temporary hold.`);
      return;
    }

    const isSelected = selectedSeats.some((s) => s.id === seatObj.seatNumber);
    if (!isSelected && selectedSeats.length >= 8) {
      toast.warning('Maximum of 8 seats allowed per booking transaction.');
      return;
    }

    dispatch(
      toggleSeat({
        id: seatObj.seatNumber,
        row: seatObj.row,
        number: seatObj.number,
        tier: seatObj.tier,
        price: seatObj.price,
      })
    );
  };

  const handleProceedToCheckout = () => {
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat to proceed to checkout.');
      return;
    }
    navigate('/checkout');
  };

  const totalPayable = ticketSubtotal + convenienceFee;

  return (
    <div className="container py-4">
      {/* Top Screening Context Ribbon */}
      <div className="bg-white border rounded p-3 mb-4 shadow-sm">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2">
                Seat Inventory Selection
              </span>
              <span className="text-muted small">Show ID: {showId}</span>
            </div>
            <h1 className="h5 fw-bold text-dark mb-0">{movieTitle}</h1>
            <div className="text-muted small">
              {theatreName} • {screenName} {showDate && `• ${showDate}`}
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
              onClick={loadSeatInventory}
              title="Refresh live availability"
            >
              <i className="bi bi-arrow-clockwise" />
              Refresh
            </button>
            <Link to="/shows" className="btn btn-sm btn-light border text-secondary">
              Change Showtime
            </Link>
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadSeatInventory} className="mb-4" />}

      {/* Accessible Legend Bar (Never rely on color alone) */}
      <div className="bg-white border rounded p-3 mb-4 shadow-sm">
        <div className="d-flex flex-wrap justify-content-center align-items-center gap-4 text-secondary small">
          <div className="d-flex align-items-center gap-2">
            <div
              className="border border-2 border-primary rounded text-center d-flex align-items-center justify-content-center"
              style={{ width: '28px', height: '28px' }}
            >
              <span style={{ fontSize: '0.65rem' }}>A1</span>
            </div>
            <span>Available</span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <div
              className="bg-primary text-white rounded text-center d-flex align-items-center justify-content-center"
              style={{ width: '28px', height: '28px' }}
            >
              <i className="bi bi-check" />
            </div>
            <span>Your Selected</span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <div
              className="bg-light text-muted border border-dashed rounded text-center d-flex align-items-center justify-content-center"
              style={{ width: '28px', height: '28px' }}
            >
              <i className="bi bi-x small" />
            </div>
            <span>Reserved / Booked</span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <div
              className="bg-warning-subtle text-warning-emphasis border border-warning rounded text-center d-flex align-items-center justify-content-center"
              style={{ width: '28px', height: '28px' }}
            >
              <i className="bi bi-clock-history small" />
            </div>
            <span>Held (Temp)</span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <div
              className="border border-2 border-primary rounded text-primary text-center d-flex align-items-center justify-content-center"
              style={{ width: '28px', height: '28px' }}
            >
              <i className="bi bi-person-wheelchair small" />
            </div>
            <span>Wheelchair Accessible</span>
          </div>
        </div>
      </div>

      {/* Physical Seat Layout Canvas */}
      <div className="bg-white border rounded p-4 mb-4 shadow-sm text-center">
        {/* Curved Screen Banner */}
        <div className="mx-auto mb-5 text-center" style={{ maxWidth: '640px' }}>
          <div
            className="p-1.5 rounded-top border-top border-primary border-4 bg-light shadow-sm mb-1"
            style={{
              borderTopLeftRadius: '50% 18px',
              borderTopRightRadius: '50% 18px',
            }}
          >
            <span
              className="text-uppercase text-secondary fw-bold"
              style={{ fontSize: '0.75rem', letterSpacing: '0.2em' }}
            >
              <i className="bi bi-display me-2 text-primary" />
              Auditorium Screen Front
            </span>
          </div>
          <span className="text-muted" style={{ fontSize: '0.65rem' }}>
            All eyes forward • Sound engineered with Dolby Atmos
          </span>
        </div>

        {loading ? (
          <div className="py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading seating grid...</span>
            </div>
          </div>
        ) : (
          <div className="d-flex flex-column gap-4 overflow-auto pb-3">
            {tiersGrouped.map((tier) => (
              <div key={tier.tierName} className="tier-block">
                <div className="d-inline-flex align-items-center gap-2 px-3 py-1 bg-light border rounded mb-3">
                  <span className="fw-bold small text-dark">{tier.tierName} Tier</span>
                  <span className="text-muted">•</span>
                  <span className="fw-semibold text-primary small">
                    ${tier.price.toFixed(2)}
                  </span>
                </div>

                <div className="d-flex flex-column gap-2 align-items-center">
                  {tier.rowsList.map(({ rowLabel, seats }) => (
                    <div key={rowLabel} className="d-flex align-items-center gap-2">
                      <span
                        className="fw-bold text-muted text-center"
                        style={{ width: '24px', fontSize: '0.8rem' }}
                      >
                        {rowLabel}
                      </span>

                      <div className="d-flex gap-1.5 justify-content-center">
                        {seats.map((seat) => {
                          const isSelected = selectedSeats.some(
                            (s) => s.id === seat.seatNumber
                          );
                          const isReserved = seat.status === 'RESERVED';
                          const isHeld = seat.status === 'HELD' && !seat.isHeldByMe;
                          const isWheelchair = seat.type === 'WHEELCHAIR';

                          let seatClasses = 'btn p-0 d-flex align-items-center justify-content-center rounded transition-all ';
                          if (isSelected) {
                            seatClasses += 'btn-primary text-white shadow-sm';
                          } else if (isReserved) {
                            seatClasses += 'btn-light border text-muted opacity-50 disabled';
                          } else if (isHeld) {
                            seatClasses += 'bg-warning-subtle border border-warning text-warning-emphasis disabled';
                          } else {
                            seatClasses += 'btn-outline-primary bg-white text-dark border-2';
                          }

                          return (
                            <button
                              key={seat.seatNumber}
                              type="button"
                              className={seatClasses}
                              style={{
                                width: '34px',
                                height: '34px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                              }}
                              disabled={isReserved || isHeld}
                              onClick={() => handleSeatClick(seat)}
                              aria-label={`Seat ${seat.seatNumber}, ${tier.tierName}, $${seat.price}`}
                              title={`Seat ${seat.seatNumber} (${seat.status})`}
                            >
                              {isSelected ? (
                                <i className="bi bi-check-lg" />
                              ) : isReserved ? (
                                <i className="bi bi-x" />
                              ) : isHeld ? (
                                <i className="bi bi-clock" />
                              ) : isWheelchair ? (
                                <i className="bi bi-person-wheelchair" />
                              ) : (
                                seat.number
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <span
                        className="fw-bold text-muted text-center"
                        style={{ width: '24px', fontSize: '0.8rem' }}
                      >
                        {rowLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reservation Summary Footer Strip */}
      <div className="bg-white border rounded p-3 p-md-4 shadow-sm sticky-bottom" style={{ bottom: '16px' }}>
        <div className="row g-3 align-items-center">
          <div className="col-md-7">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <span className="fw-bold text-dark small">Selected Seats:</span>
              {selectedSeats.length > 0 ? (
                selectedSeats.map((s) => (
                  <span
                    key={s.id}
                    className="badge bg-primary text-white d-flex align-items-center gap-1"
                  >
                    {s.id}
                    <i
                      className="bi bi-x-circle-fill cursor-pointer"
                      style={{ cursor: 'pointer' }}
                      onClick={() => dispatch(toggleSeat(s))}
                    />
                  </span>
                ))
              ) : (
                <span className="text-muted small">No seats selected yet</span>
              )}
            </div>
            <div className="text-muted small">
              {selectedSeats.length} of 8 seats selected • Convenience fee: ${convenienceFee.toFixed(2)}
            </div>
          </div>

          <div className="col-md-5 d-flex align-items-center justify-content-md-end gap-3">
            <div className="text-end">
              <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                Estimated Total
              </div>
              <div className="fw-bold fs-5 text-primary">
                ${totalPayable.toFixed(2)}
              </div>
            </div>

            {selectedSeats.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => dispatch(clearSeats())}
              >
                Clear
              </button>
            )}

            <Button
              variant="primary"
              disabled={selectedSeats.length === 0}
              onClick={handleProceedToCheckout}
            >
              Continue to Checkout
              <i className="bi bi-arrow-right ms-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatSelectionPage;
