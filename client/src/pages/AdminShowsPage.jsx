import React, { useState, useEffect } from 'react';
import { showsApi, moviesApi, theatresApi } from '../services/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import ErrorAlert from '../components/common/ErrorAlert';
import { toast } from 'react-toastify';

const AdminShowsPage = () => {
  const [shows, setShows] = useState([]);
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filterMovie, setFilterMovie] = useState('');
  const [filterTheatre, setFilterTheatre] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [cancelModalShow, setCancelModalShow] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for scheduling
  const [formData, setFormData] = useState({
    movie: '',
    theatre: '',
    screenNumber: 1,
    screenName: 'Audi 1',
    format: 'IMAX 2D',
    date: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '16:30',
    vipPrice: 18.0,
    executivePrice: 15.0,
    standardPrice: 12.5,
    totalSeats: 120,
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [showsRes, moviesRes, theatresRes] = await Promise.all([
        showsApi.getAll(),
        moviesApi.getAll({ limit: 100 }),
        theatresApi.getAll(),
      ]);
      setShows(showsRes.data || []);
      setMovies(moviesRes.data || []);
      setTheatres(theatresRes.data || []);

      if (moviesRes.data?.length > 0 && !formData.movie) {
        setFormData((prev) => ({
          ...prev,
          movie: moviesRes.data[0]._id || moviesRes.data[0].id,
        }));
      }
      if (theatresRes.data?.length > 0 && !formData.theatre) {
        setFormData((prev) => ({
          ...prev,
          theatre: theatresRes.data[0]._id || theatresRes.data[0].id,
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load scheduling data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenAddModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      movie: movies[0]?._id || movies[0]?.id || '',
      theatre: theatres[0]?._id || theatres[0]?.id || '',
      screenNumber: 1,
      screenName: 'Audi 1',
      format: 'IMAX 2D',
      date: today,
      startTime: '15:00',
      endTime: '17:30',
      vipPrice: 18.0,
      executivePrice: 15.0,
      standardPrice: 12.5,
      totalSeats: 120,
    });
    setIsAddModalOpen(true);
  };

  const handleScheduleShow = async () => {
    if (!formData.movie || !formData.theatre) {
      toast.warning('Please select both a movie and a theatre.');
      return;
    }

    const startIso = new Date(`${formData.date}T${formData.startTime}:00`).toISOString();
    const endIso = new Date(`${formData.date}T${formData.endTime}:00`).toISOString();

    if (new Date(startIso) >= new Date(endIso)) {
      toast.warning('Start time must precede end time.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        movie: formData.movie,
        theatre: formData.theatre,
        screenNumber: Number(formData.screenNumber) || 1,
        screenName: formData.screenName || `Audi ${formData.screenNumber || 1}`,
        format: formData.format,
        startTime: startIso,
        endTime: endIso,
        pricing: [
          { tier: 'VIP', price: Number(formData.vipPrice) || 18.0 },
          { tier: 'Executive', price: Number(formData.executivePrice) || 15.0 },
          { tier: 'Standard', price: Number(formData.standardPrice) || 12.5 },
        ],
        totalSeats: Number(formData.totalSeats) || 120,
      };

      await showsApi.create(payload);
      toast.success('Show scheduled successfully without screen conflicts!');
      setIsAddModalOpen(false);
      await loadData();
    } catch (err) {
      // Catches 409 conflict and display exact error
      toast.error(err.message || 'Scheduling conflict detected.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelShow = async () => {
    if (!cancelModalShow) return;
    setIsSubmitting(true);
    try {
      await showsApi.delete(cancelModalShow._id || cancelModalShow.id);
      toast.success('Show has been cancelled safely.');
      setCancelModalShow(null);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel show.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter shows list
  const filteredShows = shows.filter((s) => {
    if (filterMovie && String(s.movie?._id || s.movie) !== String(filterMovie)) return false;
    if (filterTheatre && String(s.theatre?._id || s.theatre) !== String(filterTheatre)) return false;
    if (filterDate) {
      const showDateStr = new Date(s.startTime).toISOString().split('T')[0];
      if (showDateStr !== filterDate) return false;
    }
    return true;
  });

  return (
    <div className="admin-shows">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h4 fw-bold text-dark mb-1">Show Scheduling Engine</h1>
          <p className="text-secondary small mb-0">
            Assign movies to physical cinema screens with strict overlap prevention
          </p>
        </div>

        <Button variant="primary" onClick={handleOpenAddModal}>
          <i className="bi bi-calendar-plus me-1" />
          Schedule New Show
        </Button>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-white border rounded p-3 mb-4 shadow-sm">
        <div className="row g-2 align-items-center">
          <div className="col-md-4">
            <select
              className="form-select form-select-sm"
              value={filterMovie}
              onChange={(e) => setFilterMovie(e.target.value)}
            >
              <option value="">All Movies ({movies.length})</option>
              {movies.map((m) => (
                <option key={m._id || m.id} value={m._id || m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-4">
            <select
              className="form-select form-select-sm"
              value={filterTheatre}
              onChange={(e) => setFilterTheatre(e.target.value)}
            >
              <option value="">All Theatres ({theatres.length})</option>
              {theatres.map((t) => (
                <option key={t._id || t.id} value={t._id || t.id}>
                  {t.name} ({t.city})
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <input
              type="date"
              className="form-control form-control-sm"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          <div className="col-md-1 text-end">
            {(filterMovie || filterTheatre || filterDate) && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary w-100"
                onClick={() => {
                  setFilterMovie('');
                  setFilterTheatre('');
                  setFilterDate('');
                }}
                title="Reset filters"
              >
                <i className="bi bi-x-circle" />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadData} className="mb-4" />}

      {/* Shows List Table */}
      <div className="bg-white border rounded p-4 shadow-sm mb-4">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading schedules...</span>
            </div>
          </div>
        ) : filteredShows.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th scope="col">Movie</th>
                  <th scope="col">Theatre & Screen</th>
                  <th scope="col">Date & Showtime</th>
                  <th scope="col">Format</th>
                  <th scope="col">Ticket Tiers</th>
                  <th scope="col">Capacity</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredShows.map((s) => {
                  const mTitle = s.movie?.title || 'Selected Feature';
                  const tName = s.theatre?.name || 'Grand Cinema';
                  const tCity = s.theatre?.city || 'New York';
                  const startTime = new Date(s.startTime);
                  const endTime = new Date(s.endTime);
                  const dateStr = startTime.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    weekday: 'short',
                  });
                  const timeStr = `${startTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })} – ${endTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`;

                  const isCancelled = s.status === 'CANCELLED';

                  return (
                    <tr key={s._id || s.id} className={isCancelled ? 'table-light text-muted' : ''}>
                      <td>
                        <div className="fw-bold text-dark">{mTitle}</div>
                        {s.movie?.certificate && (
                          <span
                            className="badge bg-light text-dark border"
                            style={{ fontSize: '0.65rem' }}
                          >
                            {s.movie.certificate}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="fw-semibold text-secondary">{tName}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          <span className="badge bg-light text-muted border me-1">
                            {s.screenName || `Audi ${s.screenNumber}`}
                          </span>
                          ({tCity})
                        </div>
                      </td>
                      <td>
                        <div className="fw-medium text-dark">{dateStr}</div>
                        <div className="text-muted small">{timeStr}</div>
                      </td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                          {s.format || 'Standard 2D'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {(s.pricing || []).map((p, i) => (
                            <span
                              key={i}
                              className="badge bg-light text-dark border"
                              style={{ fontSize: '0.7rem' }}
                            >
                              {p.tier}: ${p.price.toFixed(2)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className="text-secondary small">
                          {s.availableSeatsCount ?? s.totalSeats ?? 120} / {s.totalSeats ?? 120}
                        </span>
                      </td>
                      <td>
                        <Badge variant={isCancelled ? 'neutral' : 'success'}>
                          {isCancelled ? 'Cancelled' : 'Scheduled'}
                        </Badge>
                      </td>
                      <td className="text-end">
                        {!isCancelled && (
                          <button
                            type="button"
                            className="btn btn-sm btn-light border text-danger"
                            title="Cancel Show"
                            onClick={() => setCancelModalShow(s)}
                          >
                            <i className="bi bi-x-circle me-1" />
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No scheduled shows found"
            description="No shows match your current movie, cinema, or date filters."
            actionLabel="Schedule New Show"
            onAction={handleOpenAddModal}
          />
        )}
      </div>

      {/* Schedule Show Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Schedule Movie Show on Screen"
        primaryActionLabel="Schedule Show"
        onPrimaryAction={handleScheduleShow}
        isPrimaryLoading={isSubmitting}
        size="lg"
      >
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label small fw-semibold text-secondary mb-1">Select Movie</label>
            <select
              className="form-select form-select-sm"
              name="movie"
              value={formData.movie}
              onChange={handleInputChange}
            >
              {movies.map((m) => (
                <option key={m._id || m.id} value={m._id || m.id}>
                  {m.title} ({m.duration} mins)
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-6">
            <label className="form-label small fw-semibold text-secondary mb-1">
              Select Cinema Venue
            </label>
            <select
              className="form-select form-select-sm"
              name="theatre"
              value={formData.theatre}
              onChange={handleInputChange}
            >
              {theatres.map((t) => (
                <option key={t._id || t.id} value={t._id || t.id}>
                  {t.name} ({t.city})
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-4">
            <label className="form-label small fw-semibold text-secondary mb-1">Screen Number</label>
            <select
              className="form-select form-select-sm"
              name="screenNumber"
              value={formData.screenNumber}
              onChange={(e) => {
                const num = Number(e.target.value);
                setFormData((prev) => ({
                  ...prev,
                  screenNumber: num,
                  screenName: `Audi ${num}`,
                }));
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <option key={num} value={num}>
                  Screen Audi {num}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-4">
            <label className="form-label small fw-semibold text-secondary mb-1">Experience Format</label>
            <select
              className="form-select form-select-sm"
              name="format"
              value={formData.format}
              onChange={handleInputChange}
            >
              <option value="IMAX 2D">IMAX 2D</option>
              <option value="Dolby Atmos">Dolby Atmos</option>
              <option value="Standard 2D">Standard 2D</option>
              <option value="3D Experience">3D Experience</option>
              <option value="4DX Laser">4DX Laser</option>
            </select>
          </div>

          <div className="col-md-4">
            <Input
              label="Date of Screening"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="col-md-6">
            <Input
              label="Show Start Time"
              name="startTime"
              type="time"
              value={formData.startTime}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="col-md-6">
            <Input
              label="Show End Time"
              name="endTime"
              type="time"
              value={formData.endTime}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="col-12 border-top pt-3">
            <h6 className="fw-bold text-dark small mb-2">Category Pricing (USD)</h6>
            <div className="row g-2">
              <div className="col-md-4">
                <Input
                  label="VIP Recliner Tier ($)"
                  name="vipPrice"
                  type="number"
                  step="0.5"
                  value={formData.vipPrice}
                  onChange={handleInputChange}
                />
              </div>
              <div className="col-md-4">
                <Input
                  label="Executive Tier ($)"
                  name="executivePrice"
                  type="number"
                  step="0.5"
                  value={formData.executivePrice}
                  onChange={handleInputChange}
                />
              </div>
              <div className="col-md-4">
                <Input
                  label="Standard Tier ($)"
                  name="standardPrice"
                  type="number"
                  step="0.5"
                  value={formData.standardPrice}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Cancel Show Confirmation Modal */}
      <Modal
        isOpen={!!cancelModalShow}
        onClose={() => setCancelModalShow(null)}
        title="Confirm Show Cancellation"
        primaryActionLabel="Cancel Show"
        primaryActionVariant="danger"
        onPrimaryAction={handleCancelShow}
        isPrimaryLoading={isSubmitting}
      >
        <p className="text-secondary small mb-2">
          Are you sure you want to cancel the show for{' '}
          <strong>"{cancelModalShow?.movie?.title || 'Selected Show'}"</strong> at{' '}
          {cancelModalShow?.theatre?.name}?
        </p>
        <p className="text-muted small mb-0">
          The show will be removed from public booking without corrupting existing booking records.
        </p>
      </Modal>
    </div>
  );
};

export default AdminShowsPage;

