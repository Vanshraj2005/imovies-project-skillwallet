import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMovies, setFilters, resetFilters } from '../features/movies/moviesSlice';
import { theatresApi } from '../services/api';
import MovieCard from '../components/common/MovieCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorAlert from '../components/common/ErrorAlert';

const MoviesPage = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const { movies, loading, error, filters, meta } = useSelector((state) => state.movies);
  const { availableCities } = useSelector((state) => state.ui);

  const [theatresList, setTheatresList] = useState([]);
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Load available theatres for theatre-based filtering
  useEffect(() => {
    theatresApi
      .getAll()
      .then((res) => setTheatresList(res.data || []))
      .catch(() => {});
  }, []);

  // Sync initial URL search parameters into Redux filters
  useEffect(() => {
    const urlUpdates = {};
    const qSearch = searchParams.get('search');
    const qStatus = searchParams.get('status');
    const qGenre = searchParams.get('genre');
    const qLanguage = searchParams.get('language');
    const qCity = searchParams.get('city');
    const qTheatre = searchParams.get('theatreId');
    const qDate = searchParams.get('date');
    const qSort = searchParams.get('sort');
    const qPage = searchParams.get('page');

    if (qSearch !== null) urlUpdates.search = qSearch;
    if (qStatus !== null) urlUpdates.status = qStatus;
    if (qGenre !== null) urlUpdates.genre = qGenre;
    if (qLanguage !== null) urlUpdates.language = qLanguage;
    if (qCity !== null) urlUpdates.city = qCity;
    if (qTheatre !== null) urlUpdates.theatreId = qTheatre;
    if (qDate !== null) urlUpdates.date = qDate;
    if (qSort !== null) urlUpdates.sort = qSort;
    if (qPage !== null) urlUpdates.page = Number(qPage) || 1;

    if (Object.keys(urlUpdates).length > 0) {
      dispatch(setFilters(urlUpdates));
      if (urlUpdates.search !== undefined) {
        setSearchInput(urlUpdates.search);
      }
    }
  }, []); // Run once on mount

  // Whenever filters change in Redux, trigger fetch and sync back to URL
  useEffect(() => {
    dispatch(fetchMovies(filters));

    // Reflect active filters in URL parameters
    const newParams = new URLSearchParams();
    if (filters.search) newParams.set('search', filters.search);
    if (filters.status && filters.status !== 'now_showing') newParams.set('status', filters.status);
    if (filters.genre && filters.genre !== 'All') newParams.set('genre', filters.genre);
    if (filters.language && filters.language !== 'All') newParams.set('language', filters.language);
    if (filters.city && filters.city !== 'All') newParams.set('city', filters.city);
    if (filters.theatreId) newParams.set('theatreId', filters.theatreId);
    if (filters.date) newParams.set('date', filters.date);
    if (filters.sort && filters.sort !== 'rating') newParams.set('sort', filters.sort);
    if (filters.page && filters.page > 1) newParams.set('page', filters.page.toString());

    setSearchParams(newParams, { replace: true });
  }, [dispatch, filters, setSearchParams]);

  // Debounced search handling
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        dispatch(setFilters({ search: searchInput, page: 1 }));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, filters.search, dispatch]);

  const handleSearchFormSubmit = (e) => {
    e.preventDefault();
    dispatch(setFilters({ search: searchInput, page: 1 }));
  };

  const handleFilterChange = (key, value) => {
    dispatch(setFilters({ [key]: value, page: 1 }));
  };

  const handleResetAll = () => {
    setSearchInput('');
    dispatch(resetFilters());
  };

  const genres = [
    'All',
    'Action',
    'Adventure',
    'Sci-Fi',
    'Drama',
    'Thriller',
    'Romance',
    'Comedy',
    'Fantasy',
  ];

  const languages = ['All', 'English', 'Spanish', 'French', 'German', 'Japanese'];

  const hasActiveFilters =
    (filters.genre && filters.genre !== 'All') ||
    (filters.language && filters.language !== 'All') ||
    (filters.city && filters.city !== 'All') ||
    Boolean(filters.theatreId) ||
    Boolean(filters.date) ||
    Boolean(filters.search) ||
    filters.status === 'coming_soon';

  return (
    <div className="container py-4">
      {/* Header & Breadcrumbs */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <nav aria-label="breadcrumb" className="mb-1">
            <ol className="breadcrumb small mb-1">
              <li className="breadcrumb-item">
                <a href="/" className="text-decoration-none text-muted">
                  Home
                </a>
              </li>
              <li className="breadcrumb-item active text-dark" aria-current="page">
                Movie Catalogue
              </li>
            </ol>
          </nav>
          <h1 className="h3 fw-bold text-dark mb-1">Explore Movies</h1>
          <p className="text-secondary small mb-0">
            Search verified showtimes, filter by genre or cinema venue, and book online
          </p>
        </div>

        {/* Search Bar Input */}
        <form onSubmit={handleSearchFormSubmit} className="d-flex" style={{ maxWidth: '340px' }}>
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0 text-muted">
              <i className="bi bi-search" />
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Search title, director, cast..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search movies"
            />
            {searchInput && (
              <button
                type="button"
                className="btn btn-white border border-start-0 text-muted"
                onClick={() => setSearchInput('')}
              >
                <i className="bi bi-x" />
              </button>
            )}
            <button className="btn btn-primary px-3" type="submit">
              Search
            </button>
          </div>
        </form>
      </div>

      <div className="row g-4">
        {/* Filter Controls Sidebar */}
        <aside className="col-lg-3 col-md-4">
          <div className="bg-white border rounded p-3 shadow-sm mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
              <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-sliders text-primary" />
                Refine Search
              </h6>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-decoration-none p-0 text-primary small"
                  onClick={handleResetAll}
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Screening Status */}
            <div className="mb-3">
              <label className="form-label fw-bold text-secondary small mb-2">Screening Status</label>
              <div className="btn-group btn-group-sm w-100" role="group">
                <button
                  type="button"
                  className={`btn ${
                    filters.status === 'now_showing'
                      ? 'btn-primary'
                      : 'btn-outline-secondary'
                  }`}
                  onClick={() => handleFilterChange('status', 'now_showing')}
                >
                  Now Showing
                </button>
                <button
                  type="button"
                  className={`btn ${
                    filters.status === 'coming_soon'
                      ? 'btn-primary'
                      : 'btn-outline-secondary'
                  }`}
                  onClick={() => handleFilterChange('status', 'coming_soon')}
                >
                  Coming Soon
                </button>
              </div>
            </div>

            {/* Genre Filter */}
            <div className="mb-3">
              <label className="form-label fw-bold text-secondary small mb-1">Genre</label>
              <select
                className="form-select form-select-sm"
                value={filters.genre || 'All'}
                onChange={(e) => handleFilterChange('genre', e.target.value)}
              >
                {genres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Language Filter */}
            <div className="mb-3">
              <label className="form-label fw-bold text-secondary small mb-1">Language</label>
              <select
                className="form-select form-select-sm"
                value={filters.language || 'All'}
                onChange={(e) => handleFilterChange('language', e.target.value)}
              >
                {languages.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            {/* City Filter */}
            <div className="mb-3">
              <label className="form-label fw-bold text-secondary small mb-1">City / Region</label>
              <select
                className="form-select form-select-sm"
                value={filters.city || 'All'}
                onChange={(e) => handleFilterChange('city', e.target.value)}
              >
                <option value="All">All Cities</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Theatre Venue Filter */}
            <div className="mb-3">
              <label className="form-label fw-bold text-secondary small mb-1">Cinema Venue</label>
              <select
                className="form-select form-select-sm"
                value={filters.theatreId || ''}
                onChange={(e) => handleFilterChange('theatreId', e.target.value)}
              >
                <option value="">All Partner Cinemas</option>
                {theatresList.map((t) => (
                  <option key={t._id || t.id} value={t._id || t.id}>
                    {t.name} ({t.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Show Date Picker */}
            <div className="mb-3">
              <label className="form-label fw-bold text-secondary small mb-1">Showtime Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.date || ''}
                onChange={(e) => handleFilterChange('date', e.target.value)}
              />
            </div>

            {/* Sort Order */}
            <div className="mb-2">
              <label className="form-label fw-bold text-secondary small mb-1">Sort Results</label>
              <select
                className="form-select form-select-sm"
                value={filters.sort || 'rating'}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
              >
                <option value="rating">Highest Rated</option>
                <option value="releaseDate">Release Date (Newest)</option>
                <option value="title">Alphabetical (A-Z)</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Results Area */}
        <main className="col-lg-9 col-md-8">
          {/* Active Filter Pills Strip */}
          {hasActiveFilters && (
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3 bg-light p-2 rounded border">
              <span className="small text-muted fw-semibold">Active:</span>

              {filters.status === 'coming_soon' && (
                <span className="badge bg-white text-dark border d-flex align-items-center gap-1">
                  Upcoming Releases
                  <i
                    className="bi bi-x-circle-fill text-muted ms-1 cursor-pointer"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleFilterChange('status', 'now_showing')}
                  />
                </span>
              )}

              {filters.genre && filters.genre !== 'All' && (
                <span className="badge bg-white text-dark border d-flex align-items-center gap-1">
                  Genre: {filters.genre}
                  <i
                    className="bi bi-x-circle-fill text-muted ms-1 cursor-pointer"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleFilterChange('genre', 'All')}
                  />
                </span>
              )}

              {filters.language && filters.language !== 'All' && (
                <span className="badge bg-white text-dark border d-flex align-items-center gap-1">
                  Language: {filters.language}
                  <i
                    className="bi bi-x-circle-fill text-muted ms-1 cursor-pointer"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleFilterChange('language', 'All')}
                  />
                </span>
              )}

              {filters.city && filters.city !== 'All' && (
                <span className="badge bg-white text-dark border d-flex align-items-center gap-1">
                  City: {filters.city}
                  <i
                    className="bi bi-x-circle-fill text-muted ms-1 cursor-pointer"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleFilterChange('city', 'All')}
                  />
                </span>
              )}

              {filters.theatreId && (
                <span className="badge bg-white text-dark border d-flex align-items-center gap-1">
                  Cinema Filter Active
                  <i
                    className="bi bi-x-circle-fill text-muted ms-1 cursor-pointer"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleFilterChange('theatreId', '')}
                  />
                </span>
              )}

              {filters.date && (
                <span className="badge bg-white text-dark border d-flex align-items-center gap-1">
                  Date: {filters.date}
                  <i
                    className="bi bi-x-circle-fill text-muted ms-1 cursor-pointer"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleFilterChange('date', '')}
                  />
                </span>
              )}

              {filters.search && (
                <span className="badge bg-white text-dark border d-flex align-items-center gap-1">
                  "{filters.search}"
                  <i
                    className="bi bi-x-circle-fill text-muted ms-1 cursor-pointer"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSearchInput('');
                      handleFilterChange('search', '');
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

          {/* Results Header */}
          <div className="d-flex align-items-center justify-content-between mb-3">
            <span className="text-secondary small">
              Found <strong>{meta?.total || movies.length}</strong> available movies
            </span>
            <span className="badge bg-light text-secondary border">
              Page {meta?.page || 1} of {meta?.totalPages || 1}
            </span>
          </div>

          {/* Movies Grid */}
          {loading ? (
            <LoadingSkeleton count={6} />
          ) : movies.length > 0 ? (
            <>
              <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4 mb-4">
                {movies.map((movie) => (
                  <div className="col" key={movie._id || movie.id}>
                    <MovieCard movie={movie} />
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {meta?.totalPages > 1 && (
                <nav
                  aria-label="Catalogue pagination"
                  className="d-flex justify-content-center pt-3 border-top"
                >
                  <ul className="pagination pagination-sm">
                    <li className={`page-item ${meta.page <= 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handleFilterChange('page', Math.max(1, meta.page - 1))}
                        disabled={meta.page <= 1}
                      >
                        <i className="bi bi-chevron-left me-1" />
                        Previous
                      </button>
                    </li>

                    {Array.from({ length: meta.totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      return (
                        <li
                          key={pageNum}
                          className={`page-item ${meta.page === pageNum ? 'active' : ''}`}
                        >
                          <button
                            className="page-link"
                            onClick={() => handleFilterChange('page', pageNum)}
                          >
                            {pageNum}
                          </button>
                        </li>
                      );
                    })}

                    <li className={`page-item ${meta.page >= meta.totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() =>
                          handleFilterChange('page', Math.min(meta.totalPages, meta.page + 1))
                        }
                        disabled={meta.page >= meta.totalPages}
                      >
                        Next
                        <i className="bi bi-chevron-right ms-1" />
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          ) : (
            <EmptyState
              title="No movies found"
              description="No cinematic records matched your combined search and filter criteria. Try adjusting or resetting your filters."
              actionLabel="Clear All Filters"
              onAction={handleResetAll}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default MoviesPage;
