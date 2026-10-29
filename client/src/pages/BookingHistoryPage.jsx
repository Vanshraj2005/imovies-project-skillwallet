import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { toast } from 'react-toastify';

const mockBookings = [
  {
    id: 'BK-902144',
    movieTitle: 'Interstellar: Beyond Time',
    theatre: 'IMovies Grand Cinema - Times Square',
    screen: 'Audi 1 (IMAX Laser)',
    date: '2026-11-05',
    time: '07:30 PM',
    seats: ['A4', 'A5'],
    total: 34.50,
    status: 'Confirmed',
    isUpcoming: true,
  },
  {
    id: 'BK-841920',
    movieTitle: 'The Silent Horizon',
    theatre: 'IMovies Downtown Royale',
    screen: 'Audi 3 (Dolby Atmos)',
    date: '2026-11-02',
    time: '04:15 PM',
    seats: ['C6', 'C7'],
    total: 29.50,
    status: 'Confirmed',
    isUpcoming: true,
  },
  {
    id: 'BK-519201',
    movieTitle: 'Neon Odyssey 2099',
    theatre: 'IMovies Grand Cinema - Times Square',
    screen: 'Audi 2 (4DX)',
    date: '2026-10-18',
    time: '09:00 PM',
    seats: ['D3'],
    total: 15.50,
    status: 'Completed',
    isUpcoming: false,
  },
];

const BookingHistoryPage = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [bookingsList, setBookingsList] = useState(mockBookings);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [cancelModalBooking, setCancelModalBooking] = useState(null);

  const filtered = bookingsList.filter((b) =>
    activeTab === 'upcoming' ? b.isUpcoming : !b.isUpcoming
  );

  const handleConfirmCancel = () => {
    if (!cancelModalBooking) return;

    setBookingsList((prev) =>
      prev.map((b) =>
        b.id === cancelModalBooking.id
          ? { ...b, status: 'Cancelled', isUpcoming: false }
          : b
      )
    );

    toast.info(`Booking ${cancelModalBooking.id} has been cancelled. Refund initiated.`);
    setCancelModalBooking(null);
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold text-dark mb-1">My Booking History</h1>
          <p className="text-secondary small mb-0">
            View active e-tickets, check admissions status, or manage eligible cancellations
          </p>
        </div>

        <Link to="/shows" className="btn btn-sm btn-primary">
          <i className="bi bi-plus-lg me-1" />
          Book New Tickets
        </Link>
      </div>

      {/* Tabs */}
      <div className="bg-white border rounded p-2 mb-4 shadow-sm">
        <ul className="nav nav-pills">
          <li className="nav-item">
            <button
              className={`nav-link small fw-semibold ${activeTab === 'upcoming' ? 'active' : 'text-secondary'}`}
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming Screenings ({bookingsList.filter((b) => b.isUpcoming).length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link small fw-semibold ${activeTab === 'past' ? 'active' : 'text-secondary'}`}
              onClick={() => setActiveTab('past')}
            >
              Past Bookings & Cancellations
            </button>
          </li>
        </ul>
      </div>

      {/* Bookings List */}
      <div className="d-flex flex-column gap-3">
        {filtered.length > 0 ? (
          filtered.map((booking) => (
            <div className="bg-white border rounded p-4 shadow-sm" key={booking.id}>
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 pb-3 mb-3 border-bottom">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="fw-bold font-monospace small text-primary">
                      {booking.id}
                    </span>
                    <Badge
                      variant={
                        booking.status === 'Confirmed'
                          ? 'success'
                          : booking.status === 'Cancelled'
                          ? 'danger'
                          : 'neutral'
                      }
                    >
                      {booking.status}
                    </Badge>
                  </div>
                  <h5 className="fw-bold text-dark mb-0">{booking.movieTitle}</h5>
                  <div className="text-secondary small">
                    {booking.theatre} • {booking.screen}
                  </div>
                </div>

                <div className="text-md-end">
                  <span className="small text-muted d-block">Total Paid</span>
                  <span className="fw-bold fs-5 text-dark">${booking.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="row g-3 align-items-center">
                <div className="col-md-8">
                  <div className="d-flex flex-wrap gap-4 text-secondary small">
                    <div>
                      <span className="text-muted d-block">Date:</span>
                      <strong className="text-dark">{booking.date}</strong>
                    </div>
                    <div>
                      <span className="text-muted d-block">Time:</span>
                      <strong className="text-dark">{booking.time}</strong>
                    </div>
                    <div>
                      <span className="text-muted d-block">Seats:</span>
                      <div className="d-flex gap-1 mt-1">
                        {booking.seats.map((s) => (
                          <span key={s} className="badge bg-light text-dark border">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-4 d-flex justify-content-md-end gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setSelectedTicket(booking)}
                  >
                    <i className="bi bi-qr-code me-1" />
                    View Ticket
                  </Button>

                  {booking.isUpcoming && booking.status === 'Confirmed' && (
                    <Button
                      variant="light"
                      size="sm"
                      className="text-danger"
                      onClick={() => setCancelModalBooking(booking)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border rounded p-5 text-center shadow-sm">
            <i className="bi bi-ticket-perforated fs-1 text-muted mb-2 d-block" />
            <h6 className="fw-bold text-dark">No bookings found</h6>
            <p className="text-muted small mb-3">
              You do not have any {activeTab === 'upcoming' ? 'upcoming' : 'past'} movie bookings.
            </p>
            <Link to="/shows" className="btn btn-sm btn-primary">
              Explore Current Showtimes
            </Link>
          </div>
        )}
      </div>

      {/* QR Ticket View Modal */}
      {selectedTicket && (
        <Modal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          title={`Digital Admission Pass - ${selectedTicket.id}`}
        >
          <div className="text-center p-2">
            <h5 className="fw-bold text-dark mb-1">{selectedTicket.movieTitle}</h5>
            <div className="text-secondary small mb-3">{selectedTicket.theatre}</div>

            <div className="p-3 bg-light border rounded d-inline-block mb-3">
              <svg width="140" height="140" viewBox="0 0 120 120" fill="none">
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
                <rect x="50" y="50" width="20" height="20" fill="#0f172a" />
                <rect x="50" y="80" width="25" height="15" fill="#0f172a" />
              </svg>
            </div>

            <div className="d-flex justify-content-center gap-3 small text-secondary mb-3">
              <div>
                <strong>Date:</strong> {selectedTicket.date}
              </div>
              <div>
                <strong>Time:</strong> {selectedTicket.time}
              </div>
              <div>
                <strong>Seats:</strong> {selectedTicket.seats.join(', ')}
              </div>
            </div>

            <div className="small text-muted border-top pt-2">
              Present this pass at the cinema turnstile for admission.
            </div>
          </div>
        </Modal>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelModalBooking && (
        <Modal
          isOpen={!!cancelModalBooking}
          onClose={() => setCancelModalBooking(null)}
          title="Confirm Ticket Cancellation"
          primaryActionLabel="Confirm Cancellation & Refund"
          onPrimaryAction={handleConfirmCancel}
        >
          <p className="text-secondary small mb-3">
            Are you sure you want to cancel booking <strong>{cancelModalBooking.id}</strong> for{' '}
            <strong>{cancelModalBooking.movieTitle}</strong>?
          </p>
          <div className="alert alert-warning small mb-0">
            A full refund of <strong>${cancelModalBooking.total.toFixed(2)}</strong> will be credited back to your original payment method within 3–5 business days according to the cinema refund policy.
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BookingHistoryPage;
