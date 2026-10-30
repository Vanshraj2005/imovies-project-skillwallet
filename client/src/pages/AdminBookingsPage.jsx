import React, { useState, useEffect } from 'react';
import { adminApi, bookingsApi } from '../services/api';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import ErrorAlert from '../components/common/ErrorAlert';
import { toast } from 'react-toastify';

const AdminBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Detail view modal
  const [selectedBooking, setSelectedBooking] = useState(null);

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getBookings({
        search,
        status: status === 'ALL' ? undefined : status,
        page,
        limit: 10,
      });
      setBookings(res.data || []);
      if (res.meta) {
        setPagination(res.meta);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [status, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadBookings();
  };

  return (
    <div className="admin-bookings">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h4 fw-bold text-dark mb-1">Bookings & Admissions Oversight</h1>
          <p className="text-secondary small mb-0">
            Monitor real-time ticket sales, audit transaction records, and inspect admissions
          </p>
        </div>

        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
          onClick={loadBookings}
        >
          <i className="bi bi-arrow-clockwise" />
          Refresh Feed
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border rounded p-3 mb-4 shadow-sm">
        <div className="row g-2 align-items-center justify-content-between">
          <div className="col-md-6 col-lg-4">
            <form onSubmit={handleSearchSubmit}>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0 text-muted">
                  <i className="bi bi-search" />
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0"
                  placeholder="Search by BK ref or customer email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button className="btn btn-primary" type="submit">
                  Search
                </button>
              </div>
            </form>
          </div>

          <div className="col-md-6 col-lg-5">
            <div className="d-flex align-items-center justify-content-md-end gap-2">
              <span className="small text-muted">Filter:</span>
              <div className="btn-group btn-group-sm" role="group">
                {['ALL', 'CONFIRMED', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`btn ${status === st ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => {
                      setStatus(st);
                      setPage(1);
                    }}
                  >
                    {st === 'ALL' ? 'All Bookings' : st === 'CONFIRMED' ? 'Confirmed' : 'Cancelled'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadBookings} className="mb-4" />}

      {/* Bookings Table */}
      <div className="bg-white border rounded p-4 shadow-sm mb-4">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading bookings...</span>
            </div>
          </div>
        ) : bookings.length > 0 ? (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Booking Ref</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Movie & Cinema</th>
                    <th scope="col">Seats</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Payment</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-end">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const ref = b.bookingReference || b.id || 'BK-XXXXXX';
                    const customerName =
                      b.customerInfo?.name || b.user?.name || 'Registered Customer';
                    const customerEmail =
                      b.customerInfo?.email || b.user?.email || 'N/A';
                    const movieTitle = b.movie?.title || b.movieTitle || 'Feature Film';
                    const theatreName =
                      b.theatre?.name || b.theatreName || 'Grand Cinema';

                    const seatsFormatted = Array.isArray(b.seats)
                      ? b.seats
                          .map((s) => (typeof s === 'object' ? s.seatNumber : s))
                          .join(', ')
                      : 'N/A';

                    const totalAmount =
                      b.pricing?.totalAmount ?? b.total ?? b.totalAmount ?? 0;
                    const isConfirmed = b.bookingStatus === 'CONFIRMED';

                    return (
                      <tr key={b._id || b.id}>
                        <td>
                          <span className="fw-mono fw-bold text-primary">{ref}</span>
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {new Date(b.createdAt || Date.now()).toLocaleDateString()}
                          </div>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">{customerName}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {customerEmail}
                          </div>
                        </td>
                        <td>
                          <div className="fw-bold text-dark">{movieTitle}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {theatreName}
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {seatsFormatted}
                          </span>
                        </td>
                        <td>
                          <span className="fw-bold text-dark">
                            ${Number(totalAmount).toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-light text-success border">
                            {b.paymentStatus || 'PAID'}
                          </span>
                        </td>
                        <td>
                          <Badge variant={isConfirmed ? 'success' : 'neutral'}>
                            {b.bookingStatus || 'CONFIRMED'}
                          </Badge>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-light border text-secondary"
                            onClick={() => setSelectedBooking(b)}
                          >
                            <i className="bi bi-eye me-1" />
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="d-flex align-items-center justify-content-between pt-3 mt-3 border-top">
                <span className="text-muted small">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
                </span>
                <div className="d-flex gap-1">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title="No booking records found"
            description="No customer bookings match the specified search or filter criteria."
            actionLabel="Reset Search"
            onAction={() => {
              setSearch('');
              setStatus('ALL');
              setPage(1);
            }}
          />
        )}
      </div>

      {/* Detailed Booking View Modal */}
      {selectedBooking && (
        <Modal
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          title={`Booking Details: ${selectedBooking.bookingReference || selectedBooking.id}`}
          primaryActionLabel="Close"
          onPrimaryAction={() => setSelectedBooking(null)}
          size="lg"
        >
          <div className="row g-3">
            <div className="col-md-6">
              <div className="p-3 bg-light border rounded">
                <h6 className="fw-bold text-dark small mb-2">Movie & Cinema Screening</h6>
                <div className="fw-bold text-primary mb-1">
                  {selectedBooking.movie?.title || selectedBooking.movieTitle}
                </div>
                <div className="small text-secondary mb-1">
                  {selectedBooking.theatre?.name || selectedBooking.theatreName}
                </div>
                <div className="small text-muted">
                  Screen: {selectedBooking.screenName || 'Audi 1 (IMAX)'}
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="p-3 bg-light border rounded">
                <h6 className="fw-bold text-dark small mb-2">Customer Information</h6>
                <div className="fw-bold text-dark mb-1">
                  {selectedBooking.customerInfo?.name ||
                    selectedBooking.user?.name ||
                    'Registered Customer'}
                </div>
                <div className="small text-secondary mb-1">
                  Email: {selectedBooking.customerInfo?.email || selectedBooking.user?.email || 'N/A'}
                </div>
                <div className="small text-muted">
                  Phone: {selectedBooking.customerInfo?.phone || selectedBooking.user?.phone || 'N/A'}
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="p-3 bg-light border rounded">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="fw-bold text-dark small mb-0">Seats & Ticket Pricing</h6>
                  <span className="badge bg-light text-dark border">
                    {selectedBooking.ticketCount ||
                      selectedBooking.seats?.length ||
                      1}{' '}
                    Tickets
                  </span>
                </div>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {(selectedBooking.seats || []).map((s, idx) => (
                    <span key={idx} className="badge bg-primary text-white p-2">
                      <i className="bi bi-ticket-perforated me-1" />
                      Seat {typeof s === 'object' ? s.seatNumber : s} (
                      {typeof s === 'object' ? s.seatType || 'STANDARD' : 'STANDARD'})
                    </span>
                  ))}
                </div>

                <div className="border-top pt-2 small">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-secondary">Subtotal:</span>
                    <span className="fw-semibold">
                      $
                      {Number(
                        selectedBooking.pricing?.subtotal ??
                          selectedBooking.total ??
                          0
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-secondary">Convenience Fee:</span>
                    <span className="fw-semibold">
                      $
                      {Number(
                        selectedBooking.pricing?.convenienceFee ?? 2.5
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between fs-6 fw-bold border-top pt-2">
                    <span className="text-dark">Total Charged:</span>
                    <span className="text-primary">
                      $
                      {Number(
                        selectedBooking.pricing?.totalAmount ??
                          selectedBooking.total ??
                          0
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="p-3 bg-light border rounded d-flex align-items-center justify-content-between">
                <div>
                  <div className="small fw-bold text-dark">Admissions Verification Gate Pass</div>
                  <div className="small text-muted">
                    Reference: {selectedBooking.checkIn?.qrCodeReference || `QR-${selectedBooking.bookingReference}`}
                  </div>
                </div>
                <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2">
                  <i className="bi bi-qr-code me-1" />
                  Verified Active Gate Pass
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminBookingsPage;

