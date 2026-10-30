import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import {
  toggleSeat,
  clearSeats,
  setSelectedSeats,
  setSeatHold,
  clearSeatHold,
} from '../features/booking/bookingSlice';
import { seatsApi, showsApi } from '../services/api';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorAlert from '../components/common/ErrorAlert';
import { toast } from 'react-toastify';

const SeatSelectionPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  const urlShowId = searchParams.get('showId');

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

  const showId = urlShowId || selectedShowtime?.id || 'sh101';

  const [layoutData, setLayoutData] = useState(null);
  const [showDetails, setShowDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHolding, setIsHolding] = useState(false);

  // Active Hold Countdown Timer
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  // Smart Seat Advisor State
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [advisorGroupSize, setAdvisorGroupSize] = useState(2);
  const [advisorPreference, setAdvisorPreference] = useState('center');
  const [advisorTier, setAdvisorTier] = useState('');
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorRecommendation, setAdvisorRecommendation] = useState(null);

  const socketRef = useRef(null);

  // Load authoritative seat inventory from backend
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

  // Real-time Socket.IO Connection & Showtime Room Lifecycle
  useEffect(() => {
    const token = localStorage.getItem('imovies_token');
    const socket = io('/', {
      transports: ['websocket', 'polling'],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_show', showId);
    });

    // Reconcile client inventory on reconnect
    socket.on('reconnect', () => {
      socket.emit('join_show', showId);
      loadSeatInventory();
    });

    // Handle incoming seat events from other users in the room
    socket.on('seat_held', (payload) => {
      if (payload.showId === showId && Array.isArray(payload.seatNumbers)) {
        setLayoutData((prev) => {
          if (!prev?.seats) return prev;
          const isHeldByMe = user && String(payload.userId) === String(user._id || user.id);
          const updatedSeats = prev.seats.map((seat) => {
            if (payload.seatNumbers.includes(seat.seatNumber)) {
              return {
                ...seat,
                status: 'HELD',
                isHeldByMe,
              };
            }
            return seat;
          });
          return {
            ...prev,
            seats: updatedSeats,
            availableSeats: updatedSeats.filter((s) => s.status === 'AVAILABLE').length,
          };
        });
      }
    });

    socket.on('seat_released', (payload) => {
      if (payload.showId === showId && Array.isArray(payload.seatNumbers)) {
        setLayoutData((prev) => {
          if (!prev?.seats) return prev;
          const updatedSeats = prev.seats.map((seat) => {
            if (payload.seatNumbers.includes(seat.seatNumber)) {
              return {
                ...seat,
                status: 'AVAILABLE',
                isHeldByMe: false,
              };
            }
            return seat;
          });
          return {
            ...prev,
            seats: updatedSeats,
            availableSeats: updatedSeats.filter((s) => s.status === 'AVAILABLE').length,
          };
        });
      }
    });

    socket.on('seat_booked', (payload) => {
      if (payload.showId === showId && Array.isArray(payload.seatNumbers)) {
        setLayoutData((prev) => {
          if (!prev?.seats) return prev;
          const updatedSeats = prev.seats.map((seat) => {
            if (payload.seatNumbers.includes(seat.seatNumber)) {
              return {
                ...seat,
                status: 'RESERVED',
                isHeldByMe: false,
              };
            }
            return seat;
          });
          return {
            ...prev,
            seats: updatedSeats,
            availableSeats: updatedSeats.filter((s) => s.status === 'AVAILABLE').length,
          };
        });
      }
    });

    return () => {
      if (socket) {
        socket.emit('leave_show', showId);
        socket.disconnect();
      }
    };
  }, [showId, user]);

  // Hold Countdown Timer Effect
  useEffect(() => {
    if (!holdExpiresAt) {
      setSecondsRemaining(0);
      return;
    }

    const targetTime = new Date(holdExpiresAt).getTime();
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        dispatch(clearSeatHold());
        toast.warning('Your temporary seat hold has expired. Please reselect your seats.');
        loadSeatInventory();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt, dispatch]);

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
      toast.info(`Seat ${seatObj.seatNumber} is already booked by another customer.`);
      return;
    }

    if (seatObj.status === 'HELD' && !seatObj.isHeldByMe) {
      toast.warning(`Seat ${seatObj.seatNumber} is currently held by another customer.`);
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

  // Explicitly release currently held seats
  const handleReleaseHold = async () => {
    try {
      const seatNumbers = selectedSeats.map((s) => s.id);
      await seatsApi.release({ showId, seatNumbers, holdId });
      dispatch(clearSeatHold());
      dispatch(clearSeats());
      toast.info('Seats released.');
      await loadSeatInventory();
    } catch {
      dispatch(clearSeatHold());
      dispatch(clearSeats());
    }
  };

  // Smart Seat Advisor: Fetch recommendation
  const handleGetRecommendation = async () => {
    setAdvisorLoading(true);
    try {
      const res = await seatsApi.recommend({
        showId,
        groupSize: advisorGroupSize,
        preference: advisorPreference,
        tier: advisorTier || undefined,
      });
      setAdvisorRecommendation(res.data);
    } catch (err) {
      toast.error(err.message || 'Could not find contiguous seats matching this preference.');
      setAdvisorRecommendation(null);
    } finally {
      setAdvisorLoading(false);
    }
  };

  // Apply Smart Seat Advisor recommendation and hold automatically
  const handleApplyRecommendation = async () => {
    if (!advisorRecommendation?.seatDetails) return;

    const seatsToSelect = advisorRecommendation.seatDetails.map((s) => ({
      id: s.seatNumber,
      row: s.row,
      number: s.number,
      tier: s.tier,
      price: s.price,
    }));

    dispatch(setSelectedSeats(seatsToSelect));
    setIsAdvisorOpen(false);

    // Automatically trigger temporary hold
    setIsHolding(true);
    try {
      const holdRes = await seatsApi.hold({
        showId,
        seatNumbers: seatsToSelect.map((s) => s.id),
      });

      dispatch(
        setSeatHold({
          holdId: holdRes.data.holdId,
          expiresAt: holdRes.data.expiresAt,
        })
      );
      toast.success(
        `Smart Advisor: Held ${seatsToSelect.length} seats [${seatsToSelect.map((s) => s.id).join(', ')}] for 10 minutes!`
      );
      await loadSeatInventory();
    } catch (err) {
      toast.error(err.message || 'Failed to hold recommended seats.');
    } finally {
      setIsHolding(false);
    }
  };

  // Proceed to Checkout with Atomic Hold Guarantee
  const handleProceedToCheckout = async () => {
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat to proceed to checkout.');
      return;
    }

    setIsHolding(true);
    try {
      const seatNumbers = selectedSeats.map((s) => s.id);
      const holdRes = await seatsApi.hold({
        showId,
        seatNumbers,
      });

      dispatch(
        setSeatHold({
          holdId: holdRes.data.holdId,
          expiresAt: holdRes.data.expiresAt,
        })
      );

      navigate('/checkout');
    } catch (err) {
      if (err.status === 409) {
        toast.error(
          err.message ||
            'One or more of the selected seats was just taken. Seating chart has been updated.'
        );
        await loadSeatInventory();
      } else {
        toast.error(err.message || 'Failed to secure seat reservation.');
      }
    } finally {
      setIsHolding(false);
    }
  };

  const totalPayable = ticketSubtotal + convenienceFee;

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

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
            {/* Smart Seat Advisor Trigger */}
            <button
              type="button"
              className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1.5 shadow-sm"
              onClick={() => {
                setIsAdvisorOpen(true);
                setAdvisorRecommendation(null);
              }}
            >
              <i className="bi bi-stars" />
              <span>Smart Seat Advisor</span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
              onClick={loadSeatInventory}
              title="Refresh live availability"
            >
              <i className="bi bi-arrow-clockwise" />
              <span>Refresh</span>
            </button>
            <Link to="/shows" className="btn btn-sm btn-light border text-secondary">
              Change Showtime
            </Link>
          </div>
        </div>
      </div>

      {/* Active Hold Alert Bar (when seats are currently locked) */}
      {secondsRemaining > 0 && (
        <div className="alert alert-warning border-warning d-flex align-items-center justify-content-between p-3 mb-4 shadow-sm">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-clock-history fs-5 text-warning-emphasis" />
            <div>
              <strong className="text-dark">Temporary Reservation Active: </strong>
              <span>
                Your {selectedSeats.length} seat(s) are held exclusively for you. Complete checkout in{' '}
                <span className="fw-mono fw-bold fs-6 text-danger">{formatTimer(secondsRemaining)}</span>.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-dark"
            onClick={handleReleaseHold}
          >
            Release Hold
          </button>
        </div>
      )}

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
                          const isWheelchair = seat.type === 'WHEELCHAIR' || seat.isAccessible;

                          let seatClasses =
                            'btn p-0 d-flex align-items-center justify-content-center rounded transition-all ';
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
                onClick={() => {
                  if (holdId) handleReleaseHold();
                  else dispatch(clearSeats());
                }}
              >
                Clear
              </button>
            )}

            <Button
              variant="primary"
              disabled={selectedSeats.length === 0 || isHolding}
              onClick={handleProceedToCheckout}
            >
              {isHolding ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                  Securing Seats...
                </>
              ) : (
                <>
                  Continue to Checkout
                  <i className="bi bi-arrow-right ms-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Smart Seat Advisor Modal */}
      {isAdvisorOpen && (
        <Modal
          title="Smart Seat Advisor"
          isOpen={isAdvisorOpen}
          onClose={() => setIsAdvisorOpen(false)}
        >
          <div className="p-2">
            <p className="text-secondary small mb-3">
              Let the algorithm recommend optimal contiguous seats based on your party size, acoustic sweet spots, and view preferences.
            </p>

            <div className="mb-3">
              <label className="form-label small fw-semibold text-dark">Number of Seats (Party Size)</label>
              <div className="btn-group w-100" role="group">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`btn btn-sm ${advisorGroupSize === num ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setAdvisorGroupSize(num)}
                  >
                    {num} {num === 1 ? 'Seat' : 'Seats'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-semibold text-dark">Viewing & Position Preference</label>
              <div className="row g-2">
                {[
                  { id: 'center', label: 'Prime Center', desc: 'Center sweet spot & optimal audio' },
                  { id: 'back', label: 'Back Rows', desc: 'Higher elevation & wide panorama' },
                  { id: 'front', label: 'Front Rows', desc: 'Close-up immersive visual' },
                  { id: 'aisle', label: 'Aisle Seats', desc: 'Easy entry & extra legroom' },
                  { id: 'accessible', label: 'Accessible', desc: 'Step-free wheelchair designated' },
                ].map((pref) => (
                  <div key={pref.id} className="col-6">
                    <button
                      type="button"
                      className={`btn btn-sm w-100 text-start p-2 border ${
                        advisorPreference === pref.id
                          ? 'btn-primary text-white'
                          : 'btn-light text-dark'
                      }`}
                      onClick={() => setAdvisorPreference(pref.id)}
                    >
                      <div className="fw-bold">{pref.label}</div>
                      <div className="small opacity-75" style={{ fontSize: '0.7rem' }}>
                        {pref.desc}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label small fw-semibold text-dark">Seat Tier (Optional)</label>
              <select
                className="form-select form-select-sm"
                value={advisorTier}
                onChange={(e) => setAdvisorTier(e.target.value)}
              >
                <option value="">Any Tier (Best Available)</option>
                <option value="VIP">VIP ($16.50)</option>
                <option value="Executive">Executive ($14.50)</option>
                <option value="Standard">Standard ($12.50)</option>
              </select>
            </div>

            <div className="d-grid mb-3">
              <Button
                variant="outline-primary"
                disabled={advisorLoading}
                onClick={handleGetRecommendation}
              >
                {advisorLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Finding Optimal Seats...
                  </>
                ) : (
                  <>
                    <i className="bi bi-search me-1" />
                    Find Best Available Seats
                  </>
                )}
              </Button>
            </div>

            {advisorRecommendation && (
              <div className="bg-light border border-primary-subtle rounded p-3 mb-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="badge bg-primary text-white">Recommended Match</span>
                  <span className="fw-bold text-dark fs-6">
                    ${advisorRecommendation.subtotal?.toFixed(2)}
                  </span>
                </div>
                <div className="fw-bold text-dark mb-1">
                  Seats: {advisorRecommendation.recommendedSeats?.join(', ')}
                </div>
                <p className="text-secondary small mb-3">{advisorRecommendation.explanation}</p>
                <Button variant="primary" className="w-100" onClick={handleApplyRecommendation}>
                  <i className="bi bi-check-circle me-1" />
                  Auto-Select & Hold These Seats
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SeatSelectionPage;
