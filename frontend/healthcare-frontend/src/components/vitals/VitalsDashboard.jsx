import React, { useState, useEffect, useCallback } from 'react';
import { vitalsService, patientService } from '../../services/api';

const VITAL_RANGES = {
  temperature: { low: 36.1, high: 37.2, criticalLow: 35.0, criticalHigh: 39.0, unit: '\u00B0C' },
  systolic_bp: { low: 90, high: 120, criticalLow: 70, criticalHigh: 180, unit: 'mmHg' },
  diastolic_bp: { low: 60, high: 80, criticalLow: 40, criticalHigh: 120, unit: 'mmHg' },
  pulse_rate: { low: 60, high: 100, criticalLow: 40, criticalHigh: 150, unit: 'bpm' },
  spo2: { low: 95, high: 100, criticalLow: 90, criticalHigh: 100, unit: '%' },
  blood_sugar: { low: 70, high: 140, criticalLow: 50, criticalHigh: 300, unit: 'mg/dL' },
};

const getVitalStatus = (key, value) => {
  const range = VITAL_RANGES[key];
  if (!range || value === null || value === undefined || value === '') return 'secondary';
  const num = parseFloat(value);
  if (isNaN(num)) return 'secondary';
  if (num < range.criticalLow || num > range.criticalHigh) return 'danger';
  if (num < range.low || num > range.high) return 'warning';
  return 'success';
};

const VitalsDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [latestVitals, setLatestVitals] = useState(null);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    patient: '',
    temperature: '',
    systolic_bp: '',
    diastolic_bp: '',
    pulse_rate: '',
    respiratory_rate: '',
    spo2: '',
    weight: '',
    height: '',
    blood_sugar: '',
    notes: '',
  });

  const fetchPatients = useCallback(async () => {
    try {
      const params = {};
      if (patientSearch) params.search = patientSearch;
      const response = await patientService.getAll(params);
      setPatients(response.data || []);
    } catch {
      // Patients fetch is non-critical
    }
  }, [patientSearch]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const fetchVitals = useCallback(async () => {
    if (!selectedPatient) {
      setLatestVitals(null);
      setVitalsHistory([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [latestRes, historyRes] = await Promise.all([
        vitalsService.getLatestByPatient(selectedPatient),
        vitalsService.getHistory(selectedPatient),
      ]);
      setLatestVitals(latestRes.data);
      setVitalsHistory(Array.isArray(historyRes.data) ? historyRes.data : historyRes.data?.results || []);
      setLoading(false);
    } catch (err) {
      setError('Error fetching vitals data');
      setLoading(false);
    }
  }, [selectedPatient]);

  useEffect(() => {
    fetchVitals();
  }, [fetchVitals]);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...formData };
      // Remove empty fields
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') delete payload[key];
      });
      await vitalsService.create(payload);
      setShowForm(false);
      setFormData({
        patient: selectedPatient || '',
        temperature: '',
        systolic_bp: '',
        diastolic_bp: '',
        pulse_rate: '',
        respiratory_rate: '',
        spo2: '',
        weight: '',
        height: '',
        blood_sugar: '',
        notes: '',
      });
      if (selectedPatient) fetchVitals();
      setSubmitting(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error recording vitals');
      setSubmitting(false);
    }
  };

  const openForm = () => {
    setFormData(prev => ({ ...prev, patient: selectedPatient || '' }));
    setShowForm(true);
  };

  const calculateBMI = (weight, height) => {
    if (!weight || !height) return null;
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100; // cm to m
    if (isNaN(w) || isNaN(h) || h === 0) return null;
    return (w / (h * h)).toFixed(1);
  };

  const renderVitalCard = (label, value, unit, statusKey) => {
    const status = getVitalStatus(statusKey, value);
    return (
      <div className="col-md-3 col-sm-6 mb-3" key={label}>
        <div className={`card border-${status} h-100`}>
          <div className="card-body text-center">
            <h6 className="text-muted mb-1">{label}</h6>
            <h3 className={`fw-bold text-${status} mb-0`}>
              {value !== null && value !== undefined && value !== '' ? value : '--'}
            </h3>
            <small className="text-muted">{unit}</small>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-heartbeat me-2"></i>Vitals Dashboard</h2>
        <button className="btn btn-primary" onClick={openForm}>
          <i className="fas fa-plus me-2"></i>Record Vitals
        </button>
      </div>

      {/* Patient Search */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-5">
              <label className="form-label"><i className="fas fa-search me-1"></i>Search Patient</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
            </div>
            <div className="col-md-5">
              <label className="form-label"><i className="fas fa-user me-1"></i>Select Patient</label>
              <select
                className="form-select"
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
              >
                <option value="">-- Select a Patient --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} {p.patient_id ? `(${p.patient_id})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => { setSelectedPatient(''); setPatientSearch(''); }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {loading ? (
        <div className="text-center mt-5"><div className="spinner-border"></div></div>
      ) : selectedPatient ? (
        <>
          {/* Latest Vitals Cards */}
          {latestVitals ? (
            <div className="card shadow-sm mb-4">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="fas fa-clipboard-list me-2"></i>
                  Latest Vitals
                  {latestVitals.recorded_at && (
                    <small className="text-muted ms-2">
                      ({new Date(latestVitals.recorded_at).toLocaleString()})
                    </small>
                  )}
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  {renderVitalCard('Temperature', latestVitals.temperature, '\u00B0C', 'temperature')}
                  {renderVitalCard('Blood Pressure', latestVitals.systolic_bp && latestVitals.diastolic_bp ? `${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}` : null, 'mmHg', 'systolic_bp')}
                  {renderVitalCard('Pulse Rate', latestVitals.pulse_rate, 'bpm', 'pulse_rate')}
                  {renderVitalCard('SpO2', latestVitals.spo2, '%', 'spo2')}
                  {renderVitalCard('Weight', latestVitals.weight, 'kg', null)}
                  {renderVitalCard('Height', latestVitals.height, 'cm', null)}
                  {renderVitalCard('BMI', calculateBMI(latestVitals.weight, latestVitals.height), 'kg/m\u00B2', null)}
                  {renderVitalCard('Blood Sugar', latestVitals.blood_sugar, 'mg/dL', 'blood_sugar')}
                </div>
                {latestVitals.notes && (
                  <div className="mt-3">
                    <strong>Notes:</strong> {latestVitals.notes}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="alert alert-info">
              <i className="fas fa-info-circle me-2"></i>No vitals recorded for this patient yet.
            </div>
          )}

          {/* Vitals History */}
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <h5 className="mb-0"><i className="fas fa-history me-2"></i>Vitals History</h5>
            </div>
            <div className="card-body p-0">
              {vitalsHistory.length === 0 ? (
                <div className="p-3 text-muted text-center">No vitals history available</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Temp</th>
                        <th>BP</th>
                        <th>Pulse</th>
                        <th>SpO2</th>
                        <th>Weight</th>
                        <th>Height</th>
                        <th>BMI</th>
                        <th>Blood Sugar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vitalsHistory.map((v, idx) => (
                        <tr key={v.id || idx}>
                          <td>{v.recorded_at ? new Date(v.recorded_at).toLocaleDateString() : v.date || '--'}</td>
                          <td>
                            <span className={`text-${getVitalStatus('temperature', v.temperature)}`}>
                              {v.temperature || '--'}
                            </span>
                          </td>
                          <td>
                            <span className={`text-${getVitalStatus('systolic_bp', v.systolic_bp)}`}>
                              {v.systolic_bp && v.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : '--'}
                            </span>
                          </td>
                          <td>
                            <span className={`text-${getVitalStatus('pulse_rate', v.pulse_rate)}`}>
                              {v.pulse_rate || '--'}
                            </span>
                          </td>
                          <td>
                            <span className={`text-${getVitalStatus('spo2', v.spo2)}`}>
                              {v.spo2 || '--'}
                            </span>
                          </td>
                          <td>{v.weight || '--'}</td>
                          <td>{v.height || '--'}</td>
                          <td>{calculateBMI(v.weight, v.height) || '--'}</td>
                          <td>
                            <span className={`text-${getVitalStatus('blood_sugar', v.blood_sugar)}`}>
                              {v.blood_sugar || '--'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="alert alert-info">
          <i className="fas fa-info-circle me-2"></i>Please select a patient to view vitals.
        </div>
      )}

      {/* Record Vitals Modal/Form */}
      {showForm && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-plus-circle me-2"></i>Record New Vitals
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowForm(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-12">
                      <label className="form-label">Patient *</label>
                      <select
                        className="form-select"
                        name="patient"
                        value={formData.patient}
                        onChange={handleFormChange}
                        required
                      >
                        <option value="">-- Select Patient --</option>
                        {patients.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.first_name} {p.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Temperature (&deg;C)</label>
                      <input type="number" step="0.1" className="form-control" name="temperature" value={formData.temperature} onChange={handleFormChange} placeholder="e.g. 37.0" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Systolic BP (mmHg)</label>
                      <input type="number" className="form-control" name="systolic_bp" value={formData.systolic_bp} onChange={handleFormChange} placeholder="e.g. 120" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Diastolic BP (mmHg)</label>
                      <input type="number" className="form-control" name="diastolic_bp" value={formData.diastolic_bp} onChange={handleFormChange} placeholder="e.g. 80" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Pulse Rate (bpm)</label>
                      <input type="number" className="form-control" name="pulse_rate" value={formData.pulse_rate} onChange={handleFormChange} placeholder="e.g. 72" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Respiratory Rate</label>
                      <input type="number" className="form-control" name="respiratory_rate" value={formData.respiratory_rate} onChange={handleFormChange} placeholder="e.g. 16" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">SpO2 (%)</label>
                      <input type="number" step="0.1" className="form-control" name="spo2" value={formData.spo2} onChange={handleFormChange} placeholder="e.g. 98" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Weight (kg)</label>
                      <input type="number" step="0.1" className="form-control" name="weight" value={formData.weight} onChange={handleFormChange} placeholder="e.g. 70" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Height (cm)</label>
                      <input type="number" step="0.1" className="form-control" name="height" value={formData.height} onChange={handleFormChange} placeholder="e.g. 170" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Blood Sugar (mg/dL)</label>
                      <input type="number" step="0.1" className="form-control" name="blood_sugar" value={formData.blood_sugar} onChange={handleFormChange} placeholder="e.g. 100" />
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Notes</label>
                      <textarea className="form-control" name="notes" rows="3" value={formData.notes} onChange={handleFormChange} placeholder="Additional observations..."></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                    ) : (
                      <><i className="fas fa-save me-2"></i>Save Vitals</>
                    )}
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

export default VitalsDashboard;
