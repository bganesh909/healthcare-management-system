import React, { useState, useEffect, useCallback, useRef } from 'react';
import { appointmentService } from '../../services/api';

const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
};

const todayStr = () => {
  const d = new Date();
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};

const WORKFLOW_STEPS = [
  { key: 'checked_in', label: 'Patient Arrival', icon: 'fa-user-check' },
  { key: 'vitals_recorded', label: 'Record Vitals', icon: 'fa-heartbeat' },
  { key: 'payment_collected', label: 'Collect Fee', icon: 'fa-credit-card' },
  { key: 'photo_uploaded', label: 'Patient Photo', icon: 'fa-camera' },
];

const StaffCheckIn = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [workflowStatuses, setWorkflowStatuses] = useState({});
  const [successMsg, setSuccessMsg] = useState(null);

  // Vitals form state
  const [vitalsForm, setVitalsForm] = useState({});
  // Payment form state
  const [paymentForm, setPaymentForm] = useState({});
  // Photo state
  const [photoPreview, setPhotoPreview] = useState({});
  const fileInputRefs = useRef({});

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await appointmentService.getToday();
      setAppointments(response.data || []);
      // Fetch workflow status for each appointment
      const statuses = {};
      for (const appt of (response.data || [])) {
        try {
          const statusRes = await appointmentService.getWorkflowStatus(appt.id);
          statuses[appt.id] = statusRes.data || {};
        } catch {
          statuses[appt.id] = {};
        }
      }
      setWorkflowStatuses(statuses);
    } catch {
      setError('Failed to load today\'s appointments.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const getStepStatus = (apptId, stepKey) => {
    const ws = workflowStatuses[apptId] || {};
    return !!ws[stepKey];
  };

  const getCompletedStepCount = (apptId) => {
    return WORKFLOW_STEPS.filter(s => getStepStatus(apptId, s.key)).length;
  };

  const isAllComplete = (apptId) => getCompletedStepCount(apptId) === WORKFLOW_STEPS.length;

  const getCurrentStep = (apptId) => {
    for (let i = 0; i < WORKFLOW_STEPS.length; i++) {
      if (!getStepStatus(apptId, WORKFLOW_STEPS[i].key)) return i;
    }
    return WORKFLOW_STEPS.length;
  };

  const getPatientStatus = (apptId) => {
    const completed = getCompletedStepCount(apptId);
    if (completed === 0) return 'pending';
    if (completed === WORKFLOW_STEPS.length) return 'ready';
    return 'checked_in';
  };

  const filteredAppointments = appointments.filter(appt => {
    if (filter === 'all') return true;
    const status = getPatientStatus(appt.id);
    return status === filter;
  });

  const filterCounts = {
    all: appointments.length,
    pending: appointments.filter(a => getPatientStatus(a.id) === 'pending').length,
    checked_in: appointments.filter(a => getPatientStatus(a.id) === 'checked_in').length,
    ready: appointments.filter(a => getPatientStatus(a.id) === 'ready').length,
  };

  // --- Action handlers ---

  const handleCheckIn = async (apptId) => {
    setActionLoading(apptId);
    try {
      await appointmentService.checkIn(apptId);
      setWorkflowStatuses(prev => ({
        ...prev,
        [apptId]: { ...prev[apptId], checked_in: true },
      }));
      setSuccessMsg('Patient checked in successfully.');
    } catch {
      setError('Check-in failed.');
    }
    setActionLoading(null);
  };

  const handleVitalsChange = (apptId, field, value) => {
    setVitalsForm(prev => ({
      ...prev,
      [apptId]: { ...(prev[apptId] || {}), [field]: value },
    }));
  };

  const handleVitalsSubmit = async (apptId) => {
    const data = vitalsForm[apptId] || {};
    if (!data.bp_systolic || !data.bp_diastolic || !data.height || !data.weight) {
      setError('Please fill all required vitals fields (BP Systolic, BP Diastolic, Height, Weight).');
      return;
    }
    setActionLoading(apptId);
    try {
      await appointmentService.recordVitals(apptId, data);
      setWorkflowStatuses(prev => ({
        ...prev,
        [apptId]: { ...prev[apptId], vitals_recorded: true },
      }));
      setSuccessMsg('Vitals recorded successfully.');
    } catch {
      setError('Failed to record vitals.');
    }
    setActionLoading(null);
  };

  const handlePaymentChange = (apptId, field, value) => {
    setPaymentForm(prev => ({
      ...prev,
      [apptId]: { ...(prev[apptId] || {}), [field]: value },
    }));
  };

  const handlePaymentSubmit = async (apptId) => {
    const data = paymentForm[apptId] || {};
    if (!data.payment_method) {
      setError('Please select a payment method.');
      return;
    }
    setActionLoading(apptId);
    try {
      await appointmentService.recordPayment(apptId, data);
      setWorkflowStatuses(prev => ({
        ...prev,
        [apptId]: { ...prev[apptId], payment_collected: true },
      }));
      setSuccessMsg('Payment recorded successfully.');
    } catch {
      setError('Failed to record payment.');
    }
    setActionLoading(null);
  };

  const handlePhotoUpload = (apptId, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(prev => ({ ...prev, [apptId]: reader.result }));
        setWorkflowStatuses(prev => ({
          ...prev,
          [apptId]: { ...prev[apptId], photo_uploaded: true },
        }));
        setSuccessMsg('Photo uploaded successfully.');
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = (apptId) => {
    if (fileInputRefs.current[apptId]) {
      fileInputRefs.current[apptId].click();
    }
  };

  // --- Render helpers ---

  const renderStepIndicator = (apptId) => {
    const currentStep = getCurrentStep(apptId);
    return (
      <div className="d-flex align-items-center mb-3">
        {WORKFLOW_STEPS.map((step, idx) => {
          const completed = getStepStatus(apptId, step.key);
          const isCurrent = idx === currentStep;
          let bgColor = '#dee2e6'; // gray for pending
          let textColor = '#6c757d';
          if (completed) {
            bgColor = '#198754'; // green for completed
            textColor = '#fff';
          } else if (isCurrent) {
            bgColor = '#0d6efd'; // blue for current
            textColor = '#fff';
          }
          return (
            <React.Fragment key={step.key}>
              {idx > 0 && (
                <div
                  style={{
                    flex: 1,
                    height: '3px',
                    backgroundColor: completed ? '#198754' : '#dee2e6',
                  }}
                />
              )}
              <div
                className="d-flex flex-column align-items-center"
                style={{ minWidth: '70px' }}
              >
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle mb-1"
                  style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: bgColor,
                    color: textColor,
                    fontSize: '14px',
                  }}
                >
                  {completed ? (
                    <i className="fas fa-check" />
                  ) : (
                    <i className={`fas ${step.icon}`} />
                  )}
                </div>
                <small
                  className="text-center"
                  style={{
                    fontSize: '11px',
                    color: completed ? '#198754' : isCurrent ? '#0d6efd' : '#6c757d',
                    fontWeight: isCurrent ? 600 : 400,
                  }}
                >
                  {step.label}
                </small>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderVitalsForm = (apptId) => {
    const data = vitalsForm[apptId] || {};
    return (
      <div className="p-3 bg-light rounded">
        <h6 className="mb-3"><i className="fas fa-heartbeat text-danger me-2" />Record Vitals</h6>
        <div className="row g-2">
          <div className="col-md-3">
            <label className="form-label small">BP Systolic <span className="text-danger">*</span></label>
            <input
              type="number"
              className="form-control form-control-sm"
              placeholder="mmHg"
              value={data.bp_systolic || ''}
              onChange={e => handleVitalsChange(apptId, 'bp_systolic', e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small">BP Diastolic <span className="text-danger">*</span></label>
            <input
              type="number"
              className="form-control form-control-sm"
              placeholder="mmHg"
              value={data.bp_diastolic || ''}
              onChange={e => handleVitalsChange(apptId, 'bp_diastolic', e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small">Height (cm) <span className="text-danger">*</span></label>
            <input
              type="number"
              className="form-control form-control-sm"
              placeholder="cm"
              value={data.height || ''}
              onChange={e => handleVitalsChange(apptId, 'height', e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small">Weight (kg) <span className="text-danger">*</span></label>
            <input
              type="number"
              className="form-control form-control-sm"
              placeholder="kg"
              value={data.weight || ''}
              onChange={e => handleVitalsChange(apptId, 'weight', e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small">Temperature</label>
            <input
              type="number"
              step="0.1"
              className="form-control form-control-sm"
              placeholder="°F"
              value={data.temperature || ''}
              onChange={e => handleVitalsChange(apptId, 'temperature', e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small">Pulse Rate</label>
            <input
              type="number"
              className="form-control form-control-sm"
              placeholder="bpm"
              value={data.pulse_rate || ''}
              onChange={e => handleVitalsChange(apptId, 'pulse_rate', e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small">O2 Saturation</label>
            <input
              type="number"
              className="form-control form-control-sm"
              placeholder="%"
              value={data.o2_saturation || ''}
              onChange={e => handleVitalsChange(apptId, 'o2_saturation', e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small">Physical Condition</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Notes"
              value={data.physical_condition || ''}
              onChange={e => handleVitalsChange(apptId, 'physical_condition', e.target.value)}
            />
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm mt-3"
          onClick={() => handleVitalsSubmit(apptId)}
          disabled={actionLoading === apptId}
        >
          {actionLoading === apptId ? (
            <><span className="spinner-border spinner-border-sm me-1" /> Saving...</>
          ) : (
            <><i className="fas fa-save me-1" /> Save Vitals</>
          )}
        </button>
      </div>
    );
  };

  const renderPaymentForm = (apptId, appt) => {
    const data = paymentForm[apptId] || {};
    const consultationFee = appt.doctor_details?.consultation_fee || appt.consultation_fee || 'N/A';
    return (
      <div className="p-3 bg-light rounded">
        <h6 className="mb-3"><i className="fas fa-credit-card text-success me-2" />Collect Fee</h6>
        <div className="row g-2 align-items-end">
          <div className="col-md-3">
            <label className="form-label small">Consultation Fee</label>
            <div className="form-control form-control-sm bg-white">
              <strong className="text-success">
                {consultationFee !== 'N/A' ? `Rs. ${consultationFee}` : consultationFee}
              </strong>
            </div>
          </div>
          <div className="col-md-3">
            <label className="form-label small">Payment Method <span className="text-danger">*</span></label>
            <select
              className="form-select form-select-sm"
              value={data.payment_method || ''}
              onChange={e => handlePaymentChange(apptId, 'payment_method', e.target.value)}
            >
              <option value="">Select...</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small">Receipt Number</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Receipt #"
              value={data.receipt_number || ''}
              onChange={e => handlePaymentChange(apptId, 'receipt_number', e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <button
              className="btn btn-success btn-sm w-100"
              onClick={() => handlePaymentSubmit(apptId)}
              disabled={actionLoading === apptId}
            >
              {actionLoading === apptId ? (
                <><span className="spinner-border spinner-border-sm me-1" /> Processing...</>
              ) : (
                <><i className="fas fa-check me-1" /> Confirm Payment</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPhotoUpload = (apptId) => {
    const preview = photoPreview[apptId];
    return (
      <div className="p-3 bg-light rounded">
        <h6 className="mb-3"><i className="fas fa-camera text-info me-2" />Patient Photo</h6>
        <div className="d-flex align-items-center gap-3">
          <input
            type="file"
            accept="image/*"
            className="d-none"
            ref={el => (fileInputRefs.current[apptId] = el)}
            onChange={e => handlePhotoUpload(apptId, e)}
          />
          <button
            className="btn btn-outline-info btn-sm"
            onClick={() => triggerFileInput(apptId)}
          >
            <i className="fas fa-camera me-1" /> Upload Photo
          </button>
          {preview && (
            <img
              src={preview}
              alt="Patient"
              className="rounded border"
              style={{ width: '80px', height: '80px', objectFit: 'cover' }}
            />
          )}
        </div>
      </div>
    );
  };

  const renderWorkflowContent = (apptId, appt) => {
    const currentStep = getCurrentStep(apptId);
    if (isAllComplete(apptId)) {
      return (
        <div className="alert alert-success d-flex align-items-center mb-0">
          <i className="fas fa-check-circle fa-lg me-2" />
          <strong>Ready for Consultation</strong> — All check-in steps are complete.
        </div>
      );
    }
    switch (currentStep) {
      case 0:
        return (
          <div className="p-3 bg-light rounded text-center">
            <p className="mb-2 text-muted">Patient has not arrived yet.</p>
            <button
              className="btn btn-primary"
              onClick={() => handleCheckIn(apptId)}
              disabled={actionLoading === apptId}
            >
              {actionLoading === apptId ? (
                <><span className="spinner-border spinner-border-sm me-1" /> Checking in...</>
              ) : (
                <><i className="fas fa-user-check me-1" /> Check In Patient</>
              )}
            </button>
          </div>
        );
      case 1:
        return renderVitalsForm(apptId);
      case 2:
        return renderPaymentForm(apptId, appt);
      case 3:
        return renderPhotoUpload(apptId);
      default:
        return null;
    }
  };

  const renderAppointmentCard = (appt) => {
    const isExpanded = expandedCard === appt.id;
    const patientName = appt.patient_details?.name || appt.patient_name || `Patient #${appt.patient}`;
    const doctorName = appt.doctor_details?.name || appt.doctor_name || `Doctor #${appt.doctor}`;
    const tokenNumber = appt.token_number || appt.id;
    const status = getPatientStatus(appt.id);
    const completedCount = getCompletedStepCount(appt.id);

    let statusBadge;
    if (status === 'ready') {
      statusBadge = <span className="badge bg-success">Ready</span>;
    } else if (status === 'checked_in') {
      statusBadge = <span className="badge bg-info text-dark">In Progress ({completedCount}/4)</span>;
    } else {
      statusBadge = <span className="badge bg-secondary">Pending</span>;
    }

    return (
      <div key={appt.id} className="card mb-3 shadow-sm">
        <div
          className="card-header d-flex justify-content-between align-items-center"
          style={{
            cursor: 'pointer',
            backgroundColor: status === 'ready' ? '#d1e7dd' : status === 'checked_in' ? '#cff4fc' : '#f8f9fa',
          }}
          onClick={() => setExpandedCard(isExpanded ? null : appt.id)}
        >
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle bg-primary text-white fw-bold"
              style={{ width: '40px', height: '40px', fontSize: '14px' }}
            >
              {tokenNumber}
            </div>
            <div>
              <h6 className="mb-0">{patientName}</h6>
              <small className="text-muted">
                <i className="fas fa-clock me-1" />{fmtTime(appt.appointment_time || appt.time_slot)}
                <span className="mx-2">|</span>
                <i className="fas fa-user-md me-1" />{doctorName}
              </small>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            {statusBadge}
            <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-muted`} />
          </div>
        </div>
        {isExpanded && (
          <div className="card-body">
            {renderStepIndicator(appt.id)}
            {renderWorkflowContent(appt.id, appt)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">
            <i className="fas fa-clipboard-check text-primary me-2" />
            Patient Check-in Dashboard
          </h3>
          <p className="text-muted mb-0">
            <i className="fas fa-calendar-day me-1" />
            {todayStr()}
          </p>
        </div>
        <button className="btn btn-outline-primary" onClick={fetchAppointments} disabled={loading}>
          <i className="fas fa-sync-alt me-1" /> Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          <i className="fas fa-exclamation-circle me-2" />{error}
          <button type="button" className="btn-close" onClick={() => setError(null)} />
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success alert-dismissible fade show">
          <i className="fas fa-check-circle me-2" />{successMsg}
          <button type="button" className="btn-close" onClick={() => setSuccessMsg(null)} />
        </div>
      )}

      {/* Filter Tabs */}
      <ul className="nav nav-tabs mb-4">
        {[
          { key: 'all', label: 'All' },
          { key: 'pending', label: 'Pending' },
          { key: 'checked_in', label: 'Checked In' },
          { key: 'ready', label: 'Ready' },
        ].map(tab => (
          <li className="nav-item" key={tab.key}>
            <button
              className={`nav-link ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
              <span className="badge bg-secondary ms-2">{filterCounts[tab.key]}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* Content */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">Loading today's appointments...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="text-center py-5">
          <i className="fas fa-calendar-times fa-3x text-muted mb-3" />
          <h5 className="text-muted">No appointments found</h5>
          <p className="text-muted">
            {filter === 'all'
              ? 'There are no appointments scheduled for today.'
              : `No appointments with "${filter.replace('_', ' ')}" status.`}
          </p>
        </div>
      ) : (
        <div>
          {filteredAppointments.map(appt => renderAppointmentCard(appt))}
        </div>
      )}
    </div>
  );
};

export default StaffCheckIn;
