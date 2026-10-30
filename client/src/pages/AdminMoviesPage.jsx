import React, { useState, useEffect } from 'react';
import { moviesApi } from '../services/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import ErrorAlert from '../components/common/ErrorAlert';
import { toast } from 'react-toastify';

const AdminMoviesPage = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editModalMovie, setEditModalMovie] = useState(null);
  const [deleteModalMovie, setDeleteModalMovie] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    genre: 'Sci-Fi',
    language: 'English',
    duration: 135,
    certificate: 'PG-13',
    synopsis: '',
    posterUrl: '',
    director: '',
    cast: 'John David, Anne Hathaway',
    status: 'now_showing',
    releaseDate: new Date().toISOString().split('T')[0],
  });

  const loadMovies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await moviesApi.getAll({
        search: searchQuery || undefined,
        page,
        limit: 10,
      });
      setMovies(res.data || []);
      if (res.meta) {
        setPagination(res.meta);
      }
    } catch (err) {
      setError(err.message || 'Failed to load movie catalogue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadMovies();
  };

  const handleInputChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openAddModal = () => {
    setEditModalMovie(null);
    setFormData({
      title: '',
      genre: 'Sci-Fi',
      language: 'English',
      duration: 135,
      certificate: 'PG-13',
      synopsis: '',
      posterUrl: '',
      director: '',
      cast: 'John David, Anne Hathaway',
      status: 'now_showing',
      releaseDate: new Date().toISOString().split('T')[0],
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (movie) => {
    setEditModalMovie(movie);
    const genreStr = Array.isArray(movie.genre) ? movie.genre.join(', ') : movie.genre || 'Sci-Fi';
    const castStr = Array.isArray(movie.cast)
      ? movie.cast.map((c) => (typeof c === 'object' ? c.actorName : c)).join(', ')
      : movie.cast || '';

    setFormData({
      title: movie.title || '',
      genre: genreStr,
      language: movie.language || 'English',
      duration: movie.duration || 120,
      certificate: movie.certificate || 'PG-13',
      synopsis: movie.synopsis || '',
      posterUrl: movie.posterUrl || '',
      director: movie.director || '',
      cast: castStr,
      status: movie.status || 'now_showing',
      releaseDate: movie.releaseDate
        ? new Date(movie.releaseDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    });
  };

  const handleSaveMovie = async () => {
    if (!formData.title.trim()) {
      toast.warning('Movie title is required.');
      return;
    }

    if (!formData.duration || Number(formData.duration) <= 0) {
      toast.warning('Please enter a valid movie runtime in minutes.');
      return;
    }

    setIsSubmitting(true);
    try {
      const genresArray = formData.genre
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean);

      const castArray = formData.cast
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
        .map((name) => ({ actorName: name, roleName: 'Cast' }));

      const payload = {
        title: formData.title.trim(),
        genre: genresArray,
        language: formData.language,
        duration: Number(formData.duration),
        certificate: formData.certificate,
        synopsis: formData.synopsis.trim() || 'No synopsis provided.',
        posterUrl:
          formData.posterUrl.trim() ||
          'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
        director: formData.director.trim(),
        cast: castArray,
        status: formData.status,
        releaseDate: formData.releaseDate,
      };

      if (editModalMovie) {
        await moviesApi.update(editModalMovie._id || editModalMovie.id, payload);
        toast.success(`Movie "${formData.title}" updated successfully.`);
        setEditModalMovie(null);
      } else {
        await moviesApi.create(payload);
        toast.success(`Movie "${formData.title}" added to catalogue!`);
        setIsAddModalOpen(false);
      }

      await loadMovies();
    } catch (err) {
      toast.error(err.message || 'Operation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalMovie) return;
    setIsSubmitting(true);
    try {
      await moviesApi.delete(deleteModalMovie._id || deleteModalMovie.id);
      toast.success(`Movie "${deleteModalMovie.title}" removed from catalogue.`);
      setDeleteModalMovie(null);
      await loadMovies();
    } catch (err) {
      toast.error(err.message || 'Failed to remove movie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-movies">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h4 fw-bold text-dark mb-1">Movie Catalogue Management</h1>
          <p className="text-secondary small mb-0">
            Register new cinema releases, edit runtimes, update posters, and manage titles
          </p>
        </div>

        <Button variant="primary" onClick={openAddModal}>
          <i className="bi bi-plus-lg me-1" />
          Add New Movie
        </Button>
      </div>

      {/* Search and Filters Strip */}
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
                  placeholder="Search by title, director, or cast..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="btn btn-primary" type="submit">
                  Search
                </button>
              </div>
            </form>
          </div>

          <div className="col-md-6 col-lg-4 text-md-end text-muted small">
            Showing {movies.length} of {pagination.total || movies.length} movies
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadMovies} className="mb-4" />}

      {/* Movies Table */}
      <div className="bg-white border rounded p-4 shadow-sm mb-4">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading movie catalogue...</span>
            </div>
          </div>
        ) : movies.length > 0 ? (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th scope="col" style={{ width: '60px' }}>
                      Poster
                    </th>
                    <th scope="col">Title & Synopsis</th>
                    <th scope="col">Genre</th>
                    <th scope="col">Runtime</th>
                    <th scope="col">Cert</th>
                    <th scope="col">Rating</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-end">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {movies.map((movie) => (
                    <tr key={movie._id || movie.id}>
                      <td>
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          className="rounded border"
                          style={{ width: '40px', height: '56px', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.src =
                              'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                      </td>
                      <td>
                        <div className="fw-bold text-dark">{movie.title}</div>
                        <div
                          className="text-muted text-truncate"
                          style={{ maxWidth: '280px', fontSize: '0.75rem' }}
                        >
                          {movie.synopsis}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {(Array.isArray(movie.genre) ? movie.genre : [movie.genre]).map(
                            (g, idx) => (
                              <span key={idx} className="badge bg-light text-dark border">
                                {g}
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td>{movie.duration}m</td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {movie.certificate || 'PG-13'}
                        </span>
                      </td>
                      <td>
                        <span className="fw-semibold text-warning-emphasis">
                          <i className="bi bi-star-fill text-warning me-1" />
                          {movie.rating ? movie.rating.toFixed(1) : '8.0'}
                        </span>
                      </td>
                      <td>
                        <Badge variant={movie.status === 'now_showing' ? 'success' : 'warning'}>
                          {movie.status === 'now_showing' ? 'Now Showing' : 'Coming Soon'}
                        </Badge>
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-light border text-secondary"
                            title="Edit movie"
                            onClick={() => openEditModal(movie)}
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-light border text-danger"
                            title="Delete movie"
                            onClick={() => setDeleteModalMovie(movie)}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="d-flex align-items-center justify-content-between pt-3 mt-3 border-top">
                <span className="text-muted small">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} movies)
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
            title="No movies found"
            description={
              searchQuery
                ? `No movies matched your search query "${searchQuery}".`
                : 'Your catalogue is currently empty.'
            }
            actionLabel={searchQuery ? 'Clear Search' : 'Add New Movie'}
            onAction={searchQuery ? () => setSearchQuery('') : openAddModal}
          />
        )}
      </div>

      {/* Add / Edit Movie Modal */}
      <Modal
        isOpen={isAddModalOpen || !!editModalMovie}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditModalMovie(null);
        }}
        title={editModalMovie ? `Edit Movie: ${editModalMovie.title}` : 'Register New Cinema Release'}
        primaryActionLabel={editModalMovie ? 'Update Movie' : 'Save Movie'}
        onPrimaryAction={handleSaveMovie}
        isPrimaryLoading={isSubmitting}
        size="lg"
      >
        <div className="row g-3">
          <div className="col-md-8">
            <Input
              label="Movie Title"
              name="title"
              placeholder="e.g. Inception: The Awakening"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="col-md-4">
            <label className="form-label small fw-semibold text-secondary mb-1">
              Screening Status
            </label>
            <select
              className="form-select form-select-sm"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="now_showing">Now Showing</option>
              <option value="coming_soon">Coming Soon</option>
              <option value="inactive">Inactive / Archived</option>
            </select>
          </div>

          <div className="col-md-4">
            <Input
              label="Genres (comma-separated)"
              name="genre"
              placeholder="Sci-Fi, Action, Drama"
              value={formData.genre}
              onChange={handleInputChange}
            />
          </div>

          <div className="col-md-4">
            <label className="form-label small fw-semibold text-secondary mb-1">Language</label>
            <select
              className="form-select form-select-sm"
              name="language"
              value={formData.language}
              onChange={handleInputChange}
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="German">German</option>
              <option value="Japanese">Japanese</option>
            </select>
          </div>

          <div className="col-md-4">
            <Input
              label="Runtime (Minutes)"
              name="duration"
              type="number"
              min="30"
              max="360"
              value={formData.duration}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="col-md-4">
            <label className="form-label small fw-semibold text-secondary mb-1">
              Rating Certificate
            </label>
            <select
              className="form-select form-select-sm"
              name="certificate"
              value={formData.certificate}
              onChange={handleInputChange}
            >
              <option value="G">G (General Audience)</option>
              <option value="PG">PG (Parental Guidance)</option>
              <option value="PG-13">PG-13 (Parents Strongly Cautioned)</option>
              <option value="R">R (Restricted)</option>
              <option value="NC-17">NC-17 (Adults Only)</option>
            </select>
          </div>

          <div className="col-md-4">
            <Input
              label="Release Date"
              name="releaseDate"
              type="date"
              value={formData.releaseDate}
              onChange={handleInputChange}
            />
          </div>

          <div className="col-md-4">
            <Input
              label="Director"
              name="director"
              placeholder="e.g. Christopher Nolan"
              value={formData.director}
              onChange={handleInputChange}
            />
          </div>

          <div className="col-12">
            <Input
              label="Top Cast (comma-separated)"
              name="cast"
              placeholder="e.g. Leonardo DiCaprio, Joseph Gordon-Levitt, Elliot Page"
              value={formData.cast}
              onChange={handleInputChange}
            />
          </div>

          <div className="col-12">
            <Input
              label="Poster Image URL"
              name="posterUrl"
              placeholder="https://images.unsplash.com/..."
              value={formData.posterUrl}
              onChange={handleInputChange}
              helperText="Validated secure HTTPS image link"
            />
            {formData.posterUrl && (
              <div className="mt-2 p-2 border rounded bg-light d-flex align-items-center gap-3">
                <img
                  src={formData.posterUrl}
                  alt="Poster preview"
                  style={{ width: '40px', height: '56px', objectFit: 'cover' }}
                  className="rounded border"
                  onError={(e) => {
                    e.target.src =
                      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
                  }}
                />
                <span className="small text-muted">Poster Preview</span>
              </div>
            )}
          </div>

          <div className="col-12">
            <label className="form-label small fw-semibold text-secondary mb-1">
              Movie Synopsis
            </label>
            <textarea
              className="form-control form-control-sm"
              name="synopsis"
              rows="3"
              placeholder="Provide a compelling synopsis of the film..."
              value={formData.synopsis}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteModalMovie}
        onClose={() => setDeleteModalMovie(null)}
        title="Confirm Movie Deletion"
        primaryActionLabel="Delete Movie"
        primaryActionVariant="danger"
        onPrimaryAction={handleDeleteConfirm}
        isPrimaryLoading={isSubmitting}
      >
        <p className="text-secondary small mb-2">
          Are you sure you want to remove <strong>"{deleteModalMovie?.title}"</strong> from the
          catalogue?
        </p>
        <p className="text-muted small mb-0">
          This operation will archive the record and prevent future showtime schedules.
        </p>
      </Modal>
    </div>
  );
};

export default AdminMoviesPage;
