import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Badge from '../components/common/Badge';

const mockTheatres = [
  {
    id: 'th-1',
    name: 'IMovies Grand Cinema - Times Square',
    city: 'New York',
    address: '1540 Broadway, New York, NY 10036',
    screensCount: 12,
    amenities: ['IMAX Laser', 'Dolby Atmos', 'Recliner Seats', 'Wheelchair Accessible', 'Gourmet Food'],
    phone: '+1 (212) 555-0144',
  },
  {
    id: 'th-2',
    name: 'IMovies Downtown Royale',
    city: 'New York',
    address: '84 2nd Avenue, New York, NY 10003',
    screensCount: 8,
    amenities: ['Dolby Atmos', 'VIP Lounge', 'Wheelchair Accessible', 'Parking Available'],
    phone: '+1 (212) 555-0188',
  },
  {
    id: 'th-3',
    name: 'IMovies Horizon Multiplex',
    city: 'Los Angeles',
    address: '6801 Hollywood Blvd, Los Angeles, CA 90028',
    screensCount: 14,
    amenities: ['IMAX Laser', '4DX Motion', 'Dolby Atmos', 'Recliner Seats', 'Wheelchair Accessible'],
    phone: '+1 (323) 555-0129',
  },
  {
    id: 'th-4',
    name: 'IMovies Lakeside Cinema',
    city: 'Chicago',
    address: '600 E Grand Ave, Chicago, IL 60611',
    screensCount: 10,
    amenities: ['Dolby Atmos', 'Luxury Recliners', 'Wheelchair Accessible', 'Concessions Bar'],
    phone: '+1 (312) 555-0176',
  },
];

const TheatresPage = () => {
  const { currentCity, availableCities } = useSelector((state) => state.ui);
  const [selectedCity, setSelectedCity] = useState('All');

  const filteredTheatres = mockTheatres.filter((t) => {
    if (selectedCity === 'All') return true;
    return t.city === selectedCity;
  });

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold text-dark mb-1">Cinema Theatres & Venues</h1>
          <p className="text-secondary small mb-0">
            Explore state-of-the-art screens, luxury seating, and accessibility services
          </p>
        </div>

        {/* City Filter */}
        <div className="d-flex align-items-center gap-2">
          <label htmlFor="city-filter" className="small text-secondary fw-semibold text-nowrap">
            Filter by City:
          </label>
          <select
            id="city-filter"
            className="form-select form-select-sm"
            style={{ width: '160px' }}
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
          >
            <option value="All">All Cities</option>
            {availableCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Theatres List */}
      <div className="row g-4">
        {filteredTheatres.map((theatre) => (
          <div className="col-lg-6" key={theatre.id}>
            <div className="im-card p-4 h-100 d-flex flex-column">
              <div className="d-flex align-items-start justify-content-between mb-2">
                <div>
                  <h5 className="fw-bold text-dark mb-1">{theatre.name}</h5>
                  <p className="text-secondary small mb-2">
                    <i className="bi bi-geo-alt text-primary me-1" />
                    {theatre.address}
                  </p>
                </div>
                <span className="badge bg-light text-dark border">
                  {theatre.screensCount} Screens
                </span>
              </div>

              {/* Amenities */}
              <div className="d-flex flex-wrap gap-1 mb-4">
                {theatre.amenities.map((amenity, idx) => (
                  <Badge key={idx} variant="neutral">
                    {amenity.includes('Wheelchair') ? (
                      <i className="bi bi-universal-access me-1 text-success" />
                    ) : (
                      <i className="bi bi-check2 text-primary me-1" />
                    )}
                    {amenity}
                  </Badge>
                ))}
              </div>

              {/* Card Footer Actions */}
              <div className="d-flex align-items-center justify-content-between mt-auto pt-3 border-top">
                <span className="small text-muted">
                  <i className="bi bi-telephone me-1" />
                  {theatre.phone}
                </span>

                <Link
                  to={`/shows?theatreId=${theatre.id}`}
                  className="btn btn-sm btn-primary fw-medium px-3"
                >
                  <i className="bi bi-calendar-event me-1" />
                  View Showtimes
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TheatresPage;
