import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { emergencyService } from '../../services/api';

const TRIAGE_LEVELS = {
  1: { label: 'Level 1 - Resuscitation', color: '#dc3545', bgClass: 'danger', icon: 'fa-heartbeat' },
  2: { label: 'Level 2 - Emergency', color: '#fd7e14', bgClass: 'warning', icon: 'fa-exclamation-triangle' },
  3: { label: 'Level 3 - Urgent', color: '#ffc107', bgClass: 'warning', icon: 'fa-exclamation-circle' },
  4: { label: 'Level 4 - Less Urgent', color: '#198754', bgClass: 'success', icon: 'fa-clock' },
  5: { label: 'Level 5 - Non-Urgent', color: '#0dcaf0', bgClass: 'info', icon: 'fa-info-circle' },
};

const TRIAGE_DISPLAY = [
  { level: 1, name: 'Resuscitation', color: '#dc3545', textColor: 'white' },
  { level: 2, name: 'Emergency', color: '#fd7e14', textColor: 'white' },
  { level: 3, name: 'Urgent', color: '#ffc107', textColor: 'dark' },
  { level: 4, name: 'Less Urgent', color: '#198754', textColor: 'white' },
  { level: 5, name: 'Non-Urgent', color: '#0dcaf0', textColor: 'dark' },
];

const VISIT_STATUS_BADGES = {
  WAITING: 'bg-warning text-dark',
  TRIAGE: 'bg-info',
  IN_TREATMENT: 'bg-primary',
  OBSERVATION: 'bg-secondary',
  ADMITTED: 'bg-dark',
  DISCHARGED: 'bg-success',
  LEFT_AMA: 'bg-danger',
  TRANSFERRED: 'bg-light text-dark',
};

const EmergencyDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeVisits, setActiveVisits] = useState([]);
  const [triageCounts, setTriageCounts] = useState({});
  const [ambulances, setAmbulances] = useState([]);
  const [ambulanceSummary, setAmbulanceSummary] = useState({ available: 0, on_call: 0, en_route: 0, total: 0 });
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const refreshIntervalRef = useRef(null);
  const [visitForm, setVisitForm] = useState({
    patient_name: '',
    chief_complaint: '',
    triage_level: '3',
    arrival_mode: 'WALK_IN',
  });
  const [dispatchForm, setDispatchForm] = useState({
    ambulance: '',
    pickup_location: '',
    notes: '',
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        emergencyService.getActiveVisits(),
        emergencyService.getAmbulances({ page_size: 50 }),
      ]);

      // Active visits
      if (results[0].status === 'fulfilled') {
        const visits = results[0].value.data;
        const visitList = Array.isArray(visits) ? visits : visits?.results || [];
        setActiveVisits(visitList);

        // Count by triage level
        const counts = {};
        visitList.forEach(v => {
          const level = v.triage_level || 'unassigned';
          counts[level] = (counts[level] || 0) + 1;
        });
        setTriageCounts(counts);
      }

      // Ambulances
      if (results[1].status === 'fulfilled') {
        const ambData = results[1].value.data || [];
        setAmbulances(ambData);
        const summary = { available: 0, on_call: 0, en_route: 0, total: ambData.length };
        ambData.forEach(a => {
          const status = (a.status || '').toUpperCase();
          if (status === 'AVAILABLE') summary.available++;
          else if (status === 'ON_CALL' || status === 'DISPATCHED') summary.on_call++;
          else if (status === 'EN_ROUTE') summary.en_route++;
        });
        setAmbulanceSummary(summary);
      }

      setLoading(false);
    } catch (err) {
      setError('Error loading emergency dashboard');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 30 seconds
    refreshIntervalRef.current = setInterval(fetchDashboardData, 30000);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [fetchDashboardData]);

  const getWaitTime = (arrivalTime) => {
    if (!arrivalTime) return '--';
    const arrival = new Date(arrivalTime);
    const now = new Date();
    const diffMs = now - arrival;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const handleVisitSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await emergencyService.createVisit(visitForm);
      setShowVisitForm(false);
      setVisitForm({ patient_name: '', chief_complaint: '', triage_level: '3', arrival_mode: 'WALK_IN' });
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error creating ER visit');
    }
    setSubmitting(false);
  };

  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await emergencyService.createDispatch(dispatchForm);
      setShowDispatchForm(false);
      setDispatchForm({ ambulance: '', pickup_location: '', notes: '' });
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error dispatching ambulance');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center mt-5"><div className="spinner-border"></div></div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-ambulance me-2"></i>Emergency Department</h2>
        <div className="d-flex align-items-center gap-2">
          <small className="text-muted">
            <i className="fas fa-sync-alt me-1"></i>Auto-refreshes every 30s
          </small>
          <button className="btn btn-outline-primary" onClick={fetchDashboardData}>
            <i className="fas fa-sync-alt me-2"></i>Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        <button className="btn btn-danger" onClick={() => setShowVisitForm(true)}>
          <i className="fas fa-plus-circle me-2"></i>New ER Visit
        </button>
        <button className="btn btn-warning" onClick={() => setShowDispatchForm(true)}>
          <i className="fas fa-ambulance me-2"></i>Dispatch Ambulance
        </button>
      </div>

      {/* Active Visits Count & Triage Breakdown */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm border-start border-danger border-4 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted text-uppercase mb-1">Active ER Visits</h6>
                  <h2 className="fw-bold mb-0">{activeVisits.length}</h2>
                </div>
                <div className="text-danger">
                  <i className="fas fa-procedures fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Triage Level Cards */}
        {TRIAGE_DISPLAY.map(({ level, name, color, textColor }) => (
          <div key={level} className="col-md-auto" style={{ minWidth: '140px' }}>
            <div className="card shadow-sm h-100" style={{ borderLeft: `4px solid ${color}` }}>
              <div className="card-body py-2 px-3">
                <div className="d-flex align-items-center">
                  <div
                    className="rounded-circle d-inline-flex align-items-center justify-content-center me-2"
                    style={{ width: '32px', height: '32px', backgroundColor: color, color: textColor === 'dark' ? '#212529' : '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}
                  >
                    {triageCounts[level] || 0}
                  </div>
                  <div>
                    <small className="text-muted d-block" style={{ lineHeight: 1.2 }}>Level {level}</small>
                    <small className="fw-semibold" style={{ lineHeight: 1.2 }}>{name}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4 mb-4">
        {/* Active Visits Table */}
        <div className="col-md-8">
          <div className="card shadow-sm h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0"><i className="fas fa-list me-2"></i>Active Visits</h5>
              <Link to="/emergency/visits" className="btn btn-sm btn-outline-primary">View All</Link>
            </div>
            <div className="card-body p-0">
              {activeVisits.length === 0 ? (
                <div className="p-3 text-muted text-center">No active ER visits</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Visit #</th>
                        <th>Patient</th>
                        <th>Triage</th>
                        <th>Chief Complaint</th>
                        <th>Status</th>
                        <th>Wait Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeVisits.map((visit) => {
                        const triageInfo = TRIAGE_LEVELS[visit.triage_level] || {};
                        return (
                          <tr key={visit.id}>
                            <td>
                              <Link to={`/emergency/visits/${visit.id}`} className="fw-bold text-decoration-none">
                                {visit.visit_number || visit.id}
                              </Link>
                            </td>
                            <td>{visit.patient_name || (visit.patient ? `${visit.patient.first_name} ${visit.patient.last_name}` : '--')}</td>
                            <td>
                              {visit.triage_level ? (
                                <span
                                  className="badge"
                                  style={{ backgroundColor: triageInfo.color || '#6c757d', color: visit.triage_level === 3 ? '#212529' : '#fff' }}
                                >
                                  Level {visit.triage_level}
                                </span>
                              ) : (
                                <span className="badge bg-secondary">Pending</span>
                              )}
                            </td>
                            <td className="text-truncate" style={{ maxWidth: '200px' }}>{visit.chief_complaint || '--'}</td>
                            <td>
                              <span className={`badge ${VISIT_STATUS_BADGES[visit.status] || 'bg-secondary'}`}>
                                {visit.status_display || visit.status?.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td>
                              <i className="fas fa-clock me-1 text-muted"></i>
                              {getWaitTime(visit.arrival_time || visit.created_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ambulance Status */}
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-header">
              <h5 className="mb-0"><i className="fas fa-ambulance me-2"></i>Ambulance Status</h5>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                <span>
                  <i className="fas fa-check-circle text-success me-2"></i>Available
                </span>
                <span className="badge bg-success fs-6">{ambulanceSummary.available}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                <span>
                  <i className="fas fa-phone text-warning me-2"></i>On Call / Dispatched
                </span>
                <span className="badge bg-warning text-dark fs-6">{ambulanceSummary.on_call}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                <span>
                  <i className="fas fa-road text-info me-2"></i>En Route
                </span>
                <span className="badge bg-info fs-6">{ambulanceSummary.en_route}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold">
                  <i className="fas fa-ambulance text-primary me-2"></i>Total
                </span>
                <span className="badge bg-primary fs-6">{ambulanceSummary.total}</span>
              </div>
            </div>
            <div className="card-footer">
              <Link to="/emergency/ambulances" className="btn btn-sm btn-outline-primary w-100">
                Manage Ambulances
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* New ER Visit Modal */}
      {showVisitForm && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title"><i className="fas fa-plus-circle me-2"></i>New ER Visit</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowVisitForm(false)}></button>
              </div>
              <form onSubmit={handleVisitSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Patient Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={visitForm.patient_name}
                      onChange={(e) => setVisitForm({ ...visitForm, patient_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Chief Complaint *</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={visitForm.chief_complaint}
                      onChange={(e) => setVisitForm({ ...visitForm, chief_complaint: e.target.value })}
                      required
                      placeholder="Describe the primary complaint..."
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Triage Level</label>
                    <select
                      className="form-select"
                      value={visitForm.triage_level}
                      onChange={(e) => setVisitForm({ ...visitForm, triage_level: e.target.value })}
                    >
                      {TRIAGE_DISPLAY.map(t => (
                        <option key={t.level} value={t.level}>Level {t.level} - {t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Arrival Mode</label>
                    <select
                      className="form-select"
                      value={visitForm.arrival_mode}
                      onChange={(e) => setVisitForm({ ...visitForm, arrival_mode: e.target.value })}
                    >
                      <option value="WALK_IN">Walk-In</option>
                      <option value="AMBULANCE">Ambulance</option>
                      <option value="TRANSFERRED">Transferred</option>
                      <option value="POLICE">Police</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowVisitForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-danger" disabled={submitting}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</> : <><i className="fas fa-save me-2"></i>Create Visit</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Ambulance Modal */}
      {showDispatchForm && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title"><i className="fas fa-ambulance me-2"></i>Dispatch Ambulance</h5>
                <button type="button" className="btn-close" onClick={() => setShowDispatchForm(false)}></button>
              </div>
              <form onSubmit={handleDispatchSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Ambulance *</label>
                    <select
                      className="form-select"
                      value={dispatchForm.ambulance}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, ambulance: e.target.value })}
                      required
                    >
                      <option value="">-- Select Ambulance --</option>
                      {ambulances
                        .filter(a => (a.status || '').toUpperCase() === 'AVAILABLE')
                        .map(a => (
                          <option key={a.id} value={a.id}>
                            {a.vehicle_number || a.name || `Ambulance #${a.id}`}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Pickup Location *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={dispatchForm.pickup_location}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, pickup_location: e.target.value })}
                      required
                      placeholder="Enter pickup address..."
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={dispatchForm.notes}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                      placeholder="Additional information..."
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowDispatchForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-warning" disabled={submitting}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Dispatching...</> : <><i className="fas fa-paper-plane me-2"></i>Dispatch</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyDashboard;
