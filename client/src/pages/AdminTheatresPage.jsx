import React, { useState, useEffect } from 'react';
import { theatresApi } from '../services/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import ErrorAlert from '../components/common/ErrorAlert';
import { toast } from 'react-toastify';

const AdminTheatresPage = () => {
  const [theatres, setTheatres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editModalTheatre, setEditModalTheatre] = useState(null);
  const [deleteModalTheatre, setDeleteModalTheatre] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    city: 'New York',
    street: '',
    phone: '',
    screenCount: 4,
    facilities: 'Dolby Atmos, Recliner Seats, IMAX Laser, Gourmet Concessions',
    wheelchairAccessible: true,
    assistiveListening: true,
    captioningAvailable: true,
  });

  const loadTheatres = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await theatresApi.getAll();
      setTheatres(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load theatres.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTheatres();
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [e.target.name]: value }));
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      city: 'New York',
      street: '',
      phone: '',
      screenCount: 4,
      facilities: 'Dolby Atmos, Recliner Seats, IMAX Laser, Gourmet Concessions',
      wheelchairAccessible: true,
      assistiveListening: true,
      captioningAvailable: true,
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (theatre) => {
    setEditModalTheatre(theatre);
    const street =
      typeof theatre.address === 'object'
        ? theatre.address?.street || ''
        : theatre.address || '';
    const facilitiesStr = Array.isArray(theatre.facilities)
      ? theatre.facilities.join(', ')
      : theatre.facilities || '';

    setFormData({
      name: theatre.name || '',
      city: theatre.city || 'New York',
      street,
      phone: theatre.phone || '',
      screenCount: theatre.screens?.length || 4,
      facilities: facilitiesStr,
      wheelchairAccessible: theatre.accessibility?.wheelchairAccessible ?? true,
      assistiveListening: theatre.accessibility?.assistiveListening ?? true,
      captioningAvailable: theatre.accessibility?.captioningAvailable ?? true,
    });
  };

  const handleSaveTheatre = async () => {
    if (!formData.name.trim() || !formData.city.trim() || !formData.street.trim()) {
      toast.warning('Theatre name, city, and street address are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const screenCount = Number(formData.screenCount) || 1;
      const screens = Array.from({ length: screenCount }).map((_, i) => ({
        screenNumber: i + 1,
        name: `Audi ${i + 1} (${i === 0 ? 'IMAX' : i === 1 ? 'Dolby' : 'Standard'})`,
        format: i === 0 ? 'IMAX 2D' : i === 1 ? 'Dolby Atmos' : 'Standard 2D',
        totalCapacity: i === 0 ? 160 : 120,
      }));

      const facilities = formData.facilities
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);

      const payload = {
        name: formData.name.trim(),
        city: formData.city.trim(),
        address: {
          street: formData.street.trim(),
          city: formData.city.trim(),
        },
        phone: formData.phone.trim(),
        screens,
        facilities,
        accessibility: {
          wheelchairAccessible: formData.wheelchairAccessible,
          assistiveListening: formData.assistiveListening,
          captioningAvailable: formData.captioningAvailable,
        },
      };

      if (editModalTheatre) {
        await theatresApi.update(editModalTheatre._id || editModalTheatre.id, payload);
        toast.success(`Theatre "${formData.name}" updated successfully.`);
        setEditModalTheatre(null);
      } else {
        await theatresApi.create(payload);
        toast.success(`Theatre "${formData.name}" created successfully.`);
        setIsAddModalOpen(false);
      }

      await loadTheatres();
    } catch (err) {
      toast.error(err.message || 'Operation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalTheatre) return;
    setIsSubmitting(true);
    try {
      await theatresApi.delete(deleteModalTheatre._id || deleteModalTheatre.id);
      toast.success(`Theatre "${deleteModalTheatre.name}" removed from network.`);
      setDeleteModalTheatre(null);
      await loadTheatres();
    } catch (err) {
      toast.error(err.message || 'Failed to remove theatre.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTheatres = theatres.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = t.name?.toLowerCase().includes(q);
    const cityMatch = t.city?.toLowerCase().includes(q);
    return nameMatch || cityMatch;
  });

  return (
    <div className="admin-theatres">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h4 fw-bold text-dark mb-1">Cinema Venues & Screens</h1>
          <p className="text-secondary small mb-0">
            Configure theatre locations, screens, seating capacity, and accessibility
          </p>
        </div>

        <div className="d-flex gap-2">
          <Button variant="primary" onClick={openAddModal}>
            <i className="bi bi-plus-lg me-1" />
            Add Theatre Venue
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border rounded p-3 mb-4 shadow-sm">
        <div className="row g-2 align-items-center">
          <div className="col-md-6 col-lg-4">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <i className="bi bi-search" />
              </span>
              <input
                type="text"
                className="form-control bg-light border-start-0"
                placeholder="Search by cinema name or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn btn-light border-start-0 border"
                  onClick={() => setSearchQuery('')}
                >
                  <i className="bi bi-x" />
                </button>
              )}
            </div>
          </div>
          <div className="col-md-6 col-lg-8 text-md-end text-muted small">
            <span>
              Showing {filteredTheatres.length} of {theatres.length} cinema locations
            </span>
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadTheatres} className="mb-4" />}

      {/* Theatres Table */}
      <div className="bg-white border rounded p-4 shadow-sm mb-4">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading theatres...</span>
            </div>
          </div>
        ) : filteredTheatres.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th scope="col">Cinema Name</th>
                  <th scope="col">City & Location</th>
                  <th scope="col">Screens</th>
                  <th scope="col">Facilities</th>
                  <th scope="col">Accessibility</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTheatres.map((t) => {
                  const street =
                    typeof t.address === 'object'
                      ? t.address?.street
                      : t.address || 'Address unlisted';
                  return (
                    <tr key={t._id || t.id}>
                      <td>
                        <div className="fw-bold text-dark d-flex align-items-center gap-2">
                          <i className="bi bi-building text-primary" />
                          {t.name}
                        </div>
                        {t.phone && (
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            <i className="bi bi-telephone me-1" />
                            {t.phone}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border me-1">{t.city}</span>
                        <div
                          className="text-muted text-truncate"
                          style={{ maxWidth: '200px', fontSize: '0.75rem' }}
                        >
                          {street}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                          {t.screens?.length || 1} Screens
                        </span>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1" style={{ maxWidth: '240px' }}>
                          {(t.facilities || []).slice(0, 3).map((f, i) => (
                            <span
                              key={i}
                              className="badge bg-light text-secondary border"
                              style={{ fontSize: '0.7rem' }}
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {t.accessibility?.wheelchairAccessible && (
                            <i
                              className="bi bi-person-wheelchair text-primary"
                              title="Wheelchair accessible"
                            />
                          )}
                          {t.accessibility?.assistiveListening && (
                            <i
                              className="bi bi-ear text-primary"
                              title="Assistive listening available"
                            />
                          )}
                          {t.accessibility?.captioningAvailable && (
                            <i
                              className="bi bi-badge-cc text-primary"
                              title="Closed captioning available"
                            />
                          )}
                        </div>
                      </td>
                      <td>
                        <Badge variant={t.isActive !== false ? 'success' : 'neutral'}>
                          {t.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-light border text-secondary"
                            title="Edit Cinema"
                            onClick={() => openEditModal(t)}
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-light border text-danger"
                            title="Delete Cinema"
                            onClick={() => setDeleteModalTheatre(t)}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No cinema venues found"
            description={
              searchQuery
                ? `No theatres matched your search query "${searchQuery}".`
                : 'No cinema venues are currently registered.'
            }
            actionLabel={searchQuery ? 'Clear Search' : 'Add New Venue'}
            onAction={searchQuery ? () => setSearchQuery('') : openAddModal}
          />
        )}
      </div>

      {/* Add / Edit Theatre Modal */}
      <Modal
        isOpen={isAddModalOpen || !!editModalTheatre}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditModalTheatre(null);
        }}
        title={editModalTheatre ? `Edit Cinema: ${editModalTheatre.name}` : 'Register Cinema Venue'}
        primaryActionLabel={editModalTheatre ? 'Update Venue' : 'Create Venue'}
        onPrimaryAction={handleSaveTheatre}
        isPrimaryLoading={isSubmitting}
        size="lg"
      >
        <div className="row g-3">
          <div className="col-md-8">
            <Input
              label="Cinema Name"
              name="name"
              placeholder="e.g. IMovies Grand Cinema - Times Square"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-semibold text-secondary mb-1">City</label>
            <select
              className="form-select form-select-sm"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
            >
              <option value="New York">New York</option>
              <option value="Los Angeles">Los Angeles</option>
              <option value="Chicago">Chicago</option>
              <option value="San Francisco">San Francisco</option>
              <option value="Austin">Austin</option>
              <option value="Seattle">Seattle</option>
              <option value="London">London</option>
            </select>
          </div>

          <div className="col-md-8">
            <Input
              label="Street Address"
              name="street"
              placeholder="e.g. 1540 Broadway, 42nd St"
              value={formData.street}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="col-md-4">
            <Input
              label="Contact Phone"
              name="phone"
              placeholder="+1 (555) 019-2834"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>

          <div className="col-md-4">
            <Input
              label="Number of Screens"
              name="screenCount"
              type="number"
              min="1"
              max="24"
              value={formData.screenCount}
              onChange={handleInputChange}
              helperText="Generates standard screen configurations"
            />
          </div>

          <div className="col-md-8">
            <Input
              label="Cinema Facilities (comma-separated)"
              name="facilities"
              value={formData.facilities}
              onChange={handleInputChange}
              helperText="e.g. Dolby Atmos, Recliner Seats, IMAX Laser, Valet Parking"
            />
          </div>

          <div className="col-12 border-top pt-3">
            <h6 className="fw-bold text-dark small mb-2">Verified Accessibility Features</h6>
            <div className="d-flex flex-wrap gap-4">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="wheelchairAccessible"
                  id="wheelchairAccessible"
                  checked={formData.wheelchairAccessible}
                  onChange={handleInputChange}
                />
                <label className="form-check-label small" htmlFor="wheelchairAccessible">
                  <i className="bi bi-person-wheelchair text-primary me-1" />
                  Wheelchair Ramp & Accessible Seating
                </label>
              </div>

              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="assistiveListening"
                  id="assistiveListening"
                  checked={formData.assistiveListening}
                  onChange={handleInputChange}
                />
                <label className="form-check-label small" htmlFor="assistiveListening">
                  <i className="bi bi-ear text-primary me-1" />
                  Assistive Listening Headsets
                </label>
              </div>

              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="captioningAvailable"
                  id="captioningAvailable"
                  checked={formData.captioningAvailable}
                  onChange={handleInputChange}
                />
                <label className="form-check-label small" htmlFor="captioningAvailable">
                  <i className="bi bi-badge-cc text-primary me-1" />
                  Closed Caption Devices
                </label>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteModalTheatre}
        onClose={() => setDeleteModalTheatre(null)}
        title="Confirm Venue Removal"
        primaryActionLabel="Delete Theatre"
        primaryActionVariant="danger"
        onPrimaryAction={handleDeleteConfirm}
        isPrimaryLoading={isSubmitting}
      >
        <p className="text-secondary small mb-2">
          Are you sure you want to remove the venue{' '}
          <strong>"{deleteModalTheatre?.name}"</strong> in {deleteModalTheatre?.city}?
        </p>
        <p className="text-muted small mb-0">
          This operation will remove the venue from the active booking network.
        </p>
      </Modal>
    </div>
  );
};

export default AdminTheatresPage;

