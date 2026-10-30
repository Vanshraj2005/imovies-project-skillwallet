import React, { useState, useEffect } from 'react';
import { adminApi, bookingsApi } from '../services/api';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import ErrorAlert from '../components/common/ErrorAlert';
import Button from '../components/common/Button';
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

  // Scanner / Check-in Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);

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

  // Perform atomic gate check-in
  const handlePerformCheckIn = async (refToScan) => {
    const targetRef = (refToScan || scanInput).trim();
    if (!targetRef) {
      toast.warning('Please enter a booking reference or QR code to scan.');
      return;
    }

    setScanLoading(true);
    setScanResult(null);
    setScanError(null);

    try {
      const res = await bookingsApi.checkIn({
        bookingReference: targetRef,
      });

      setScanResult(res.data);
      toast.success(`Check-in approved for ticket ${res.data.bookingReference}!`);
      setScanInput('');
      await loadBookings();
    } catch (err) {
      setScanError(err.message || 'Check-in validation failed.');
      toast.error(err.message || 'Check-in validation failed.');
    } finally {
      setScanLoading(false);
    }
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

        <div className="d-flex align-items-center gap-2">
          {/* Check-In Scanner Trigger */}
          <button
            type="button"
            className="btn btn-sm btn-primary d-flex align-items-center gap-1.5 shadow-sm"
            onClick={() => {
              setIsScannerOpen(true);
              setScanResult(null);
              setScanError(null);
              setScanInput('');
            }}
          >
            <i className="bi bi-qr-code-scan" />
            <span>Ticket Scanner & Check-In</span>
          </button>

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            onClick={loadBookings}
          >
            <i className="bi bi-arrow-clockwise" />
            <span>Refresh Feed</span>
          </button>
        </div>
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
                {['ALL', 'CONFIRMED', 'CANCELLED', 'CHECKED_IN'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`btn ${status === st ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => {
                      setStatus(st);
                      setPage(1);
                    }}
                  >
                    {st === 'ALL'
                      ? 'All'
                      : st === 'CONFIRMED'
                      ? 'Confirmed'
                      : st === 'CANCELLED'
                      ? 'Cancelled'
                      : 'Checked In'}
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
                    <th scope="col">Admission</th>
                    <th scope="col" className="text-end">
                      Actions
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
                    const isCheckedIn =
                      b.bookingStatus === 'CHECKED_IN' || b.checkIn?.isCheckedIn;
                    const isCancelled =
                      b.bookingStatus === 'CANCELLED' || b.cancellation?.isCancelled;

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
                          {isCancelled ? (
                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                              Cancelled
                            </span>
                          ) : isCheckedIn ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle">
                              <i className="bi bi-check2-circle me-1" />
                              Checked In
                            </span>
                          ) : (
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                              Awaiting Entry
                            </span>
                          )}
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-1">
                            {!isCancelled && !isCheckedIn && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-success py-0 px-2"
                                style={{ fontSize: '0.75rem' }}
                                title="Check In Guest"
                                onClick={() => handlePerformCheckIn(ref)}
                              >
                                <i className="bi bi-check-lg me-1" />
                                Check In
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary py-0 px-2"
                              style={{ fontSize: '0.75rem' }}
                              onClick={() => setSelectedBooking(b)}
                            >
                              Inspect
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                <span className="text-muted small">
                  Showing Page {page} of {pagination.totalPages} ({pagination.total} records)
                </span>
                <div className="btn-group btn-group-sm">
                  <button
                    className="btn btn-outline-secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    disabled={page >= pagination.totalPages}
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

      {/* Ticket Check-In Scanner Tool Modal */}
      {isScannerOpen && (
        <Modal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          title="Cinema Entrance Ticket Check-In & Scanner"
          size="md"
        >
          <div className="p-2">
            <p className="text-secondary small mb-3">
              Scan barcode/QR code token or enter the 8-character booking reference (e.g.{' '}
              <code>BK-ABC123</code>) to verify authenticity and admit guests.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePerformCheckIn();
              }}
              className="mb-3"
            >
              <div className="input-group mb-2">
                <span className="input-group-text bg-light text-muted">
                  <i className="bi bi-upc-scan" />
                </span>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Enter reference or scan QR code..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  autoFocus
                />
                <Button
                  variant="primary"
                  type="submit"
                  disabled={scanLoading || !scanInput.trim()}
                >
                  {scanLoading ? 'Validating...' : 'Verify Ticket'}
                </Button>
              </div>
            </form>

            {scanError && (
              <div className="alert alert-danger border-danger small p-3 mb-3 d-flex align-items-start gap-2">
                <i className="bi bi-x-circle-fill text-danger fs-5 mt-1" />
                <div>
                  <strong className="d-block text-dark">Admissions Rejection:</strong>
                  <span>{scanError}</span>
                </div>
              </div>
            )}

            {scanResult && (
              <div className="alert alert-success border-success small p-3 mb-3">
                <div className="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom border-success-subtle">
                  <i className="bi bi-check-circle-fill text-success fs-5" />
                  <strong className="fs-6 text-success">Admission Approved</strong>
                </div>
                <div className="row g-2">
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                      Booking Reference:
                    </span>
                    <span className="fw-mono fw-bold text-dark">{scanResult.bookingReference}</span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                      Movie Title:
                    </span>
                    <span className="fw-semibold text-dark">{scanResult.movieTitle}</span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                      Seats ({scanResult.ticketCount} guests):
                    </span>
                    <span className="badge bg-success text-white">
                      {scanResult.seats?.join(', ')}
                    </span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                      Check-In Timestamp:
                    </span>
                    <span className="text-dark">
                      {new Date(scanResult.checkedInAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

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
                      {typeof s === 'object' ? s.tier || 'STANDARD' : 'STANDARD'})
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
                  <div className="small text-muted font-monospace">
                    Reference: {selectedBooking.checkIn?.qrCodeReference || `IMOVIES-TICKET-${selectedBooking.bookingReference}`}
                  </div>
                  {selectedBooking.checkIn?.isCheckedIn && (
                    <div className="small text-success mt-1">
                      <i className="bi bi-check2 me-1" />
                      Checked in at {new Date(selectedBooking.checkIn.checkedInAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <span className={`badge ${selectedBooking.checkIn?.isCheckedIn ? 'bg-success text-white' : 'bg-primary-subtle text-primary border border-primary-subtle'} px-3 py-2`}>
                  <i className="bi bi-qr-code me-1" />
                  {selectedBooking.checkIn?.isCheckedIn ? 'Checked In' : 'Active Gate Pass'}
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
