import React, { useState, useEffect, useCallback } from 'react';
import {
  patientService,
  appointmentService,
  prescriptionService,
  labService,
  vitalsService,
  allergyService,
  treatmentPlanService,
  dischargeService,
} from '../../services/api';
import './PatientPortal.css';

// ==================== Helper Functions ====================
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

const getStatusClass = (status) => {
  if (!status) return 'portal-badge-pending';
  const s = status.toLowerCase().replace(/[\s_]/g, '-');
  return `portal-badge-${s}`;
};

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const getDayAndMonth = (dateStr) => {
  if (!dateStr) return { day: '--', month: '---' };
  const d = new Date(dateStr);
  return {
    day: d.getDate(),
    month: d.toLocaleString('en-IN', { month: 'short' }).toUpperCase(),
  };
};

const isFutureDate = (dateStr) => {
  if (!dateStr) return false;
  return new Date(dateStr) >= new Date(new Date().toDateString());
};

const isWithinDays = (dateStr, days) => {
  if (!dateStr) return false;
  const target = new Date(dateStr);
  const now = new Date();
  const diff = (target - now) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
};

// ==================== Login Screen ====================
function PortalLogin({ onPatientFound }) {
  const [phone, setPhone] = useState('');
  const [apptId, setApptId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showApptSearch, setShowApptSearch] = useState(false);

  const handlePhoneSearch = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await patientService.getAll({ search: phone });
      const patients = result.data;
      if (patients && patients.length > 0) {
        onPatientFound(patients[0]);
      } else {
        setError('No records found for this phone number. Please book an appointment first.');
      }
    } catch (err) {
      setError('Unable to look up records. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleApptSearch = async (e) => {
    e.preventDefault();
    if (!apptId) {
      setError('Please enter your Appointment ID.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await appointmentService.get(apptId);
      const appt = response.data;
      if (appt && appt.patient) {
        const patientId = typeof appt.patient === 'object' ? appt.patient.id : appt.patient;
        const patientResp = await patientService.get(patientId);
        onPatientFound(patientResp.data);
      } else {
        setError('Appointment not found. Please check the ID and try again.');
      }
    } catch (err) {
      setError('Appointment not found. Please check the ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-login-wrapper">
      <div className="portal-login-card">
        <div className="portal-logo">
          <i className="fas fa-hospital"></i>
        </div>
        <h2>BG Hospitals</h2>
        <p className="subtitle">Patient Portal - Access Your Health Records</p>

        {error && <div className="portal-error-msg"><i className="fas fa-exclamation-circle me-2"></i>{error}</div>}

        <form onSubmit={handlePhoneSearch}>
          <div className="phone-input-group">
            <input type="text" className="country-code" value="+91" readOnly />
            <input
              type="tel"
              className="phone-field"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
            />
          </div>
          <button type="submit" className="btn-portal-primary" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-2"></span>Searching...</> : <><i className="fas fa-search me-2"></i>Access My Records</>}
          </button>
        </form>

        <div className="divider">OR</div>

        {!showApptSearch ? (
          <button className="btn-portal-secondary" onClick={() => setShowApptSearch(true)}>
            <i className="fas fa-ticket-alt me-2"></i>Enter your Appointment ID
          </button>
        ) : (
          <form onSubmit={handleApptSearch}>
            <input
              type="text"
              className="appt-id-input"
              placeholder="Enter Appointment ID"
              value={apptId}
              onChange={(e) => setApptId(e.target.value)}
            />
            <button type="submit" className="btn-portal-secondary" disabled={loading}>
              {loading ? 'Searching...' : 'Find Appointment'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ==================== Tab: My Appointments ====================
function AppointmentsTab({ patientId }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const result = await appointmentService.getAll({ patient: patientId });
        setAppointments(result.data || []);
      } catch { /* empty */ }
      setLoading(false);
    };
    fetch();
  }, [patientId]);

  if (loading) return <div className="portal-loading"><div className="spinner-border spinner-border-sm"></div>Loading appointments...</div>;

  const upcoming = appointments.filter(a => isFutureDate(a.date) && a.status !== 'Cancelled');
  const past = appointments.filter(a => !isFutureDate(a.date) || a.status === 'Cancelled');

  const renderCard = (appt) => {
    const { day, month } = getDayAndMonth(appt.date);
    const doctorName = appt.doctor_name || (typeof appt.doctor === 'object' ? appt.doctor?.name : '') || 'Doctor';
    const department = appt.department_name || appt.department || '';
    return (
      <div className="portal-card" key={appt.id}>
        <div className="portal-appointment-card">
          <div className="portal-appt-date-block">
            <div className="day">{day}</div>
            <div className="month">{month}</div>
          </div>
          <div className="portal-appt-details">
            <div className="doctor-name"><i className="fas fa-user-md me-1"></i>{doctorName}</div>
            {department && <div className="department">{department}</div>}
            {appt.time && <div className="time-slot"><i className="fas fa-clock me-1"></i>{formatTime(appt.time)}</div>}
          </div>
          <div className="portal-appt-actions">
            <span className={`portal-badge ${getStatusClass(appt.status)}`}>{appt.status || 'Scheduled'}</span>
            {appt.token_number && <span className="portal-token">Token #{appt.token_number}</span>}
            {appt.status === 'Completed' && (
              <a href="/appointments/add" className="portal-btn-followup"><i className="fas fa-redo-alt"></i> Book Follow-up</a>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {upcoming.length > 0 && (
        <>
          <div className="portal-section-title"><i className="fas fa-calendar-check"></i>Upcoming Appointments</div>
          {upcoming.map(renderCard)}
        </>
      )}
      {past.length > 0 && (
        <>
          <div className="portal-section-title mt-4"><i className="fas fa-history"></i>Past Appointments</div>
          {past.map(renderCard)}
        </>
      )}
      {appointments.length === 0 && (
        <div className="portal-empty-state">
          <i className="fas fa-calendar-times d-block"></i>
          <p>No appointments found.</p>
        </div>
      )}
    </div>
  );
}

// ==================== Tab: Prescriptions ====================
function PrescriptionsTab({ patientId }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const resp = await prescriptionService.getByPatient(patientId);
        const data = resp.data?.results || resp.data || [];
        setPrescriptions(Array.isArray(data) ? data : []);
      } catch { /* empty */ }
      setLoading(false);
    };
    fetch();
  }, [patientId]);

  const handleDownload = async (id) => {
    try {
      const resp = await prescriptionService.downloadPdf(id);
      downloadBlob(resp.data, `prescription_${id}.pdf`);
    } catch {
      alert('Unable to download PDF. Please try again.');
    }
  };

  const isMedicineActive = (prescription) => {
    if (!prescription.created_at && !prescription.date) return false;
    const startDate = new Date(prescription.created_at || prescription.date);
    const now = new Date();
    const maxDays = (prescription.medicines || prescription.items || []).reduce((max, m) => {
      const dur = parseInt(m.duration, 10) || 0;
      return dur > max ? dur : max;
    }, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + maxDays);
    return now <= endDate;
  };

  if (loading) return <div className="portal-loading"><div className="spinner-border spinner-border-sm"></div>Loading prescriptions...</div>;
  if (prescriptions.length === 0) return <div className="portal-empty-state"><i className="fas fa-prescription d-block"></i><p>No prescriptions found.</p></div>;

  return (
    <div>
      {prescriptions.map(rx => {
        const medicines = rx.medicines || rx.items || rx.prescription_items || [];
        const active = isMedicineActive(rx);
        return (
          <div className="portal-card" key={rx.id}>
            <div className="portal-card-header">
              <div>
                <div className="portal-card-title">
                  {active && <span className="portal-badge portal-badge-active me-2">Active</span>}
                  Prescription #{rx.id}
                </div>
                <div className="portal-card-subtitle">
                  <i className="fas fa-calendar me-1"></i>{formatDate(rx.created_at || rx.date)}
                  {(rx.doctor_name || rx.doctor?.name) && <> &bull; <i className="fas fa-user-md me-1"></i>{rx.doctor_name || rx.doctor?.name}</>}
                </div>
              </div>
              <button className="portal-btn-download" onClick={() => handleDownload(rx.id)}>
                <i className="fas fa-file-pdf"></i> Download PDF
              </button>
            </div>
            {rx.diagnosis && <div className="mb-2"><strong>Diagnosis:</strong> {rx.diagnosis}</div>}
            {medicines.length > 0 && (
              <ul className="portal-medicine-list">
                {medicines.map((med, idx) => (
                  <li key={idx} className={`portal-medicine-item ${active ? 'active-medicine' : ''}`}>
                    <div>
                      <div className="medicine-name">{med.medicine_name || med.name || med.medicine}</div>
                      <div className="medicine-dosage">
                        {med.dosage && <>{med.dosage}</>}
                        {med.frequency && <> &bull; {med.frequency}</>}
                        {med.duration && <> &bull; {med.duration} days</>}
                      </div>
                    </div>
                    {med.instructions && <small className="text-muted">{med.instructions}</small>}
                  </li>
                ))}
              </ul>
            )}
            {rx.follow_up_date && (
              <div className="mt-2 text-muted">
                <i className="fas fa-calendar-check me-1"></i>Follow-up: {formatDate(rx.follow_up_date)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ==================== Tab: Lab Reports ====================
function LabReportsTab({ patientId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const fetch = async () => {
      try {
        const resp = await labService.getOrdersByPatient(patientId);
        const data = resp.data?.results || resp.data || [];
        setOrders(Array.isArray(data) ? data : []);
      } catch { /* empty */ }
      setLoading(false);
    };
    fetch();
  }, [patientId]);

  const handleDownload = async (id) => {
    try {
      const resp = await labService.downloadPdf(id);
      downloadBlob(resp.data, `lab_report_${id}.pdf`);
    } catch {
      alert('Unable to download report. Please try again.');
    }
  };

  if (loading) return <div className="portal-loading"><div className="spinner-border spinner-border-sm"></div>Loading lab reports...</div>;
  if (orders.length === 0) return <div className="portal-empty-state"><i className="fas fa-flask d-block"></i><p>No lab reports found.</p></div>;

  const filtered = filter === 'All' ? orders : orders.filter(o => o.status === filter);

  return (
    <div>
      <div className="portal-filter-bar">
        {['All', 'Pending', 'Sample Collected', 'Completed'].map(f => (
          <button key={f} className={`portal-filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      {filtered.map(order => {
        const tests = order.tests || order.test_items || order.lab_tests || [];
        const results = order.results || order.test_results || [];
        return (
          <div className="portal-card" key={order.id}>
            <div className="portal-card-header">
              <div>
                <div className="portal-card-title">Order #{order.order_number || order.id}</div>
                <div className="portal-card-subtitle">
                  <i className="fas fa-calendar me-1"></i>{formatDate(order.created_at || order.date || order.ordered_date)}
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className={`portal-badge ${getStatusClass(order.status)}`}>{order.status || 'Pending'}</span>
                {(order.status === 'Completed' || order.status === 'completed') && (
                  <button className="portal-btn-download" onClick={() => handleDownload(order.id)}>
                    <i className="fas fa-file-pdf"></i> Download
                  </button>
                )}
              </div>
            </div>
            {tests.length > 0 && (
              <div className="mb-2">
                <strong>Tests: </strong>
                {tests.map((t, i) => (
                  <span key={i} className="portal-badge portal-badge-pending me-1">{t.test_name || t.name || t}</span>
                ))}
              </div>
            )}
            {results.length > 0 && (
              <div className="table-responsive mt-2">
                <table className="portal-lab-results-table">
                  <thead>
                    <tr><th>Test</th><th>Value</th><th>Unit</th><th>Normal Range</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i}>
                        <td>{r.test_name || r.name || r.parameter}</td>
                        <td className={r.is_abnormal ? 'portal-abnormal' : ''}>{r.value || r.result}</td>
                        <td>{r.unit || ''}</td>
                        <td>{r.normal_range || r.reference_range || '-'}</td>
                        <td>{r.is_abnormal ? <span className="portal-abnormal">Abnormal</span> : <span className="text-success fw-bold">Normal</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
      {filtered.length === 0 && (
        <div className="portal-empty-state"><p>No {filter.toLowerCase()} lab orders.</p></div>
      )}
    </div>
  );
}

// ==================== Tab: Vitals & Health ====================
function VitalsTab({ patientId }) {
  const [vitals, setVitals] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [vitalsResp, allergyResp, tpResp] = await Promise.allSettled([
          vitalsService.getHistory(patientId),
          allergyService.getByPatient(patientId),
          treatmentPlanService.getByPatient(patientId),
        ]);
        if (vitalsResp.status === 'fulfilled') {
          const d = vitalsResp.value.data?.results || vitalsResp.value.data || [];
          setVitals(Array.isArray(d) ? d : []);
        }
        if (allergyResp.status === 'fulfilled') {
          const d = allergyResp.value.data?.results || allergyResp.value.data || [];
          setAllergies(Array.isArray(d) ? d : []);
        }
        if (tpResp.status === 'fulfilled') {
          const d = tpResp.value.data?.results || tpResp.value.data || [];
          setTreatmentPlans(Array.isArray(d) ? d : []);
        }
      } catch { /* empty */ }
      setLoading(false);
    };
    fetchAll();
  }, [patientId]);

  if (loading) return <div className="portal-loading"><div className="spinner-border spinner-border-sm"></div>Loading health data...</div>;

  const latest = vitals.length > 0 ? vitals[0] : null;
  const history = vitals.slice(0, 5);

  const vitalItems = latest ? [
    { icon: 'fa-thermometer-half', label: 'Temperature', value: latest.temperature ? `${latest.temperature}\u00B0F` : '-' },
    { icon: 'fa-heartbeat', label: 'Blood Pressure', value: latest.blood_pressure || (latest.systolic_bp ? `${latest.systolic_bp}/${latest.diastolic_bp}` : '-') },
    { icon: 'fa-heart', label: 'Pulse', value: latest.pulse_rate || latest.pulse ? `${latest.pulse_rate || latest.pulse} bpm` : '-' },
    { icon: 'fa-lungs', label: 'O2 Saturation', value: latest.oxygen_saturation || latest.spo2 ? `${latest.oxygen_saturation || latest.spo2}%` : '-' },
    { icon: 'fa-weight', label: 'Weight', value: latest.weight ? `${latest.weight} kg` : '-' },
    { icon: 'fa-calculator', label: 'BMI', value: latest.bmi || '-' },
    { icon: 'fa-tint', label: 'Blood Sugar', value: latest.blood_sugar || latest.blood_glucose ? `${latest.blood_sugar || latest.blood_glucose} mg/dL` : '-' },
  ] : [];

  return (
    <div>
      {/* Latest Vitals */}
      <div className="portal-section-title"><i className="fas fa-heartbeat"></i>Latest Vitals</div>
      {latest ? (
        <>
          <div className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
            Recorded on {formatDate(latest.recorded_at || latest.created_at || latest.date)}
          </div>
          <div className="portal-vitals-grid">
            {vitalItems.map((v, i) => (
              <div className="portal-vital-item" key={i}>
                <div className="vital-icon"><i className={`fas ${v.icon}`}></i></div>
                <div className="vital-value">{v.value}</div>
                <div className="vital-label">{v.label}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="portal-empty-state"><p>No vitals recorded yet.</p></div>
      )}

      {/* Vitals History */}
      {history.length > 1 && (
        <>
          <div className="portal-section-title mt-4"><i className="fas fa-chart-line"></i>Vitals History (Last {history.length} Readings)</div>
          <div className="portal-card" style={{ overflowX: 'auto' }}>
            <table className="portal-vitals-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Temp</th>
                  <th>BP</th>
                  <th>Pulse</th>
                  <th>O2</th>
                  <th>Weight</th>
                </tr>
              </thead>
              <tbody>
                {history.map((v, i) => (
                  <tr key={i}>
                    <td>{formatDate(v.recorded_at || v.created_at || v.date)}</td>
                    <td>{v.temperature ? `${v.temperature}\u00B0` : '-'}</td>
                    <td>{v.blood_pressure || (v.systolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : '-')}</td>
                    <td>{v.pulse_rate || v.pulse || '-'}</td>
                    <td>{v.oxygen_saturation || v.spo2 ? `${v.oxygen_saturation || v.spo2}%` : '-'}</td>
                    <td>{v.weight ? `${v.weight} kg` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Allergies */}
      <div className="portal-section-title mt-4"><i className="fas fa-allergies"></i>Allergies</div>
      {allergies.length > 0 ? (
        <div className="portal-card">
          {allergies.map((a, i) => (
            <span className="portal-allergy-chip" key={i}>
              <i className="fas fa-exclamation-triangle"></i>
              {a.allergen || a.name || a.allergy_name}
              {a.severity && <small className="ms-1">({a.severity})</small>}
            </span>
          ))}
        </div>
      ) : (
        <div className="portal-empty-state"><p>No allergies recorded.</p></div>
      )}

      {/* Treatment Plans */}
      <div className="portal-section-title mt-4"><i className="fas fa-clipboard-list"></i>Active Treatment Plans</div>
      {treatmentPlans.length > 0 ? (
        treatmentPlans.map(tp => (
          <div className="portal-card portal-treatment-card" key={tp.id}>
            <div className="portal-card-title">{tp.title || tp.plan_name || `Treatment Plan #${tp.id}`}</div>
            <div className="portal-card-subtitle mb-2">
              {tp.doctor_name && <><i className="fas fa-user-md me-1"></i>{tp.doctor_name} &bull; </>}
              {formatDate(tp.start_date || tp.created_at)}
              {tp.end_date && <> to {formatDate(tp.end_date)}</>}
            </div>
            {tp.description && <p className="mb-1" style={{ fontSize: '0.9rem' }}>{tp.description}</p>}
            {tp.goals && <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}><strong>Goals:</strong> {tp.goals}</p>}
            {tp.status && <span className={`portal-badge ${getStatusClass(tp.status)} mt-2`}>{tp.status}</span>}
          </div>
        ))
      ) : (
        <div className="portal-empty-state"><p>No active treatment plans.</p></div>
      )}
    </div>
  );
}

// ==================== Tab: Discharge & Follow-ups ====================
function DischargeTab({ patientId }) {
  const [summaries, setSummaries] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sumResp, fuResp] = await Promise.allSettled([
          dischargeService.getByPatient(patientId),
          dischargeService.getFollowUps({ patient: patientId }),
        ]);
        if (sumResp.status === 'fulfilled') {
          const d = sumResp.value.data?.results || sumResp.value.data || [];
          setSummaries(Array.isArray(d) ? d : []);
        }
        if (fuResp.status === 'fulfilled') {
          const d = fuResp.value.data || [];
          setFollowUps(Array.isArray(d) ? d : []);
        }
      } catch { /* empty */ }
      setLoading(false);
    };
    fetchAll();
  }, [patientId]);

  const handleDownload = async (id) => {
    try {
      const resp = await dischargeService.downloadPdf(id);
      downloadBlob(resp.data, `discharge_summary_${id}.pdf`);
    } catch {
      alert('Unable to download summary. Please try again.');
    }
  };

  if (loading) return <div className="portal-loading"><div className="spinner-border spinner-border-sm"></div>Loading discharge records...</div>;

  // Find next upcoming follow-up
  const upcomingFollowUps = followUps.filter(f => isFutureDate(f.date || f.follow_up_date));
  const nextCheckup = upcomingFollowUps.length > 0 ? upcomingFollowUps[0] : null;

  return (
    <div>
      {/* Next Checkup */}
      {nextCheckup && (
        <div className="portal-next-checkup">
          <div className="checkup-label">Next Follow-up Checkup</div>
          <div className="checkup-date">
            <i className="fas fa-calendar-check me-2"></i>
            {formatDate(nextCheckup.date || nextCheckup.follow_up_date)}
          </div>
          {nextCheckup.doctor_name && <div className="text-muted mt-1">with Dr. {nextCheckup.doctor_name}</div>}
        </div>
      )}

      {/* Discharge Summaries */}
      <div className="portal-section-title"><i className="fas fa-file-medical-alt"></i>Discharge Summaries</div>
      {summaries.length > 0 ? summaries.map(ds => (
        <div className="portal-card portal-discharge-card" key={ds.id}>
          <div className="portal-card-header">
            <div className="portal-card-title">Discharge Summary #{ds.id}</div>
            <button className="portal-btn-download" onClick={() => handleDownload(ds.id)}>
              <i className="fas fa-file-pdf"></i> Download Summary
            </button>
          </div>
          <div className="portal-discharge-meta">
            <div className="portal-discharge-meta-item">
              <div className="meta-label">Admission Date</div>
              <div className="meta-value">{formatDate(ds.admission_date)}</div>
            </div>
            <div className="portal-discharge-meta-item">
              <div className="meta-label">Discharge Date</div>
              <div className="meta-value">{formatDate(ds.discharge_date)}</div>
            </div>
            {ds.diagnosis && (
              <div className="portal-discharge-meta-item">
                <div className="meta-label">Diagnosis</div>
                <div className="meta-value">{ds.diagnosis}</div>
              </div>
            )}
            {ds.follow_up_date && (
              <div className="portal-discharge-meta-item">
                <div className="meta-label">Follow-up Date</div>
                <div className="meta-value">{formatDate(ds.follow_up_date)}</div>
              </div>
            )}
          </div>
          {ds.medications_on_discharge && (
            <div className="mt-2"><strong>Medications on Discharge:</strong><p className="mb-1" style={{ fontSize: '0.9rem' }}>{ds.medications_on_discharge}</p></div>
          )}
          {ds.dietary_instructions && (
            <div className="mt-2"><strong>Dietary Instructions:</strong><p className="mb-1" style={{ fontSize: '0.9rem' }}>{ds.dietary_instructions}</p></div>
          )}
          {ds.instructions && (
            <div className="mt-2"><strong>Instructions:</strong><p className="mb-0" style={{ fontSize: '0.9rem' }}>{ds.instructions}</p></div>
          )}
        </div>
      )) : (
        <div className="portal-empty-state"><i className="fas fa-file-medical d-block"></i><p>No discharge summaries found.</p></div>
      )}

      {/* Follow-ups */}
      {followUps.length > 0 && (
        <>
          <div className="portal-section-title mt-4"><i className="fas fa-calendar-alt"></i>Follow-up Schedule</div>
          {followUps.map((fu, i) => {
            const fuDate = fu.date || fu.follow_up_date;
            const fuStatus = fu.status || (isFutureDate(fuDate) ? 'Scheduled' : 'Completed');
            return (
              <div className="portal-followup-card" key={i}>
                <div className="followup-date">
                  <i className="fas fa-calendar-day me-2"></i>{formatDate(fuDate)}
                </div>
                <div className="followup-details">
                  {fu.doctor_name && <div><strong>Dr. {fu.doctor_name}</strong></div>}
                  {fu.notes && <div className="text-muted" style={{ fontSize: '0.85rem' }}>{fu.notes}</div>}
                </div>
                <span className={`portal-badge ${getStatusClass(fuStatus)}`}>{fuStatus}</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ==================== Tab: My Profile ====================
function ProfileTab({ patient }) {
  return (
    <div>
      <div className="portal-section-title"><i className="fas fa-user"></i>Personal Information</div>
      <div className="portal-card">
        <div className="portal-profile-grid">
          <div className="portal-profile-item">
            <div className="profile-label">Full Name</div>
            <div className="profile-value">{patient.first_name} {patient.last_name}</div>
          </div>
          <div className="portal-profile-item">
            <div className="profile-label">Date of Birth</div>
            <div className="profile-value">{formatDate(patient.date_of_birth || patient.dob)}</div>
          </div>
          <div className="portal-profile-item">
            <div className="profile-label">Gender</div>
            <div className="profile-value">{patient.gender || '-'}</div>
          </div>
          <div className="portal-profile-item">
            <div className="profile-label">Blood Group</div>
            <div className="profile-value">{patient.blood_group || patient.blood_type || '-'}</div>
          </div>
          <div className="portal-profile-item">
            <div className="profile-label">Phone</div>
            <div className="profile-value">{patient.phone || patient.phone_number || patient.contact_number || '-'}</div>
          </div>
          <div className="portal-profile-item">
            <div className="profile-label">Email</div>
            <div className="profile-value">{patient.email || '-'}</div>
          </div>
          <div className="portal-profile-item">
            <div className="profile-label">Address</div>
            <div className="profile-value">{patient.address || '-'}</div>
          </div>
          {patient.patient_id && (
            <div className="portal-profile-item">
              <div className="profile-label">Patient ID</div>
              <div className="profile-value">{patient.patient_id}</div>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Contact */}
      {(patient.emergency_contact_name || patient.emergency_contact) && (
        <>
          <div className="portal-section-title mt-4"><i className="fas fa-phone-alt"></i>Emergency Contact</div>
          <div className="portal-card">
            <div className="portal-profile-grid">
              <div className="portal-profile-item">
                <div className="profile-label">Contact Name</div>
                <div className="profile-value">{patient.emergency_contact_name || patient.emergency_contact?.name || '-'}</div>
              </div>
              <div className="portal-profile-item">
                <div className="profile-label">Contact Phone</div>
                <div className="profile-value">{patient.emergency_contact_phone || patient.emergency_contact_number || patient.emergency_contact?.phone || '-'}</div>
              </div>
              <div className="portal-profile-item">
                <div className="profile-label">Relationship</div>
                <div className="profile-value">{patient.emergency_contact_relationship || patient.emergency_contact?.relationship || '-'}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ==================== Main PatientPortal Component ====================
const TABS = [
  { id: 'appointments', label: 'My Appointments', icon: 'fa-calendar-alt' },
  { id: 'prescriptions', label: 'Prescriptions', icon: 'fa-prescription-bottle-alt' },
  { id: 'lab', label: 'Lab Reports', icon: 'fa-flask' },
  { id: 'vitals', label: 'Vitals & Health', icon: 'fa-heartbeat' },
  { id: 'discharge', label: 'Discharge', icon: 'fa-file-medical-alt' },
  { id: 'profile', label: 'My Profile', icon: 'fa-user' },
];

export default function PatientPortal() {
  const [patient, setPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('appointments');
  const [quickStats, setQuickStats] = useState({ totalVisits: 0, nextAppt: null, pendingReports: 0 });
  const [upcomingNotifications, setUpcomingNotifications] = useState([]);

  const loadQuickStats = useCallback(async (patientId) => {
    try {
      const [apptResult, labResp] = await Promise.allSettled([
        appointmentService.getAll({ patient: patientId }),
        labService.getOrdersByPatient(patientId),
      ]);

      let totalVisits = 0;
      let nextAppt = null;
      let upcoming3Days = [];

      if (apptResult.status === 'fulfilled') {
        const appts = apptResult.value.data || [];
        totalVisits = appts.length;
        const futureAppts = appts
          .filter(a => isFutureDate(a.date) && a.status !== 'Cancelled')
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        if (futureAppts.length > 0) {
          nextAppt = formatDate(futureAppts[0].date);
        }
        upcoming3Days = futureAppts.filter(a => isWithinDays(a.date, 3));
      }

      let pendingReports = 0;
      if (labResp.status === 'fulfilled') {
        const labs = labResp.value.data?.results || labResp.value.data || [];
        if (Array.isArray(labs)) {
          pendingReports = labs.filter(l => l.status && l.status !== 'Completed' && l.status !== 'completed').length;
        }
      }

      setQuickStats({ totalVisits, nextAppt, pendingReports });
      setUpcomingNotifications(upcoming3Days);
    } catch { /* empty */ }
  }, []);

  const handlePatientFound = (p) => {
    setPatient(p);
    loadQuickStats(p.id);
  };

  const handleLogout = () => {
    setPatient(null);
    setActiveTab('appointments');
    setQuickStats({ totalVisits: 0, nextAppt: null, pendingReports: 0 });
    setUpcomingNotifications([]);
  };

  if (!patient) {
    return <PortalLogin onPatientFound={handlePatientFound} />;
  }

  const patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient';
  const initials = `${(patient.first_name || 'P')[0]}${(patient.last_name || '')[0] || ''}`.toUpperCase();
  const bloodGroup = patient.blood_group || patient.blood_type || '';

  const renderTabContent = () => {
    switch (activeTab) {
      case 'appointments': return <AppointmentsTab patientId={patient.id} />;
      case 'prescriptions': return <PrescriptionsTab patientId={patient.id} />;
      case 'lab': return <LabReportsTab patientId={patient.id} />;
      case 'vitals': return <VitalsTab patientId={patient.id} />;
      case 'discharge': return <DischargeTab patientId={patient.id} />;
      case 'profile': return <ProfileTab patient={patient} />;
      default: return <AppointmentsTab patientId={patient.id} />;
    }
  };

  return (
    <div className="portal-main-wrapper">
      {/* Header */}
      <div className="portal-header">
        <div className="container">
          <div className="portal-header-inner">
            <div className="portal-patient-info">
              <div className="portal-avatar">{initials}</div>
              <div>
                <h4 className="portal-patient-name">{patientName}</h4>
                <div className="portal-patient-meta">
                  {patient.patient_id && <span>ID: {patient.patient_id}</span>}
                  {bloodGroup && <span className="portal-blood-badge"><i className="fas fa-tint me-1"></i>{bloodGroup}</span>}
                  {patient.phone && <span><i className="fas fa-phone me-1"></i>{patient.phone}</span>}
                </div>
              </div>
            </div>

            <div className="portal-quick-stats">
              <div className="portal-stat-item">
                <span className="stat-value">{quickStats.totalVisits}</span>
                <span className="stat-label">Total Visits</span>
              </div>
              <div className="portal-stat-item">
                <span className="stat-value">{quickStats.nextAppt || '-'}</span>
                <span className="stat-label">Next Appt</span>
              </div>
              <div className="portal-stat-item">
                <span className="stat-value">{quickStats.pendingReports}</span>
                <span className="stat-label">Pending Reports</span>
              </div>
            </div>

            <div className="portal-header-actions">
              <a href="/appointments/add" className="btn btn-light btn-sm">
                <i className="fas fa-plus me-1"></i>Book Appointment
              </a>
              <button className="portal-logout-btn" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt me-1"></i>Exit Portal
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container portal-tabs-container">
        {/* Upcoming Appointment Notifications */}
        {upcomingNotifications.length > 0 && (
          <div className="portal-notification-badge">
            <i className="fas fa-bell"></i>
            <span>
              You have {upcomingNotifications.length} upcoming appointment{upcomingNotifications.length > 1 ? 's' : ''} in the next 3 days.
              {upcomingNotifications[0] && (
                <> Next: {formatDate(upcomingNotifications[0].date)} {upcomingNotifications[0].time ? `at ${formatTime(upcomingNotifications[0].time)}` : ''} with {upcomingNotifications[0].doctor_name || 'your doctor'}.</>
              )}
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="portal-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`portal-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={`fas ${tab.icon}`}></i>
              <span className="tab-text">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
}
