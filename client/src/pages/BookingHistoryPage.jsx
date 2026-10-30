import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingsApi, notificationsApi } from '../services/api';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import ErrorAlert from '../components/common/ErrorAlert';
import { toast } from 'react-toastify';

const BookingHistoryPage = () => {
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past' | 'cancelled' | 'notifications'
  const [bookingsList, setBookingsList] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, notifRes] = await Promise.all([
        bookingsApi.getAll().catch(() => ({ data: [] })),
        notificationsApi.getAll().catch(() => ({ data: [] })),
      ]);
      setBookingsList(bookingsRes.data || []);
      setNotifications(notifRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load booking history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter bookings by tab status
  const upcomingBookings = bookingsList.filter((b) => {
    const isCancelled = b.bookingStatus === 'CANCELLED' || b.cancellation?.isCancelled;
    if (isCancelled) return false;
    const showTime = b.show?.startTime ? new Date(b.show.startTime) : new Date(b.createdAt || Date.now());
    return showTime >= new Date();
  });

  const pastBookings = bookingsList.filter((b) => {
    const isCancelled = b.bookingStatus === 'CANCELLED' || b.cancellation?.isCancelled;
    if (isCancelled) return false;
    const showTime = b.show?.startTime ? new Date(b.show.startTime) : new Date(b.createdAt || Date.now());
    return showTime < new Date();
  });

  const cancelledBookings = bookingsList.filter(
    (b) => b.bookingStatus === 'CANCELLED' || b.cancellation?.isCancelled
  );

  const handleConfirmCancel = async () => {
    if (!cancelModalBooking) return;
    setIsCancelling(true);
    try {
      const id = cancelModalBooking._id || cancelModalBooking.id;
      await bookingsApi.cancel(id, { reason: 'Customer requested cancellation' });

      toast.info(`Booking ${cancelModalBooking.bookingReference} has been cancelled. Refund initiated.`);
      setCancelModalBooking(null);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel booking.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleMarkNotifRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id || n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // optimistic update
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read.');
    } catch {
      // optimistic update
    }
  };

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold text-dark mb-1">My Bookings & Tickets</h1>
          <p className="text-secondary small mb-0">
            View active admissions gate passes, review past visits, and manage eligible bookings
          </p>
        </div>

        <div className="d-flex gap-2">
          <Link to="/shows" className="btn btn-sm btn-primary">
            <i className="bi bi-plus-lg me-1" />
            Book New Tickets
          </Link>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={loadData}
            title="Refresh bookings"
          >
            <i className="bi bi-arrow-clockwise" />
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadData} className="mb-4" />}

      {/* Tabs Bar */}
      <div className="bg-white border rounded p-2 mb-4 shadow-sm">
        <ul className="nav nav-pills gap-1">
          <li className="nav-item">
            <button
              className={`nav-link small fw-semibold ${activeTab === 'upcoming' ? 'active' : 'text-secondary'}`}
              onClick={() => setActiveTab('upcoming')}
            >
              <i className="bi bi-ticket-perforated me-1" />
              Upcoming ({upcomingBookings.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link small fw-semibold ${activeTab === 'past' ? 'active' : 'text-secondary'}`}
              onClick={() => setActiveTab('past')}
            >
              <i className="bi bi-clock-history me-1" />
              Past Visits ({pastBookings.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link small fw-semibold ${activeTab === 'cancelled' ? 'active' : 'text-secondary'}`}
              onClick={() => setActiveTab('cancelled')}
            >
              <i className="bi bi-x-circle me-1" />
              Cancelled ({cancelledBookings.length})
            </button>
          </li>
          <li className="nav-item ms-auto">
            <button
              className={`nav-link small fw-semibold ${activeTab === 'notifications' ? 'active' : 'text-secondary'}`}
              onClick={() => setActiveTab('notifications')}
            >
              <i className="bi bi-bell me-1" />
              Notifications
              {unreadNotifsCount > 0 && (
                <span className="badge bg-danger ms-1">{unreadNotifsCount}</span>
              )}
            </button>
          </li>
        </ul>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading bookings...</span>
          </div>
        </div>
      ) : activeTab === 'notifications' ? (
        /* Notifications Tab */
        <div className="bg-white border rounded p-4 shadow-sm">
          <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
            <h2 className="h6 fw-bold text-dark mb-0">Notification Center</h2>
            {unreadNotifsCount > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none small"
                onClick={handleMarkAllNotifsRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length > 0 ? (
            <div className="list-group list-group-flush">
              {notifications.map((n) => (
                <div
                  key={n._id || n.id}
                  className={`list-group-item d-flex justify-content-between align-items-start px-0 py-3 ${
                    !n.isRead ? 'bg-light rounded p-2 mb-2' : ''
                  }`}
                >
                  <div className="ms-2 me-auto">
                    <div className="fw-bold small text-dark d-flex align-items-center gap-2">
                      <i className="bi bi-info-circle text-primary" />
                      {n.title || 'Booking Notification'}
                    </div>
                    <div className="text-secondary small mt-1">{n.message}</div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                      {new Date(n.createdAt || Date.now()).toLocaleString()}
                    </div>
                  </div>
                  {!n.isRead && (
                    <button
                      type="button"
                      className="btn btn-sm btn-light border text-muted small ms-2"
                      onClick={() => handleMarkNotifRead(n._id || n.id)}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted small">
              You have no new alerts or notifications at this time.
            </div>
          )}
        </div>
      ) : (
        /* Bookings List */
        <div>
          {(() => {
            const list =
              activeTab === 'upcoming'
                ? upcomingBookings
                : activeTab === 'past'
                ? pastBookings
                : cancelledBookings;

            if (list.length === 0) {
              return (
                <EmptyState
                  title={`No ${activeTab} bookings`}
                  description={`You do not have any ${activeTab} movie ticket reservations.`}
                  actionLabel="Discover Movies & Showtimes"
                  onAction={() => (window.location.href = '/shows')}
                />
              );
            }

            return (
              <div className="row g-3">
                {list.map((booking) => {
                  const ref = booking.bookingReference || booking.id || 'BK-XXXXXX';
                  const movieTitle = booking.movieTitle || booking.movie?.title || 'Feature Film';
                  const theatreName = booking.theatreName || booking.theatre?.name || 'Grand Cinema';
                  const seatsList = Array.isArray(booking.seats)
                    ? booking.seats.map((s) => (typeof s === 'object' ? s.seatNumber : s)).join(', ')
                    : booking.seats || 'N/A';
                  const total = booking.pricing?.totalAmount ?? booking.total ?? 0;
                  const isCancelled = booking.bookingStatus === 'CANCELLED' || booking.cancellation?.isCancelled;
                  const isCheckedIn = booking.bookingStatus === 'CHECKED_IN' || booking.checkIn?.isCheckedIn;

                  return (
                    <div className="col-12" key={booking._id || booking.id || ref}>
                      <div className="bg-white border rounded p-4 shadow-sm">
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
                          <div className="flex-grow-1">
                            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                              <span className="badge bg-light text-primary border font-monospace fw-bold">
                                {ref}
                              </span>

                              {/* Separate Status Badges */}
                              {isCancelled ? (
                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                                  Cancelled & Refunded
                                </span>
                              ) : isCheckedIn ? (
                                <span className="badge bg-success-subtle text-success border border-success-subtle">
                                  <i className="bi bi-check2-circle me-1" />
                                  Checked In
                                </span>
                              ) : (
                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                  Confirmed Admission
                                </span>
                              )}

                              <span className="badge bg-light text-dark border">
                                Payment: {booking.paymentStatus || 'PAID'}
                              </span>

                              <span className="text-muted small">
                                {new Date(booking.createdAt || Date.now()).toLocaleDateString()}
                              </span>
                            </div>

                            <h2 className="h5 fw-bold text-dark mb-1">{movieTitle}</h2>
                            <div className="text-secondary small mb-2">
                              <i className="bi bi-building me-1 text-primary" />
                              {theatreName}
                            </div>

                            <div className="d-flex flex-wrap align-items-center gap-3 text-muted small">
                              <span>
                                <i className="bi bi-ticket-perforated me-1 text-primary" />
                                Seats: <strong className="text-dark">{seatsList}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Amount Paid: <strong className="text-primary">${Number(total).toFixed(2)}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="d-flex flex-column flex-sm-row gap-2 align-self-stretch align-self-md-auto">
                            {!isCancelled && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center gap-1"
                                onClick={() => setSelectedTicket(booking)}
                              >
                                <i className="bi bi-qr-code" />
                                View E-Ticket
                              </button>
                            )}

                            {activeTab === 'upcoming' && !isCancelled && !isCheckedIn && (
                              <button
                                type="button"
                                className="btn btn-sm btn-light border text-danger d-flex align-items-center justify-content-center gap-1"
                                onClick={() => setCancelModalBooking(booking)}
                              >
                                <i className="bi bi-x-circle" />
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* E-Ticket QR Gate Pass Modal */}
      {selectedTicket && (
        <Modal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          title={`Digital E-Ticket: ${selectedTicket.bookingReference || selectedTicket.id}`}
          primaryActionLabel="Print Ticket"
          onPrimaryAction={() => window.print()}
          size="md"
        >
          <div className="text-center p-3 bg-light border rounded mb-3">
            <div className="bg-white p-3 rounded border d-inline-block shadow-sm mb-3">
              {/* Clean SVG QR Code */}
              <svg
                width="120"
                height="120"
                viewBox="0 0 120 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="120" height="120" fill="white" />
                <rect x="10" y="10" width="30" height="30" fill="#0f172a" />
                <rect x="15" y="15" width="20" height="20" fill="white" />
                <rect x="20" y="20" width="10" height="10" fill="#0f172a" />
                <rect x="80" y="10" width="30" height="30" fill="#0f172a" />
                <rect x="85" y="15" width="20" height="20" fill="white" />
                <rect x="90" y="20" width="10" height="10" fill="#0f172a" />
                <rect x="10" y="80" width="30" height="30" fill="#0f172a" />
                <rect x="15" y="85" width="20" height="20" fill="white" />
                <rect x="20" y="90" width="10" height="10" fill="#0f172a" />
                <rect x="50" y="20" width="15" height="10" fill="#0f172a" />
                <rect x="50" y="50" width="20" height="20" fill="#0f172a" />
                <rect x="25" y="55" width="15" height="10" fill="#0f172a" />
                <rect x="80" y="55" width="10" height="25" fill="#0f172a" />
                <rect x="50" y="85" width="25" height="15" fill="#0f172a" />
                <rect x="95" y="95" width="15" height="15" fill="#0f172a" />
              </svg>
              <span className="small text-muted font-monospace d-block mt-2">
                {selectedTicket.checkIn?.qrCodeReference || `IMOVIES-TICKET-${selectedTicket.bookingReference}`}
              </span>
            </div>
            <h5 className="fw-bold text-dark mb-1">
              {selectedTicket.movieTitle || selectedTicket.movie?.title}
            </h5>
            <div className="text-secondary small mb-2">
              {selectedTicket.theatreName || selectedTicket.theatre?.name}
            </div>

            <div className="d-flex justify-content-center gap-3 py-2 border-top border-bottom small">
              <div>
                <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                  Seats
                </span>
                <strong className="text-dark">
                  {Array.isArray(selectedTicket.seats)
                    ? selectedTicket.seats
                        .map((s) => (typeof s === 'object' ? s.seatNumber : s))
                        .join(', ')
                    : selectedTicket.seats}
                </strong>
              </div>
              <div className="vr" />
              <div>
                <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                  Admissions
                </span>
                <strong className="text-dark">
                  {selectedTicket.ticketCount || selectedTicket.seats?.length || 1}
                </strong>
              </div>
              <div className="vr" />
              <div>
                <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                  Total Paid
                </span>
                <strong className="text-primary">
                  ${Number(selectedTicket.pricing?.totalAmount ?? selectedTicket.total ?? 0).toFixed(2)}
                </strong>
              </div>
            </div>

            <div className={`small ${selectedTicket.checkIn?.isCheckedIn ? 'text-success' : 'text-primary'} mt-2`}>
              <i className="bi bi-shield-check me-1" />
              {selectedTicket.checkIn?.isCheckedIn
                ? `Admitted at ${new Date(selectedTicket.checkIn.checkedInAt).toLocaleTimeString()}`
                : 'Admission Pass Confirmed • Present at cinema gate scanner'}
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={!!cancelModalBooking}
        onClose={() => setCancelModalBooking(null)}
        title="Confirm Ticket Cancellation"
        primaryActionLabel="Confirm Cancellation"
        primaryActionVariant="danger"
        onPrimaryAction={handleConfirmCancel}
        isPrimaryLoading={isCancelling}
      >
        <p className="text-secondary small mb-2">
          Are you sure you want to cancel booking{' '}
          <strong>"{cancelModalBooking?.bookingReference}"</strong>?
        </p>
        <div className="p-3 bg-light border rounded small mb-2 text-muted">
          Your seats will be immediately released back to general availability and a full refund will be processed to your original payment method.
        </div>
      </Modal>
    </div>
  );
};

export default BookingHistoryPage;
