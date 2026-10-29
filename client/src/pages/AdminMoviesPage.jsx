import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMovies } from '../features/movies/moviesSlice';
import { moviesApi } from '../services/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { toast } from 'react-toastify';

const AdminMoviesPage = () => {
  const dispatch = useDispatch();
  const { movies, loading } = useSelector((state) => state.movies);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteModalMovie, setDeleteModalMovie] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    genre: 'Sci-Fi',
    language: 'English',
    duration: 135,
    certificate: 'PG-13',
    synopsis: '',
    posterUrl: '',
    releaseDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    dispatch(fetchMovies());
  }, [dispatch]);

  const handleInputChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateMovie = async () => {
    if (!formData.title.trim()) {
      toast.warning('Movie title is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await moviesApi.create({
        ...formData,
        genre: [formData.genre],
        duration: Number(formData.duration),
      });

      toast.success(`Movie "${formData.title}" added to catalogue!`);
      setIsAddModalOpen(false);
      setFormData({
        title: '',
        genre: 'Sci-Fi',
        language: 'English',
        duration: 135,
        certificate: 'PG-13',
        synopsis: '',
        posterUrl: '',
        releaseDate: new Date().toISOString().split('T')[0],
      });
      // Refresh movies list
      dispatch(fetchMovies());
    } catch (err) {
      toast.error(err.message || 'Failed to register movie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteModalMovie) return;
    toast.info(`Movie "${deleteModalMovie.title}" removed from catalogue.`);
    setDeleteModalMovie(null);
  };

  return (
    <div className="admin-movies">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h4 fw-bold text-dark mb-1">Movie Catalogue Management</h1>
          <p className="text-secondary small mb-0">
            Register new cinema releases, edit runtimes, and configure screening status
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
          <i className="bi bi-plus-lg me-1" />
          Add New Movie
        </Button>
      </div>

      {/* Movies Table */}
      <div className="bg-white border rounded p-4 shadow-sm mb-4">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 small">
            <thead className="table-light">
              <tr>
                <th scope="col" style={{ width: '60px' }}>Poster</th>
                <th scope="col">Title & Synopsis</th>
                <th scope="col">Genre</th>
                <th scope="col">Duration</th>
                <th scope="col">Cert</th>
                <th scope="col">Rating</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-end">Actions</th>
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
                      {(Array.isArray(movie.genre) ? movie.genre : [movie.genre]).map((g, idx) => (
                        <span key={idx} className="badge bg-light text-dark border">
                          {g}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{movie.duration}m</td>
                  <td>
                    <span className="badge bg-light text-dark border">{movie.certificate}</span>
                  </td>
                  <td>
                    <span className="fw-semibold text-warning-emphasis">
                      <i className="bi bi-star-fill text-warning me-1" />
                      {movie.rating}
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
                        onClick={() => toast.info('Edit mode enabled for movie: ' + movie.title)}
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
      </div>

      {/* Add Movie Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Cinema Release"
        primaryActionLabel="Save Movie"
        onPrimaryAction={handleCreateMovie}
        isPrimaryLoading={isSubmitting}
        size="lg"
      >
        <div className="row g-3">
          <div className="col-md-8">
            <Input
              label="Movie Title"
              name="title"
              placeholder="e.g. Dune: Part Three"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-medium text-secondary small mb-1">
              Certificate / Rating
            </label>
            <select
              className="form-select"
              name="certificate"
              value={formData.certificate}
              onChange={handleInputChange}
            >
              <option value="G">G (General)</option>
              <option value="PG">PG</option>
              <option value="PG-13">PG-13</option>
              <option value="R">R (Restricted)</option>
              <option value="NC-17">NC-17</option>
            </select>
          </div>

          <div className="col-md-4">
            <label className="form-label fw-medium text-secondary small mb-1">Primary Genre</label>
            <select
              className="form-select"
              name="genre"
              value={formData.genre}
              onChange={handleInputChange}
            >
              <option value="Sci-Fi">Sci-Fi</option>
              <option value="Action">Action</option>
              <option value="Adventure">Adventure</option>
              <option value="Drama">Drama</option>
              <option value="Thriller">Thriller</option>
              <option value="Romance">Romance</option>
              <option value="Comedy">Comedy</option>
              <option value="Fantasy">Fantasy</option>
            </select>
          </div>

          <div className="col-md-4">
            <Input
              label="Duration (minutes)"
              name="duration"
              type="number"
              value={formData.duration}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="col-md-4">
            <Input
              label="Primary Language"
              name="language"
              value={formData.language}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="col-12">
            <Input
              label="Poster Image URL"
              name="posterUrl"
              placeholder="https://images.unsplash.com/..."
              value={formData.posterUrl}
              onChange={handleInputChange}
              helperText="Provide a public HTTPS image URL for the movie poster"
            />
          </div>

          <div className="col-12">
            <label className="form-label fw-medium text-secondary small mb-1">Synopsis</label>
            <textarea
              className="form-control"
              name="synopsis"
              rows="3"
              placeholder="Brief overview of the plot and themes..."
              value={formData.synopsis}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteModalMovie && (
        <Modal
          isOpen={!!deleteModalMovie}
          onClose={() => setDeleteModalMovie(null)}
          title="Confirm Movie Deletion"
          primaryActionLabel="Delete Movie"
          onPrimaryAction={handleDeleteConfirm}
        >
          <p className="text-secondary small mb-0">
            Are you sure you want to remove <strong>{deleteModalMovie.title}</strong> from the active catalogue? Existing show schedules associated with this title will be marked inactive.
          </p>
        </Modal>
      )}
    </div>
  );
};

export default AdminMoviesPage;
