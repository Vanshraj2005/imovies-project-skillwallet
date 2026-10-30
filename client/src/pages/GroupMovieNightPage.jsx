import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { groupPlansApi, moviesApi } from '../services/api';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import ErrorAlert from '../components/common/ErrorAlert';
import { toast } from 'react-toastify';

const GroupMovieNightPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteTokenParam = searchParams.get('invite');

  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [availableMovies, setAvailableMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Plan Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('Friday Movie Crew');
  const [newCity, setNewCity] = useState('New York');
  const [newDate, setNewDate] = useState(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [newBudget, setNewBudget] = useState(25.0);
  const [selectedMovieIds, setSelectedMovieIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invitation resolver
  const [invitePreview, setInvitePreview] = useState(null);
  const [isJoining, setIsJoining] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, moviesRes] = await Promise.all([
        isAuthenticated ? groupPlansApi.getAll().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        moviesApi.getAll().catch(() => ({ data: [] })),
      ]);

      const planList = plansRes.data || [];
      setPlans(planList);
      if (planList.length > 0 && !activePlan) {
        setActivePlan(planList[0]);
      }
      setAvailableMovies(moviesRes.data || []);

      // Check if viewing via invite link
      if (inviteTokenParam) {
        try {
          const invRes = await groupPlansApi.getByInvite(inviteTokenParam);
          setInvitePreview(invRes.data);
        } catch (invErr) {
          toast.error(invErr.message || 'Invitation link is invalid or expired.');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load group movie nights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated, inviteTokenParam]);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.info('Please sign in to organize a group movie night.');
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await groupPlansApi.create({
        title: newTitle,
        city: newCity,
        targetDate: newDate,
        budget: Number(newBudget),
        movieIds: selectedMovieIds,
      });

      toast.success(`Group plan "${newTitle}" created!`);
      setIsCreateModalOpen(false);
      setPlans((prev) => [res.data, ...prev]);
      setActivePlan(res.data);
    } catch (err) {
      toast.error(err.message || 'Could not create group plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinInvite = async () => {
    if (!isAuthenticated) {
      toast.info('Please sign in or register to join this movie night.');
      navigate(`/login?redirect=/group-plans?invite=${inviteTokenParam}`);
      return;
    }

    setIsJoining(true);
    try {
      const res = await groupPlansApi.join(inviteTokenParam);
      toast.success('Joined movie night group successfully!');
      setInvitePreview(null);
      await loadData();
      setActivePlan(res.data);
    } catch (err) {
      toast.error(err.message || 'Could not join group.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleVote = async (movieId) => {
    if (!activePlan) return;
    try {
      const res = await groupPlansApi.vote(activePlan._id || activePlan.id, { movieId });
      setActivePlan(res.data);
      setPlans((prev) => prev.map((p) => (p._id === res.data._id ? res.data : p)));
      toast.success('Vote recorded!');
    } catch (err) {
      toast.error(err.message || 'Failed to vote.');
    }
  };

  const handleCopyInvite = (token) => {
    const inviteUrl = `${window.location.origin}/group-plans?invite=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.info('Invitation link copied to clipboard! Share it with friends.');
  };

  return (
    <div className="container py-4">
      {/* Header Banner */}
      <div className="bg-white border rounded p-4 mb-4 shadow-sm">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge bg-primary text-white">Social Ticketing</span>
              <span className="text-muted small">Collaborative Cinema Planning</span>
            </div>
            <h1 className="h4 fw-bold text-dark mb-1">Plan My Movie Night</h1>
            <p className="text-secondary small mb-0">
              Pick candidate films, invite friends via secure link, vote together, and split ticket costs automatically.
            </p>
          </div>

          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            <i className="bi bi-people-fill me-1" />
            Organize New Movie Night
          </Button>
        </div>
      </div>

      {/* Invite Preview Alert (if landing from an invitation link) */}
      {invitePreview && (
        <div className="alert alert-primary border-primary d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4 shadow-sm">
          <div>
            <div className="fw-bold fs-6 text-dark mb-1">
              <i className="bi bi-envelope-paper-heart text-primary me-2" />
              You're Invited to: "{invitePreview.title}"
            </div>
            <div className="text-secondary small">
              Organized by <strong>{invitePreview.organizerName}</strong> in {invitePreview.city} • Target Date:{' '}
              {new Date(invitePreview.targetDate).toLocaleDateString()} • {invitePreview.membersCount} participants
            </div>
          </div>

          <Button variant="primary" loading={isJoining} onClick={handleJoinInvite}>
            Accept Invite & Join Group
          </Button>
        </div>
      )}

      {error && <ErrorAlert message={error} onRetry={loadData} className="mb-4" />}

      {/* Main Group Plans Display */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading group plans...</span>
          </div>
        </div>
      ) : plans.length === 0 && !invitePreview ? (
        <EmptyState
          title="No Group Movie Nights Yet"
          description="Create a movie night plan to coordinate films, showtimes, and seat reservations with your friends."
          actionLabel="Organize Your First Movie Night"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="row g-4">
          {/* Left Column: List of Group Plans */}
          <div className="col-lg-4">
            <h2 className="h6 fw-bold text-dark mb-3">Your Movie Night Groups</h2>
            <div className="d-flex flex-column gap-2">
              {plans.map((p) => {
                const isSelected = activePlan?._id === p._id || activePlan?.id === p.id;
                return (
                  <div
                    key={p._id || p.id}
                    className={`p-3 border rounded cursor-pointer transition-all ${
                      isSelected ? 'bg-primary-subtle border-primary shadow-sm' : 'bg-white hover-bg-light'
                    }`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setActivePlan(p)}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-bold text-dark small">{p.title}</span>
                      <span
                        className={`badge ${
                          p.status === 'BOOKED'
                            ? 'bg-success'
                            : p.status === 'DECIDED'
                            ? 'bg-info text-dark'
                            : 'bg-primary-subtle text-primary border border-primary-subtle'
                        }`}
                        style={{ fontSize: '0.65rem' }}
                      >
                        {p.status}
                      </span>
                    </div>
                    <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                      <i className="bi bi-geo-alt me-1" />
                      {p.city} • {new Date(p.targetDate).toLocaleDateString()}
                    </div>
                    <div className="text-secondary small mt-1 d-flex justify-content-between align-items-center">
                      <span>{p.members?.length || 1} members</span>
                      {p.perPersonCost > 0 && (
                        <span className="fw-semibold text-primary">
                          ${p.perPersonCost.toFixed(2)}/person
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Plan Details, Voting, Cost Split & Action */}
          {activePlan && (
            <div className="col-lg-8">
              <div className="bg-white border rounded p-4 shadow-sm mb-4">
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-start gap-2 mb-3 pb-3 border-bottom">
                  <div>
                    <h2 className="h5 fw-bold text-dark mb-1">{activePlan.title}</h2>
                    <div className="text-secondary small">
                      Location: <strong>{activePlan.city}</strong> • Date:{' '}
                      <strong>{new Date(activePlan.targetDate).toLocaleDateString()}</strong> • Budget:{' '}
                      <strong>${activePlan.budget?.toFixed(2)}/ticket</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                    onClick={() => handleCopyInvite(activePlan.inviteToken)}
                  >
                    <i className="bi bi-link-45deg fs-6" />
                    Copy Invite Link
                  </button>
                </div>

                {/* Candidate Movies & Voting Ribbon */}
                <div className="mb-4">
                  <h3 className="h6 fw-bold text-dark mb-2">1. Movie Voting & Preferences</h3>
                  <div className="row g-2">
                    {(activePlan.candidateMovies || []).map((cand) => {
                      const movie = cand.movie || {};
                      const voteCount = cand.votes?.length || 0;
                      const hasVoted = user && cand.votes?.some((v) => String(v) === String(user._id || user.id));

                      return (
                        <div className="col-md-6" key={cand._id || movie._id}>
                          <div className="p-3 bg-light border rounded d-flex align-items-center justify-content-between">
                            <div>
                              <div className="fw-bold small text-dark mb-0.5">{movie.title || 'Movie'}</div>
                              <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                {Array.isArray(movie.genre) ? movie.genre.join(', ') : movie.genre || 'Feature Film'}
                              </div>
                            </div>

                            <button
                              type="button"
                              className={`btn btn-sm ${hasVoted ? 'btn-primary' : 'btn-outline-primary'}`}
                              onClick={() => handleVote(cand._id || movie._id)}
                            >
                              <i className="bi bi-hand-thumbs-up me-1" />
                              {voteCount} {voteCount === 1 ? 'Vote' : 'Votes'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Group Members & Cost Sharing Calculation */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h3 className="h6 fw-bold text-dark mb-0">2. Participants & Calculated Per-Person Cost</h3>
                    <span className="badge bg-light text-dark border">
                      {activePlan.members?.length || 1} Confirmed Friends
                    </span>
                  </div>

                  <div className="p-3 bg-light border rounded mb-3">
                    <div className="row g-3 text-center">
                      <div className="col-4">
                        <span className="text-muted small d-block">Estimated Total</span>
                        <strong className="text-dark fs-6">
                          ${(activePlan.totalCost || (activePlan.members?.length || 1) * 14.0).toFixed(2)}
                        </strong>
                      </div>
                      <div className="col-4 border-start border-end">
                        <span className="text-muted small d-block">Party Size</span>
                        <strong className="text-dark fs-6">
                          {activePlan.members?.length || 1} Guests
                        </strong>
                      </div>
                      <div className="col-4">
                        <span className="text-muted small d-block">Share Per Person</span>
                        <strong className="text-primary fs-6">
                          ${(activePlan.perPersonCost || 14.0).toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="list-group list-group-flush border rounded small">
                    {(activePlan.members || []).map((m, idx) => (
                      <div key={idx} className="list-group-item d-flex justify-content-between align-items-center py-2">
                        <div>
                          <strong className="text-dark">{m.name}</strong>
                          <span className="text-muted ms-2">({m.email})</span>
                          {m.role === 'ORGANIZER' && (
                            <span className="badge bg-primary text-white ms-2" style={{ fontSize: '0.65rem' }}>
                              Organizer
                            </span>
                          )}
                        </div>
                        <span className="badge bg-light text-secondary border">
                          Share: ${(activePlan.perPersonCost || 14.0).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Booking Call-to-Action */}
                <div className="pt-3 border-top d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
                  <div className="text-muted small">
                    <i className="bi bi-info-circle text-primary me-1" />
                    Seats are atomically locked upon proceeding to checkout.
                  </div>

                  <Link to="/shows" className="btn btn-primary">
                    <i className="bi bi-ticket-perforated-fill me-1" />
                    Select Showtime & Book Seats
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Organize Group Plan Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create a Group Movie Night Plan"
        >
          <form onSubmit={handleCreatePlan}>
            <div className="mb-3">
              <label className="form-label small fw-semibold text-dark">Plan Title / Group Name</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Saturday IMAX Crew"
                required
              />
            </div>

            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label small fw-semibold text-dark">City</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  required
                />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold text-dark">Target Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-semibold text-dark">Target Budget Per Ticket ($)</label>
              <input
                type="number"
                className="form-control form-control-sm"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                min="5"
                max="100"
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label small fw-semibold text-dark">
                Candidate Movies for Group Voting (Select up to 3)
              </label>
              <div className="d-flex flex-column gap-1 overflow-auto p-2 border rounded bg-light" style={{ maxHeight: '160px' }}>
                {availableMovies.map((m) => {
                  const isChecked = selectedMovieIds.includes(m._id || m.id);
                  return (
                    <div className="form-check" key={m._id || m.id}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`chk-${m._id || m.id}`}
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedMovieIds((prev) => prev.filter((id) => id !== (m._id || m.id)));
                          } else if (selectedMovieIds.length < 3) {
                            setSelectedMovieIds((prev) => [...prev, m._id || m.id]);
                          } else {
                            toast.warning('You can nominate up to 3 candidate movies for voting.');
                          }
                        }}
                      />
                      <label className="form-check-label small text-dark" htmlFor={`chk-${m._id || m.id}`}>
                        {m.title} ({Array.isArray(m.genre) ? m.genre.join(', ') : m.genre})
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-sm btn-light border"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </button>
              <Button variant="primary" type="submit" loading={isSubmitting}>
                Create Plan & Get Invite Link
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default GroupMovieNightPage;

