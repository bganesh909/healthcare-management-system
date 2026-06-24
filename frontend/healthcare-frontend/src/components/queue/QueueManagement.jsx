import React, { useState, useEffect, useCallback } from 'react';
import { queueService, patientService, doctorService } from '../../services/api';

const QueueManagement = () => {
  const [queueEntries, setQueueEntries] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Add patient form
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    patient: '',
    doctor: '',
    queue_type: 'REGULAR',
    priority: 'NORMAL',
  });

  const fetchQueueData = useCallback(async () => {
    try {
      const params = {};
      if (filterDoctor) params.doctor_id = filterDoctor;
      if (filterStatus) params.status = filterStatus;
      const response = await queueService.getTodayQueue(params);
      const data = response.data?.results || response.data || [];
      setQueueEntries(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      setError('Error fetching queue data');
      setLoading(false);
    }
  }, [filterDoctor, filterStatus]);

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 15000);
    return () => clearInterval(interval);
  }, [fetchQueueData]);

  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [patientsRes, doctorsRes] = await Promise.all([
          patientService.getAll(),
          doctorService.getAll(),
        ]);
        setPatients(patientsRes.data || []);
        setDoctors(doctorsRes.data || []);
      } catch (e) {
        // Reference data optional
      }
    };
    fetchReferenceData();
  }, []);

  const handleAddToQueue = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await queueService.createEntry(formData);
      setSuccess('Patient added to queue successfully');
      setShowForm(false);
      setFormData({ patient: '', doctor: '', queue_type: 'REGULAR', priority: 'NORMAL' });
      fetchQueueData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error adding patient to queue');
    }
  };

  const handleCallNext = async (id) => {
    try {
      await queueService.callNext(id);
      setSuccess('Patient called');
      fetchQueueData();
    } catch (err) {
      setError('Error calling next patient');
    }
  };

  const handleComplete = async (id) => {
    try {
      await queueService.complete(id);
      setSuccess('Patient marked as complete');
      fetchQueueData();
    } catch (err) {
      setError('Error completing queue entry');
    }
  };

  const handleSkip = async (id) => {
    try {
      await queueService.skip(id);
      setSuccess('Patient skipped');
      fetchQueueData();
    } catch (err) {
      setError('Error skipping patient');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'WAITING': return 'bg-secondary';
      case 'CHECKED_IN': return 'bg-info';
      case 'CALLED': return 'bg-warning text-dark';
      case 'IN_CONSULTATION': return 'bg-primary';
      case 'COMPLETED': return 'bg-success';
      case 'SKIPPED': return 'bg-danger';
      case 'NO_SHOW': return 'bg-dark';
      default: return 'bg-secondary';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT': return 'bg-danger';
      case 'HIGH': return 'bg-warning text-dark';
      case 'NORMAL': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  };

  const calculateWaitTime = (checkInTime) => {
    if (!checkInTime) return '-';
    const checkIn = new Date(checkInTime);
    const now = new Date();
    const diffMs = now - checkIn;
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 1) return '< 1 min';
    if (diffMins < 60) return `${diffMins} min`;
    return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-list-ol me-2"></i>Queue Management</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'} me-1`}></i>
          {showForm ? 'Cancel' : 'Add to Queue'}
        </button>
      </div>

      {error && <div className="alert alert-danger alert-dismissible fade show">
        {error}
        <button type="button" className="btn-close" onClick={() => setError(null)}></button>
      </div>}
      {success && <div className="alert alert-success alert-dismissible fade show">
        {success}
        <button type="button" className="btn-close" onClick={() => setSuccess(null)}></button>
      </div>}

      {/* Add to Queue Form */}
      {showForm && (
        <div className="card shadow-sm mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0"><i className="fas fa-user-plus me-2"></i>Add Patient to Queue</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleAddToQueue}>
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">Patient</label>
                  <select
                    className="form-select"
                    value={formData.patient}
                    onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                    required
                  >
                    <option value="">Select Patient</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Doctor</label>
                  <select
                    className="form-select"
                    value={formData.doctor}
                    onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                    required
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.first_name} {d.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Queue Type</label>
                  <select
                    className="form-select"
                    value={formData.queue_type}
                    onChange={(e) => setFormData({ ...formData, queue_type: e.target.value })}
                  >
                    <option value="REGULAR">Regular</option>
                    <option value="FOLLOW_UP">Follow-up</option>
                    <option value="EMERGENCY">Emergency</option>
                    <option value="WALK_IN">Walk-in</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <button type="submit" className="btn btn-success w-100">
                    <i className="fas fa-plus me-1"></i> Add
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <select
                className="form-select"
                value={filterDoctor}
                onChange={(e) => setFilterDoctor(e.target.value)}
              >
                <option value="">All Doctors</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.first_name} {d.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="WAITING">Waiting</option>
                <option value="CHECKED_IN">Checked In</option>
                <option value="CALLED">Called</option>
                <option value="IN_CONSULTATION">In Consultation</option>
                <option value="COMPLETED">Completed</option>
                <option value="SKIPPED">Skipped</option>
              </select>
            </div>
            <div className="col-md-4">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => { setFilterDoctor(''); setFilterStatus(''); }}
              >
                <i className="fas fa-times me-1"></i> Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Table */}
      {loading ? (
        <div className="text-center mt-5"><div className="spinner-border"></div></div>
      ) : queueEntries.length === 0 ? (
        <div className="alert alert-info">No queue entries for today</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>Token</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Check-in</th>
                <th>Wait Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {queueEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <span className="badge bg-dark" style={{ fontSize: '1rem' }}>
                      {entry.token_number || entry.token || '-'}
                    </span>
                  </td>
                  <td>{entry.patient_name || `${entry.patient?.first_name || ''} ${entry.patient?.last_name || ''}`}</td>
                  <td>Dr. {entry.doctor_name || `${entry.doctor?.first_name || ''} ${entry.doctor?.last_name || ''}`}</td>
                  <td>{entry.queue_type_display || entry.queue_type || '-'}</td>
                  <td>
                    <span className={`badge ${getPriorityBadge(entry.priority)}`}>
                      {entry.priority || 'NORMAL'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(entry.status)}`}>
                      {entry.status_display || entry.status}
                    </span>
                  </td>
                  <td>
                    {entry.check_in_time
                      ? new Date(entry.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '-'}
                  </td>
                  <td>{calculateWaitTime(entry.check_in_time)}</td>
                  <td>
                    <div className="btn-group btn-group-sm">
                      {(entry.status === 'WAITING' || entry.status === 'CHECKED_IN') && (
                        <button
                          className="btn btn-warning"
                          onClick={() => handleCallNext(entry.id)}
                          title="Call Next"
                        >
                          <i className="fas fa-bullhorn"></i>
                        </button>
                      )}
                      {(entry.status === 'CALLED' || entry.status === 'IN_CONSULTATION') && (
                        <button
                          className="btn btn-success"
                          onClick={() => handleComplete(entry.id)}
                          title="Mark Complete"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                      )}
                      {(entry.status === 'WAITING' || entry.status === 'CHECKED_IN' || entry.status === 'CALLED') && (
                        <button
                          className="btn btn-danger"
                          onClick={() => handleSkip(entry.id)}
                          title="Skip"
                        >
                          <i className="fas fa-forward"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Live indicator */}
      <div className="text-center mt-3 text-muted">
        <i className="fas fa-circle text-success me-1" style={{ fontSize: '0.5rem' }}></i>
        Live - Auto-refreshing every 15 seconds
      </div>
    </div>
  );
};

export default QueueManagement;
