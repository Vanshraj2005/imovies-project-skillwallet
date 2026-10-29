import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMovies, setFilters, resetFilters } from '../features/movies/moviesSlice';
import MovieCard from '../components/common/MovieCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorAlert from '../components/common/ErrorAlert';
import Button from '../components/common/Button';

const MoviesPage = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const urlStatus = searchParams.get('status') || '';

  const { movies, loading, error, filters } = useSelector((state) => state.movies);
  const [searchTerm, setSearchTerm] = useState(urlSearch);

  // Sync URL params on initial load
  useEffect(() => {
    const updates = {};
    if (urlSearch) updates.search = urlSearch;
    if (urlStatus) updates.status = urlStatus;
    if (Object.keys(updates).length > 0) {
      dispatch(setFilters(updates));
    }
  }, [urlSearch, urlStatus, dispatch]);

  useEffect(() => {
    dispatch(fetchMovies(filters));
  }, [dispatch, filters]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    dispatch(setFilters({ search: searchTerm }));
  };

  const genres = [
    'All',
    'Sci-Fi',
    'Action',
    'Adventure',
    'Drama',
    'Thriller',
    'Romance',
    'Comedy',
    'Fantasy',
  ];

  const languages = ['All', 'English', 'Spanish', 'French', 'German', 'Japanese'];

  return (
    <div className="container py-4">
      {/* Header & Breadcrumb */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold text-dark mb-1">Movie Catalogue</h1>
          <p className="text-secondary small mb-0">
            Browse currently showing movies and preview upcoming releases
          </p>
        </div>

        {/* Search bar inside page */}
        <form onSubmit={handleSearchSubmit} className="d-flex" style={{ maxWidth: '320px' }}>
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Search by title or cast..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="btn btn-primary" type="submit">
              <i className="bi bi-search" />
            </button>
          </div>
        </form>
      </div>

      <div className="row g-4">
        {/* Filters Sidebar */}
        <aside className="col-lg-3 col-md-4">
          <div className="bg-white border rounded p-3 shadow-sm mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
              <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-sliders text-primary" />
                Filters
              </h6>
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none p-0 text-muted"
                onClick={() => {
                  setSearchTerm('');
                  dispatch(resetFilters());
                }}
              >
                Reset All
              </button>
            </div>

            {/* Status Filter */}
            <div className="mb-4">
              <label className="form-label fw-bold text-secondary small mb-2">Screening Status</label>
              <div className="d-flex flex-column gap-1">
                {[
                  { value: 'now_showing', label: 'Now Showing' },
                  { value: 'coming_soon', label: 'Coming Soon' },
                ].map((item) => (
                  <div className="form-check" key={item.value}>
                    <input
                      className="form-check-input"
                      type="radio"
                      name="statusFilter"
                      id={`status-${item.value}`}
                      checked={filters.status === item.value}
                      onChange={() => dispatch(setFilters({ status: item.value }))}
                    />
                    <label className="form-check-label small" htmlFor={`status-${item.value}`}>
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Genre Filter */}
            <div className="mb-4">
              <label className="form-label fw-bold text-secondary small mb-2">Genre</label>
              <select
                className="form-select form-select-sm"
                value={filters.genre}
                onChange={(e) => dispatch(setFilters({ genre: e.target.value }))}
              >
                {genres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Language Filter */}
            <div className="mb-4">
              <label className="form-label fw-bold text-secondary small mb-2">Language</label>
              <select
                className="form-select form-select-sm"
                value={filters.language}
                onChange={(e) => dispatch(setFilters({ language: e.target.value }))}
              >
                {languages.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div className="mb-2">
              <label className="form-label fw-bold text-secondary small mb-2">Sort By</label>
              <select
                className="form-select form-select-sm"
                value={filters.sort}
                onChange={(e) => dispatch(setFilters({ sort: e.target.value }))}
              >
                <option value="rating">Highest Rated</option>
                <option value="releaseDate">Release Date</option>
                <option value="title">Alphabetical (A-Z)</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Movie Results */}
        <div className="col-lg-9 col-md-8">
          {/* Active filter badges */}
          {(filters.genre !== 'All' || filters.language !== 'All' || filters.search) && (
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              <span className="small text-muted">Active Filters:</span>
              {filters.genre !== 'All' && (
                <span className="badge bg-light text-dark border d-flex align-items-center gap-1">
                  Genre: {filters.genre}
                  <i
                    className="bi bi-x-circle-fill text-muted ms-1 cursor-pointer"
                    style={{ cursor: 'pointer' }}
                    onClick={() => dispatch(setFilters({ genre: 'All' }))}
                  />
                </span>
              )}
              {filters.language !== 'All' && (
                <span className="badge bg-light text-dark border d-flex align-items-center gap-1">
                  Language: {filters.language}
                  <i
                    className="bi bi-x-circle-fill text-muted ms-1"
                    style={{ cursor: 'pointer' }}
                    onClick={() => dispatch(setFilters({ language: 'All' }))}
                  />
                </span>
              )}
              {filters.search && (
                <span className="badge bg-light text-dark border d-flex align-items-center gap-1">
                  Search: "{filters.search}"
                  <i
                    className="bi bi-x-circle-fill text-muted ms-1"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSearchTerm('');
                      dispatch(setFilters({ search: '' }));
                    }}
                  />
                </span>
              )}
            </div>
          )}

          {error && (
            <ErrorAlert
              message={error}
              onRetry={() => dispatch(fetchMovies(filters))}
              className="mb-4"
            />
          )}

          {loading ? (
            <LoadingSkeleton count={6} />
          ) : movies.length > 0 ? (
            <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
              {movies.map((movie) => (
                <div className="col" key={movie._id || movie.id}>
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No movies found"
              description="No movies match the selected filters. Try broadening your criteria or resetting filters."
              actionLabel="Clear All Filters"
              onAction={() => {
                setSearchTerm('');
                dispatch(resetFilters());
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MoviesPage;
