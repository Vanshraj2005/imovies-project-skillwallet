import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Button from '../components/common/Button';

const BookingConfirmationPage = () => {
  const { bookingConfirmation } = useSelector((state) => state.booking);

  // Fallback if accessed directly
  const booking = bookingConfirmation || {
    bookingReference: 'BK-789412',
    movieTitle: 'Interstellar: Beyond Time',
    theatreName: 'IMovies Grand Cinema - Times Square',
    showDate: new Date().toISOString().split('T')[0],
    showTime: '05:15 PM',
    seats: ['A4', 'A5'],
    totalAmount: 36.00,
    paymentStatus: 'COMPLETED (dev_mock)',
    paymentMethod: 'Dev Mock Card (Ending in 4242)',
    transactionId: 'TXN-DEV_MOCK-SAMPLE',
    bookedAt: new Date().toISOString(),
    customerName: 'Alex Johnson',
    customerEmail: 'alex.johnson@example.com',
  };

  const bookingRef = booking.bookingReference || booking.bookingId || 'BK-SAMPLE';
  const qrRef = booking.checkIn?.qrCodeReference || `IMOVIES-TICKET-${bookingRef}`;
  const totalAmount = Number(booking.totalAmount || booking.pricing?.totalAmount || 0);

  const handlePrint = () => {
    window.print();
  };

  // Generate downloadable .ics calendar file
  const handleAddToCalendar = () => {
    const title = `Movie: ${booking.movieTitle} at ${booking.theatreName}`;
    const description = `Booking Reference: ${bookingRef}\\nSeats: ${(booking.seats || []).join(', ')}\\nCinema: ${booking.theatreName}`;
    const location = booking.theatreName || 'IMovies Cinema';

    const icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//IMovies Ticketing//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `DTSTART:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${bookingRef}-movie-showtime.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8 col-md-10">
          {/* Success Banner */}
          <div className="text-center mb-4">
            <div
              className="bg-success-subtle text-success rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
              style={{ width: '64px', height: '64px' }}
            >
              <i className="bi bi-check-lg fs-1" />
            </div>
            <h1 className="h3 fw-bold text-dark mb-1">Booking Confirmed!</h1>
            <p className="text-secondary small mb-0">
              Your digital admission e-ticket has been generated. A confirmation receipt has been dispatched to{' '}
              <strong>{booking.customerEmail || 'your registered email'}</strong>.
            </p>
          </div>

          {/* E-Ticket Card */}
          <div className="bg-white border rounded shadow-sm overflow-hidden mb-4 print-ticket-card">
            {/* Ticket Header */}
            <div className="bg-primary text-white p-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
              <div>
                <span className="badge bg-white text-primary mb-1">IMovies Verified Admission Pass</span>
                <h2 className="h5 fw-bold mb-0 text-white">{booking.movieTitle}</h2>
                <div className="small opacity-75">{booking.theatreName}</div>
              </div>
              <div className="text-md-end">
                <span className="small opacity-75 d-block">Booking Reference</span>
                <span className="fw-bold fs-5 font-monospace">{bookingRef}</span>
              </div>
            </div>

            {/* Ticket Body */}
            <div className="p-4">
              <div className="row g-4 align-items-center">
                {/* Details */}
                <div className="col-md-8">
                  <div className="row g-3">
                    <div className="col-6">
                      <span className="small text-muted d-block">Date:</span>
                      <strong className="text-dark">{booking.showDate}</strong>
                    </div>
                    <div className="col-6">
                      <span className="small text-muted d-block">Time:</span>
                      <strong className="text-dark">{booking.showTime}</strong>
                    </div>
                    <div className="col-6">
                      <span className="small text-muted d-block">Auditorium / Screen:</span>
                      <strong className="text-dark">Audi 1 (IMAX Laser)</strong>
                    </div>
                    <div className="col-6">
                      <span className="small text-muted d-block">Seats:</span>
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {(booking.seats || []).map((seat) => (
                          <span
                            key={typeof seat === 'object' ? seat.seatNumber : seat}
                            className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1"
                          >
                            {typeof seat === 'object' ? seat.seatNumber : seat}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="col-6">
                      <span className="small text-muted d-block">Total Paid:</span>
                      <strong className="text-success">${totalAmount.toFixed(2)}</strong>
                    </div>
                    <div className="col-6">
                      <span className="small text-muted d-block">Admission Status:</span>
                      <span className="badge bg-success-subtle text-success border border-success-subtle">
                        {booking.bookingStatus === 'CHECKED_IN' ? 'Checked In' : 'Confirmed'}
                      </span>
                    </div>
                    {booking.transactionId && (
                      <div className="col-12">
                        <span className="small text-muted d-block">Transaction Reference:</span>
                        <span className="small text-secondary font-monospace">{booking.transactionId}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* QR Code Presentation */}
                <div className="col-md-4 text-center border-start-md ps-md-4">
                  <div className="p-3 bg-light border rounded d-inline-block mb-2">
                    {/* SVG QR Code Representation */}
                    <svg
                      width="120"
                      height="120"
                      viewBox="0 0 120 120"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="120" height="120" fill="white" />
                      {/* Corner 1 */}
                      <rect x="10" y="10" width="30" height="30" fill="#0f172a" />
                      <rect x="15" y="15" width="20" height="20" fill="white" />
                      <rect x="20" y="20" width="10" height="10" fill="#0f172a" />
                      {/* Corner 2 */}
                      <rect x="80" y="10" width="30" height="30" fill="#0f172a" />
                      <rect x="85" y="15" width="20" height="20" fill="white" />
                      <rect x="90" y="20" width="10" height="10" fill="#0f172a" />
                      {/* Corner 3 */}
                      <rect x="10" y="80" width="30" height="30" fill="#0f172a" />
                      <rect x="15" y="85" width="20" height="20" fill="white" />
                      <rect x="20" y="90" width="10" height="10" fill="#0f172a" />
                      {/* Inner QR patterns */}
                      <rect x="50" y="20" width="15" height="10" fill="#0f172a" />
                      <rect x="50" y="50" width="20" height="20" fill="#0f172a" />
                      <rect x="25" y="55" width="15" height="10" fill="#0f172a" />
                      <rect x="80" y="55" width="10" height="25" fill="#0f172a" />
                      <rect x="50" y="85" width="25" height="15" fill="#0f172a" />
                      <rect x="95" y="95" width="15" height="15" fill="#0f172a" />
                    </svg>
                  </div>
                  <div className="small text-muted font-monospace" style={{ fontSize: '0.65rem' }}>
                    {qrRef.length > 22 ? `${qrRef.substring(0, 22)}...` : qrRef}
                  </div>
                  <div className="small text-muted" style={{ fontSize: '0.75rem' }}>
                    Scan at Cinema Entrance
                  </div>
                </div>
              </div>

              {/* Instructions Bar */}
              <div className="mt-4 pt-3 border-top small text-secondary">
                <i className="bi bi-info-circle text-primary me-2" />
                Please arrive at the cinema auditorium at least 15 minutes before showtime. Present this QR code on your mobile device or printed ticket for fast, contactless check-in.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="d-flex flex-wrap justify-content-center gap-3">
            <Button variant="primary" onClick={handlePrint}>
              <i className="bi bi-printer me-1" />
              Print / Save E-Ticket
            </Button>
            <button type="button" className="btn btn-outline-primary" onClick={handleAddToCalendar}>
              <i className="bi bi-calendar-plus me-1" />
              Add to Calendar (.ics)
            </button>
            <Link to="/bookings" className="btn btn-outline-secondary">
              <i className="bi bi-ticket-perforated me-1" />
              View in My Bookings
            </Link>
            <Link to="/" className="btn btn-light border">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationPage;
