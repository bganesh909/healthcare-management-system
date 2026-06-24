import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  authService,
  appointmentService,
  prescriptionService,
  labService,
  vitalsService,
  allergyService,
  treatmentPlanService,
  billingService,
  dischargeService,
  medicalRecordService,
  notificationService,
} from '../../services/api';
import './UserProfile.css';

// ===== Helpers =====
const fmt = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
};
const dayMonth = (d) => {
  if (!d) return { day: '--', month: '---' };
  const dt = new Date(d);
  return { day: dt.getDate(), month: dt.toLocaleString('en-IN', { month: 'short' }).toUpperCase() };
};
const isFuture = (d) => d && new Date(d) >= new Date(new Date().toDateString());
const statusBadge = (s) => {
  if (!s) return 'badge-pending';
  const key = s.toUpperCase().replace(/[\s_]/g, '-');
  const map = {
    SCHEDULED: 'badge-scheduled', COMPLETED: 'badge-completed', CANCELLED: 'badge-cancelled',
    'NO-SHOW': 'badge-no-show', PENDING: 'badge-pending', ACTIVE: 'badge-active',
    PAID: 'badge-paid', OVERDUE: 'badge-overdue', 'PARTIALLY-PAID': 'badge-partial',
  };
  return map[key] || 'badge-pending';
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

// ===== TABS config =====
const TABS = [
  { id: 'overview', label: 'Overview', icon: 'fa-th-large' },
  { id: 'appointments', label: 'Appointments', icon: 'fa-calendar-alt' },
  { id: 'prescriptions', label: 'Prescriptions', icon: 'fa-prescription-bottle-alt' },
  { id: 'lab', label: 'Lab Reports', icon: 'fa-flask' },
  { id: 'vitals', label: 'Vitals & Health', icon: 'fa-heartbeat' },
  { id: 'billing', label: 'Billing', icon: 'fa-file-invoice-dollar' },
  { id: 'records', label: 'Medical Records', icon: 'fa-notes-medical' },
  { id: 'settings', label: 'Settings', icon: 'fa-cog' },
];

// ============================================================
// OVERVIEW TAB
// ============================================================
function OverviewTab({ user, patientId, doctorId, stats }) {
  return (
    <div>
      {/* Quick Stats */}
      <div className="profile-stats-row">
        <div className="profile-stat-card">
          <div className="profile-stat-icon blue"><i className="fas fa-calendar-check"></i></div>
          <div className="profile-stat-value">{stats.totalAppointments}</div>
          <div className="profile-stat-label">Total Appointments</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-icon green"><i className="fas fa-clock"></i></div>
          <div className="profile-stat-value">{stats.upcomingAppointments}</div>
          <div className="profile-stat-label">Upcoming</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-icon orange"><i className="fas fa-prescription"></i></div>
          <div className="profile-stat-value">{stats.totalPrescriptions}</div>
          <div className="profile-stat-label">Prescriptions</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-icon purple"><i className="fas fa-flask"></i></div>
          <div className="profile-stat-value">{stats.pendingLabOrders}</div>
          <div className="profile-stat-label">Pending Lab</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-icon red"><i className="fas fa-file-invoice-dollar"></i></div>
          <div className="profile-stat-value">{stats.pendingInvoices}</div>
          <div className="profile-stat-label">Pending Bills</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-icon teal"><i className="fas fa-bell"></i></div>
          <div className="profile-stat-value">{stats.unreadNotifications}</div>
          <div className="profile-stat-label">Notifications</div>
        </div>
      </div>

      {/* Next Appointment Alert */}
      {stats.nextAppointment && (
        <div className="profile-alert info">
          <i className="fas fa-info-circle"></i>
          <span>
            <strong>Next Appointment:</strong> {fmt(stats.nextAppointment.appointment_date || stats.nextAppointment.date)}{' '}
            {fmtTime(stats.nextAppointment.appointment_time || stats.nextAppointment.time)}
            {stats.nextAppointment.doctor_name && <> with <strong>{stats.nextAppointment.doctor_name}</strong></>}
          </span>
        </div>
      )}

      {/* Personal Info */}
      <div className="profile-section">
        <div className="profile-section-title">
          <i className="fas fa-user"></i> Personal Information
        </div>
        <div className="profile-info-grid">
          <div className="profile-info-item">
            <div className="profile-info-label">Full Name</div>
            <div className="profile-info-value">{user.first_name} {user.last_name}</div>
          </div>
          <div className="profile-info-item">
            <div className="profile-info-label">Email</div>
            <div className="profile-info-value">{user.email}</div>
          </div>
          <div className="profile-info-item">
            <div className="profile-info-label">Phone</div>
            <div className="profile-info-value">{user.phone_number || 'Not set'}</div>
          </div>
          <div className="profile-info-item">
            <div className="profile-info-label">Role</div>
            <div className="profile-info-value" style={{ textTransform: 'capitalize' }}>{user.role_display || user.role}</div>
          </div>
          <div className="profile-info-item">
            <div className="profile-info-label">Member Since</div>
            <div className="profile-info-value">{fmt(user.date_joined)}</div>
          </div>
          <div className="profile-info-item">
            <div className="profile-info-label">Email Verified</div>
            <div className="profile-info-value">
              {user.email_verified
                ? <span className="text-success"><i className="fas fa-check-circle"></i> Verified</span>
                : <span className="text-warning"><i className="fas fa-exclamation-circle"></i> Not verified</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Appointments */}
      {stats.recentAppointments.length > 0 && (
        <div className="profile-section">
          <div className="profile-section-title">
            <i className="fas fa-history"></i> Recent Appointments
          </div>
          {stats.recentAppointments.slice(0, 3).map(appt => {
            const { day, month } = dayMonth(appt.appointment_date || appt.date);
            const status = (appt.status || 'Scheduled').toUpperCase();
            return (
              <div className={`profile-appt-card ${isFuture(appt.appointment_date || appt.date) ? 'upcoming' : status === 'COMPLETED' ? 'completed' : ''}`} key={appt.id}>
                <div className="profile-appt-date">
                  <div className="day">{day}</div>
                  <div className="month">{month}</div>
                </div>
                <div className="profile-appt-info">
                  <div className="profile-appt-doctor">{appt.doctor_name || 'Doctor'}</div>
                  <div className="profile-appt-detail">
                    {fmtTime(appt.appointment_time || appt.time)}
                    {appt.reason && <> &mdash; {appt.reason}</>}
                  </div>
                </div>
                <div className="profile-appt-status">
                  <span className={`profile-badge ${statusBadge(appt.status)}`}>{appt.status || 'Scheduled'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Actions */}
      <div className="profile-section">
        <div className="profile-section-title"><i className="fas fa-bolt"></i> Quick Actions</div>
        <div className="d-flex flex-wrap gap-2">
          <Link to="/appointments/add" className="btn btn-primary btn-sm">
            <i className="fas fa-plus me-1"></i> Book Appointment
          </Link>
          <Link to="/appointments" className="btn btn-outline-primary btn-sm">
            <i className="fas fa-calendar me-1"></i> View All Appointments
          </Link>
          <Link to="/prescriptions" className="btn btn-outline-secondary btn-sm">
            <i className="fas fa-prescription me-1"></i> Prescriptions
          </Link>
          <Link to="/notifications" className="btn btn-outline-info btn-sm">
            <i className="fas fa-bell me-1"></i> Notifications
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// APPOINTMENTS TAB
// ============================================================
function AppointmentsTab({ patientId, doctorId, userRole }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const params = {};
        if (userRole === 'patient' && patientId) params.patient = patientId;
        if (userRole === 'doctor' && doctorId) params.doctor = doctorId;
        const result = await appointmentService.getAll(params);
        setAppointments(result.data || []);
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, [patientId, doctorId, userRole]);

  if (loading) return <div className="profile-loading"><div className="spinner-border spinner-border-sm me-2"></div>Loading appointments...</div>;

  const filtered = filter === 'all' ? appointments
    : filter === 'upcoming' ? appointments.filter(a => isFuture(a.appointment_date) && a.status !== 'CANCELLED')
    : appointments.filter(a => (a.status || '').toUpperCase() === filter.toUpperCase());

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="profile-section-title mb-0"><i className="fas fa-calendar-alt"></i> My Appointments</div>
        <Link to="/appointments/add" className="btn btn-primary btn-sm"><i className="fas fa-plus me-1"></i> Book New</Link>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        {['all', 'upcoming', 'COMPLETED', 'CANCELLED'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'upcoming' ? 'Upcoming' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="profile-empty"><i className="fas fa-calendar-times"></i><p>No appointments found.</p></div>
      ) : filtered.map(appt => {
        const { day, month } = dayMonth(appt.appointment_date);
        const status = (appt.status || 'SCHEDULED').toUpperCase();
        const cardClass = isFuture(appt.appointment_date) && status !== 'CANCELLED' ? 'upcoming' : status === 'COMPLETED' ? 'completed' : status === 'CANCELLED' ? 'cancelled' : '';
        return (
          <div className={`profile-appt-card ${cardClass}`} key={appt.id}>
            <div className="profile-appt-date">
              <div className="day">{day}</div>
              <div className="month">{month}</div>
            </div>
            <div className="profile-appt-info">
              <div className="profile-appt-doctor">
                <i className="fas fa-user-md me-1"></i>
                {appt.doctor_name || 'Doctor'}
              </div>
              <div className="profile-appt-detail">
                {fmtTime(appt.appointment_time)} {appt.reason && <>&mdash; {appt.reason}</>}
              </div>
              {appt.token_number && <div className="profile-appt-detail">Token: #{appt.token_number}</div>}
            </div>
            <div className="profile-appt-status">
              <span className={`profile-badge ${statusBadge(appt.status)}`}>{appt.status || 'Scheduled'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// PRESCRIPTIONS TAB
// ============================================================
function PrescriptionsTab({ patientId, doctorId, userRole }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        let resp;
        if (userRole === 'doctor' && doctorId) {
          resp = await prescriptionService.getByDoctor(doctorId);
        } else if (patientId) {
          resp = await prescriptionService.getByPatient(patientId);
        } else {
          const result = await prescriptionService.getAll();
          setPrescriptions(result.data || []);
          setLoading(false);
          return;
        }
        const data = resp.data?.results || resp.data || [];
        setPrescriptions(Array.isArray(data) ? data : []);
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, [patientId, doctorId, userRole]);

  const handleDownload = async (id) => {
    try {
      const resp = await prescriptionService.downloadPdf(id);
      downloadBlob(resp.data, `prescription_${id}.pdf`);
    } catch {
      alert('Unable to download PDF.');
    }
  };

  if (loading) return <div className="profile-loading"><div className="spinner-border spinner-border-sm me-2"></div>Loading prescriptions...</div>;
  if (prescriptions.length === 0) return <div className="profile-empty"><i className="fas fa-prescription"></i><p>No prescriptions found.</p></div>;

  return (
    <div>
      <div className="profile-section-title"><i className="fas fa-prescription-bottle-alt"></i> My Prescriptions</div>
      {prescriptions.map(rx => {
        const medicines = rx.medicines || rx.items || rx.prescription_items || [];
        return (
          <div className="profile-rx-card" key={rx.id}>
            <div className="profile-rx-header">
              <div>
                <div className="profile-rx-title">Prescription #{rx.id}</div>
                <div className="profile-rx-meta">
                  <i className="fas fa-calendar me-1"></i>{fmt(rx.created_at || rx.date)}
                  {rx.doctor_name && <> &bull; <i className="fas fa-user-md me-1"></i>{rx.doctor_name}</>}
                </div>
              </div>
              <button className="profile-btn-download" onClick={() => handleDownload(rx.id)}>
                <i className="fas fa-file-pdf"></i> PDF
              </button>
            </div>
            {rx.diagnosis && <div className="mb-2" style={{ fontSize: '0.88rem' }}><strong>Diagnosis:</strong> {rx.diagnosis}</div>}
            {medicines.length > 0 && (
              <ul className="profile-medicine-list">
                {medicines.map((med, i) => (
                  <li className="profile-medicine-item" key={i}>
                    <i className="fas fa-pills"></i>
                    <span>
                      <strong>{med.medicine_name || med.name || med.medicine}</strong>
                      {med.dosage && <> &mdash; {med.dosage}</>}
                      {med.frequency && <>, {med.frequency}</>}
                      {med.duration && <>, {med.duration} days</>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {rx.follow_up_date && (
              <div className="mt-2 text-muted" style={{ fontSize: '0.85rem' }}>
                <i className="fas fa-calendar-check me-1"></i>Follow-up: {fmt(rx.follow_up_date)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// LAB REPORTS TAB
// ============================================================
function LabReportsTab({ patientId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (patientId) {
          const resp = await labService.getOrdersByPatient(patientId);
          const data = resp.data?.results || resp.data || [];
          setOrders(Array.isArray(data) ? data : []);
        } else {
          const result = await labService.getOrders();
          setOrders(result.data || []);
        }
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, [patientId]);

  const handleDownload = async (id) => {
    try {
      const resp = await labService.downloadPdf(id);
      downloadBlob(resp.data, `lab_report_${id}.pdf`);
    } catch {
      alert('Unable to download report.');
    }
  };

  if (loading) return <div className="profile-loading"><div className="spinner-border spinner-border-sm me-2"></div>Loading lab reports...</div>;
  if (orders.length === 0) return <div className="profile-empty"><i className="fas fa-flask"></i><p>No lab reports found.</p></div>;

  return (
    <div>
      <div className="profile-section-title"><i className="fas fa-flask"></i> Lab Reports</div>
      {orders.map(order => {
        const results = order.results || order.test_results || order.items || [];
        return (
          <div className="profile-section" key={order.id}>
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Order #{order.order_number || order.id}</div>
                <div style={{ fontSize: '0.82rem', color: '#7f8c8d' }}>
                  {fmt(order.created_at || order.ordered_date)}
                  {order.doctor_name && <> &bull; Dr. {order.doctor_name}</>}
                </div>
              </div>
              <div className="d-flex gap-2 align-items-center">
                <span className={`profile-badge ${statusBadge(order.status)}`}>{order.status || 'Pending'}</span>
                {(order.status === 'COMPLETED' || order.status === 'Completed') && (
                  <button className="profile-btn-download" onClick={() => handleDownload(order.id)}>
                    <i className="fas fa-file-pdf"></i> PDF
                  </button>
                )}
              </div>
            </div>
            {results.length > 0 && (
              <div className="table-responsive">
                <table className="profile-lab-table">
                  <thead>
                    <tr><th>Test</th><th>Value</th><th>Unit</th><th>Normal Range</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i}>
                        <td>{r.test_name || r.name || r.parameter}</td>
                        <td className={r.is_abnormal ? 'lab-abnormal' : ''}>{r.value || r.result || '-'}</td>
                        <td>{r.unit || '-'}</td>
                        <td>{r.normal_range || r.reference_range || '-'}</td>
                        <td>{r.is_abnormal ? <span className="lab-abnormal">Abnormal</span> : <span className="text-success fw-bold">Normal</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// VITALS & HEALTH TAB
// ============================================================
function VitalsTab({ patientId }) {
  const [vitals, setVitals] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) { setLoading(false); return; }
    const load = async () => {
      const [vRes, aRes, pRes] = await Promise.allSettled([
        vitalsService.getHistory(patientId),
        allergyService.getByPatient(patientId),
        treatmentPlanService.getByPatient(patientId),
      ]);
      if (vRes.status === 'fulfilled') {
        const d = vRes.value.data?.results || vRes.value.data || [];
        setVitals(Array.isArray(d) ? d : []);
      }
      if (aRes.status === 'fulfilled') {
        const d = aRes.value.data?.results || aRes.value.data || [];
        setAllergies(Array.isArray(d) ? d : []);
      }
      if (pRes.status === 'fulfilled') {
        const d = pRes.value.data?.results || pRes.value.data || [];
        setPlans(Array.isArray(d) ? d : []);
      }
      setLoading(false);
    };
    load();
  }, [patientId]);

  if (loading) return <div className="profile-loading"><div className="spinner-border spinner-border-sm me-2"></div>Loading health data...</div>;
  if (!patientId) return <div className="profile-empty"><i className="fas fa-heartbeat"></i><p>No patient profile linked. Vitals are available for patients only.</p></div>;

  const latest = vitals[0] || null;
  const items = latest ? [
    { icon: 'fa-thermometer-half', label: 'Temperature', value: latest.temperature ? `${latest.temperature}\u00B0F` : '-' },
    { icon: 'fa-heartbeat', label: 'Blood Pressure', value: latest.blood_pressure || (latest.systolic_bp ? `${latest.systolic_bp}/${latest.diastolic_bp}` : '-') },
    { icon: 'fa-heart', label: 'Pulse', value: latest.pulse_rate ? `${latest.pulse_rate} bpm` : '-' },
    { icon: 'fa-lungs', label: 'O2 Saturation', value: latest.oxygen_saturation ? `${latest.oxygen_saturation}%` : '-' },
    { icon: 'fa-weight', label: 'Weight', value: latest.weight ? `${latest.weight} kg` : '-' },
    { icon: 'fa-calculator', label: 'BMI', value: latest.bmi || '-' },
    { icon: 'fa-tint', label: 'Blood Sugar', value: latest.blood_sugar ? `${latest.blood_sugar} mg/dL` : '-' },
  ] : [];

  return (
    <div>
      {/* Latest Vitals */}
      <div className="profile-section">
        <div className="profile-section-title"><i className="fas fa-heartbeat"></i> Latest Vitals</div>
        {latest ? (
          <>
            <div className="text-muted mb-3" style={{ fontSize: '0.82rem' }}>Recorded: {fmt(latest.recorded_at || latest.created_at)}</div>
            <div className="profile-vitals-grid">
              {items.map((v, i) => (
                <div className="profile-vital-item" key={i}>
                  <div className="profile-vital-icon"><i className={`fas ${v.icon}`}></i></div>
                  <div className="profile-vital-value">{v.value}</div>
                  <div className="profile-vital-label">{v.label}</div>
                </div>
              ))}
            </div>
          </>
        ) : <div className="profile-empty"><p>No vitals recorded yet.</p></div>}
      </div>

      {/* Allergies */}
      <div className="profile-section">
        <div className="profile-section-title"><i className="fas fa-allergies"></i> Allergies</div>
        {allergies.length > 0 ? (
          <div className="d-flex flex-wrap gap-1">
            {allergies.map((a, i) => {
              const severe = a.severity && ['SEVERE', 'LIFE_THREATENING'].includes(a.severity.toUpperCase());
              return (
                <span className={`profile-allergy-chip ${severe ? 'severe' : ''}`} key={i}>
                  <i className="fas fa-exclamation-triangle"></i>
                  {a.allergen || a.name}
                  {a.severity && <small className="ms-1">({a.severity})</small>}
                </span>
              );
            })}
          </div>
        ) : <div className="profile-empty"><p>No allergies recorded.</p></div>}
      </div>

      {/* Treatment Plans */}
      <div className="profile-section">
        <div className="profile-section-title"><i className="fas fa-clipboard-list"></i> Treatment Plans</div>
        {plans.length > 0 ? plans.map(tp => (
          <div key={tp.id} style={{ padding: '0.75rem', border: '1px solid #e9ecef', borderRadius: 8, marginBottom: '0.6rem' }}>
            <div style={{ fontWeight: 600 }}>{tp.title || tp.plan_name || `Plan #${tp.id}`}</div>
            <div style={{ fontSize: '0.82rem', color: '#7f8c8d' }}>
              {tp.doctor_name && <><i className="fas fa-user-md me-1"></i>{tp.doctor_name} &bull; </>}
              {fmt(tp.start_date || tp.created_at)} {tp.end_date && <> to {fmt(tp.end_date)}</>}
            </div>
            {tp.description && <p className="mb-1 mt-1" style={{ fontSize: '0.88rem' }}>{tp.description}</p>}
            {tp.status && <span className={`profile-badge ${statusBadge(tp.status)}`}>{tp.status}</span>}
          </div>
        )) : <div className="profile-empty"><p>No treatment plans.</p></div>}
      </div>

      {/* Vitals History */}
      {vitals.length > 1 && (
        <div className="profile-section">
          <div className="profile-section-title"><i className="fas fa-chart-line"></i> Vitals History</div>
          <div className="table-responsive">
            <table className="profile-lab-table">
              <thead><tr><th>Date</th><th>Temp</th><th>BP</th><th>Pulse</th><th>O2</th><th>Weight</th><th>Sugar</th></tr></thead>
              <tbody>
                {vitals.slice(0, 10).map((v, i) => (
                  <tr key={i}>
                    <td>{fmt(v.recorded_at || v.created_at)}</td>
                    <td>{v.temperature ? `${v.temperature}\u00B0` : '-'}</td>
                    <td>{v.blood_pressure || (v.systolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : '-')}</td>
                    <td>{v.pulse_rate || '-'}</td>
                    <td>{v.oxygen_saturation ? `${v.oxygen_saturation}%` : '-'}</td>
                    <td>{v.weight ? `${v.weight} kg` : '-'}</td>
                    <td>{v.blood_sugar ? `${v.blood_sugar}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// BILLING TAB
// ============================================================
function BillingTab({ patientId }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (patientId) {
          const resp = await billingService.getByPatient(patientId);
          const d = resp.data?.results || resp.data || [];
          setInvoices(Array.isArray(d) ? d : []);
        } else {
          const result = await billingService.getAll();
          setInvoices(result.data || []);
        }
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, [patientId]);

  const handleDownload = async (id) => {
    try {
      const resp = await billingService.downloadPdf(id);
      downloadBlob(resp.data, `invoice_${id}.pdf`);
    } catch {
      alert('Unable to download invoice.');
    }
  };

  if (loading) return <div className="profile-loading"><div className="spinner-border spinner-border-sm me-2"></div>Loading billing...</div>;

  const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
  const paidAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.paid_amount || 0), 0);
  const pendingAmount = totalAmount - paidAmount;

  return (
    <div>
      {/* Billing Summary */}
      <div className="profile-stats-row" style={{ marginBottom: '1.5rem' }}>
        <div className="profile-stat-card">
          <div className="profile-stat-icon blue"><i className="fas fa-file-invoice"></i></div>
          <div className="profile-stat-value">{invoices.length}</div>
          <div className="profile-stat-label">Total Invoices</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-icon green"><i className="fas fa-check-circle"></i></div>
          <div className="profile-stat-value">{paidAmount.toFixed(0)}</div>
          <div className="profile-stat-label">Paid Amount</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-icon red"><i className="fas fa-exclamation-circle"></i></div>
          <div className="profile-stat-value">{pendingAmount.toFixed(0)}</div>
          <div className="profile-stat-label">Pending Amount</div>
        </div>
      </div>

      <div className="profile-section-title"><i className="fas fa-file-invoice-dollar"></i> Invoices</div>
      {invoices.length === 0 ? (
        <div className="profile-empty"><i className="fas fa-receipt"></i><p>No invoices found.</p></div>
      ) : invoices.map(inv => (
        <div className="profile-invoice-card" key={inv.id}>
          <div className="profile-invoice-info">
            <div className="profile-invoice-number">{inv.invoice_number || `INV-${inv.id}`}</div>
            <div className="profile-invoice-detail">
              {fmt(inv.created_at || inv.date)} {inv.doctor_name && <>&bull; Dr. {inv.doctor_name}</>}
            </div>
          </div>
          <div className="profile-invoice-amount">{inv.total_amount || '0.00'}</div>
          <span className={`profile-badge ${statusBadge(inv.status)}`}>{inv.status || 'Pending'}</span>
          <button className="profile-btn-download ms-2" onClick={() => handleDownload(inv.id)} title="Download PDF">
            <i className="fas fa-download"></i>
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// MEDICAL RECORDS TAB
// ============================================================
function RecordsTab({ patientId }) {
  const [records, setRecords] = useState([]);
  const [discharges, setDischarges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) { setLoading(false); return; }
    const load = async () => {
      const [rRes, dRes] = await Promise.allSettled([
        medicalRecordService.getByPatient(patientId),
        dischargeService.getByPatient(patientId),
      ]);
      if (rRes.status === 'fulfilled') {
        const d = rRes.value.data?.results || rRes.value.data || [];
        setRecords(Array.isArray(d) ? d : []);
      }
      if (dRes.status === 'fulfilled') {
        const d = dRes.value.data?.results || dRes.value.data || [];
        setDischarges(Array.isArray(d) ? d : []);
      }
      setLoading(false);
    };
    load();
  }, [patientId]);

  const handleDownloadDischarge = async (id) => {
    try {
      const resp = await dischargeService.downloadPdf(id);
      downloadBlob(resp.data, `discharge_${id}.pdf`);
    } catch {
      alert('Unable to download.');
    }
  };

  if (loading) return <div className="profile-loading"><div className="spinner-border spinner-border-sm me-2"></div>Loading records...</div>;
  if (!patientId) return <div className="profile-empty"><i className="fas fa-notes-medical"></i><p>No patient profile linked.</p></div>;

  return (
    <div>
      {/* Medical Records */}
      <div className="profile-section">
        <div className="profile-section-title"><i className="fas fa-notes-medical"></i> Medical Records</div>
        {records.length > 0 ? records.map(rec => (
          <div key={rec.id} style={{ padding: '0.75rem', border: '1px solid #e9ecef', borderRadius: 8, marginBottom: '0.6rem' }}>
            <div className="d-flex justify-content-between">
              <div>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{(rec.record_type || 'Record').replace(/_/g, ' ')}</span>
                <div style={{ fontSize: '0.82rem', color: '#7f8c8d' }}>{fmt(rec.created_at || rec.date)}</div>
              </div>
              {rec.doctor_name && <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>Dr. {rec.doctor_name}</div>}
            </div>
            {rec.title && <div className="mt-1" style={{ fontWeight: 500 }}>{rec.title}</div>}
            {rec.description && <div style={{ fontSize: '0.88rem', color: '#495057' }}>{rec.description}</div>}
          </div>
        )) : <div className="profile-empty"><p>No medical records found.</p></div>}
      </div>

      {/* Discharge Summaries */}
      <div className="profile-section">
        <div className="profile-section-title"><i className="fas fa-file-medical-alt"></i> Discharge Summaries</div>
        {discharges.length > 0 ? discharges.map(ds => (
          <div key={ds.id} style={{ padding: '0.75rem', border: '1px solid #e9ecef', borderRadius: 8, marginBottom: '0.6rem' }}>
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div style={{ fontWeight: 600 }}>Discharge #{ds.summary_number || ds.id}</div>
                <div style={{ fontSize: '0.82rem', color: '#7f8c8d' }}>
                  Admitted: {fmt(ds.admission_date)} &bull; Discharged: {fmt(ds.discharge_date)}
                </div>
                {ds.diagnosis && <div className="mt-1" style={{ fontSize: '0.88rem' }}><strong>Diagnosis:</strong> {ds.diagnosis}</div>}
                {ds.medications_on_discharge && <div style={{ fontSize: '0.85rem' }}><strong>Medications:</strong> {ds.medications_on_discharge}</div>}
              </div>
              <button className="profile-btn-download" onClick={() => handleDownloadDischarge(ds.id)}>
                <i className="fas fa-file-pdf"></i> PDF
              </button>
            </div>
          </div>
        )) : <div className="profile-empty"><p>No discharge summaries.</p></div>}
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS TAB (Edit Profile + Change Password)
// ============================================================
function SettingsTab({ user, onProfileUpdate }) {
  const [form, setForm] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    phone_number: user.phone_number || '',
  });
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [msg, setMsg] = useState(null);
  const [pwMsg, setPwMsg] = useState(null);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await authService.updateProfile(form);
      setMsg({ type: 'success', text: 'Profile updated successfully!' });
      onProfileUpdate();
    } catch {
      setMsg({ type: 'danger', text: 'Failed to update profile.' });
    }
    setSaving(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) {
      setPwMsg({ type: 'danger', text: 'New passwords do not match.' });
      return;
    }
    if (pwForm.newPw.length < 6) {
      setPwMsg({ type: 'danger', text: 'Password must be at least 6 characters.' });
      return;
    }
    setChangingPw(true);
    setPwMsg(null);
    try {
      await authService.changePassword(pwForm.current, pwForm.newPw);
      setPwMsg({ type: 'success', text: 'Password changed successfully!' });
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch {
      setPwMsg({ type: 'danger', text: 'Failed. Check your current password.' });
    }
    setChangingPw(false);
  };

  return (
    <div>
      {/* Edit Profile */}
      <div className="profile-section">
        <div className="profile-section-title"><i className="fas fa-user-edit"></i> Edit Profile</div>
        {msg && <div className={`alert alert-${msg.type} py-2`} style={{ fontSize: '0.88rem' }}>{msg.text}</div>}
        <form onSubmit={handleSaveProfile}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">First Name</label>
              <input type="text" className="form-control" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Last Name</label>
              <input type="text" className="form-control" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Phone Number</label>
              <input type="tel" className="form-control" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={user.email} disabled />
              <small className="text-muted">Email cannot be changed</small>
            </div>
          </div>
          <button type="submit" className="btn btn-primary mt-3" disabled={saving}>
            {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="fas fa-save me-1"></i>Save Changes</>}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="profile-section">
        <div className="profile-section-title"><i className="fas fa-lock"></i> Change Password</div>
        {pwMsg && <div className={`alert alert-${pwMsg.type} py-2`} style={{ fontSize: '0.88rem' }}>{pwMsg.text}</div>}
        <form onSubmit={handleChangePassword}>
          <div className="row g-3">
            <div className="col-md-12">
              <label className="form-label">Current Password</label>
              <input type="password" className="form-control" value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">New Password</label>
              <input type="password" className="form-control" value={pwForm.newPw} onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Confirm New Password</label>
              <input type="password" className="form-control" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} required />
            </div>
          </div>
          <button type="submit" className="btn btn-warning mt-3" disabled={changingPw}>
            {changingPw ? <><span className="spinner-border spinner-border-sm me-1"></span>Changing...</> : <><i className="fas fa-key me-1"></i>Change Password</>}
          </button>
        </form>
      </div>

      {/* Account Info */}
      <div className="profile-section">
        <div className="profile-section-title"><i className="fas fa-info-circle"></i> Account Information</div>
        <div className="profile-info-grid">
          <div className="profile-info-item">
            <div className="profile-info-label">Account ID</div>
            <div className="profile-info-value">#{user.id}</div>
          </div>
          <div className="profile-info-item">
            <div className="profile-info-label">Role</div>
            <div className="profile-info-value" style={{ textTransform: 'capitalize' }}>{user.role_display || user.role}</div>
          </div>
          <div className="profile-info-item">
            <div className="profile-info-label">Date Joined</div>
            <div className="profile-info-value">{fmt(user.date_joined)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN USER PROFILE COMPONENT
// ============================================================
export default function UserProfile() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAppointments: 0, upcomingAppointments: 0, totalPrescriptions: 0,
    pendingLabOrders: 0, pendingInvoices: 0, unreadNotifications: 0,
    nextAppointment: null, recentAppointments: [],
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  // Load user profile
  const loadProfile = useCallback(async () => {
    try {
      const resp = await authService.getProfile();
      setUser(resp.data);
    } catch {
      navigate('/login');
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // Load stats once user is available
  useEffect(() => {
    if (!user) return;
    const loadStats = async () => {
      const patientId = user.patient_profile;
      const doctorId = user.doctor_profile;

      const promises = [];

      // Appointments
      const apptParams = {};
      if (user.role === 'patient' && patientId) apptParams.patient = patientId;
      if (user.role === 'doctor' && doctorId) apptParams.doctor = doctorId;
      promises.push(appointmentService.getAll(apptParams).catch(() => ({ data: [] })));

      // Prescriptions
      if (patientId) {
        promises.push(prescriptionService.getByPatient(patientId).catch(() => ({ data: [] })));
      } else if (doctorId) {
        promises.push(prescriptionService.getByDoctor(doctorId).catch(() => ({ data: [] })));
      } else {
        promises.push(prescriptionService.getAll().catch(() => ({ data: [] })));
      }

      // Lab orders
      if (patientId) {
        promises.push(labService.getOrdersByPatient(patientId).catch(() => ({ data: [] })));
      } else {
        promises.push(labService.getOrders().catch(() => ({ data: [] })));
      }

      // Invoices
      if (patientId) {
        promises.push(billingService.getByPatient(patientId).catch(() => ({ data: [] })));
      } else {
        promises.push(billingService.getAll().catch(() => ({ data: [] })));
      }

      // Notifications
      promises.push(notificationService.getUnreadCount().catch(() => ({ data: { count: 0 } })));

      const [apptRes, rxRes, labRes, billRes, notifRes] = await Promise.all(promises);

      const appts = apptRes.data || [];
      const rxData = rxRes.data?.results || rxRes.data || [];
      const labData = labRes.data?.results || labRes.data || [];
      const billData = billRes.data?.results || billRes.data || [];

      const rxList = Array.isArray(rxData) ? rxData : [];
      const labList = Array.isArray(labData) ? labData : [];
      const billList = Array.isArray(billData) ? billData : [];

      const upcoming = appts.filter(a => isFuture(a.appointment_date) && a.status !== 'CANCELLED');
      const sorted = [...upcoming].sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));

      setStats({
        totalAppointments: appts.length,
        upcomingAppointments: upcoming.length,
        totalPrescriptions: rxList.length,
        pendingLabOrders: labList.filter(l => l.status && !['COMPLETED', 'Completed'].includes(l.status)).length,
        pendingInvoices: billList.filter(i => i.status && !['PAID', 'Paid'].includes(i.status)).length,
        unreadNotifications: notifRes.data?.count || 0,
        nextAppointment: sorted[0] || null,
        recentAppointments: appts.slice(0, 5),
      });
    };
    loadStats();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary"></div>
      </div>
    );
  }

  const patientId = user.patient_profile;
  const doctorId = user.doctor_profile;
  const initials = `${(user.first_name || 'U')[0]}${(user.last_name || '')[0] || ''}`.toUpperCase();

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab user={user} patientId={patientId} doctorId={doctorId} stats={stats} />;
      case 'appointments': return <AppointmentsTab patientId={patientId} doctorId={doctorId} userRole={user.role} />;
      case 'prescriptions': return <PrescriptionsTab patientId={patientId} doctorId={doctorId} userRole={user.role} />;
      case 'lab': return <LabReportsTab patientId={patientId} />;
      case 'vitals': return <VitalsTab patientId={patientId} />;
      case 'billing': return <BillingTab patientId={patientId} />;
      case 'records': return <RecordsTab patientId={patientId} />;
      case 'settings': return <SettingsTab user={user} onProfileUpdate={loadProfile} />;
      default: return <OverviewTab user={user} patientId={patientId} doctorId={doctorId} stats={stats} />;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="profile-header">
        <div className="container">
          <div className="profile-header-inner">
            <div className="profile-avatar">
              {user.profile_picture
                ? <img src={user.profile_picture} alt="Profile" />
                : initials}
            </div>
            <div className="profile-user-info">
              <h2>{user.first_name} {user.last_name}</h2>
              <div className="profile-user-meta">
                <span><i className="fas fa-envelope"></i> {user.email}</span>
                {user.phone_number && <span><i className="fas fa-phone"></i> {user.phone_number}</span>}
                <span className="profile-role-badge">
                  <i className="fas fa-id-badge me-1"></i>{user.role_display || user.role}
                </span>
              </div>
            </div>
            <div className="profile-header-actions">
              <Link to="/appointments/add" className="btn btn-light btn-sm">
                <i className="fas fa-plus me-1"></i>Book Appointment
              </Link>
              <button className="btn btn-outline-light btn-sm" onClick={() => setActiveTab('settings')}>
                <i className="fas fa-cog me-1"></i>Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="profile-content">
        <div className="container">
          <div className="row">
            {/* Sidebar */}
            <div className="col-lg-3 mb-3">
              <div className="profile-sidebar">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    className={`profile-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <i className={`fas ${tab.icon}`}></i>
                    {tab.label}
                    {tab.id === 'appointments' && stats.upcomingAppointments > 0 && (
                      <span className="profile-nav-badge">{stats.upcomingAppointments}</span>
                    )}
                    {tab.id === 'lab' && stats.pendingLabOrders > 0 && (
                      <span className="profile-nav-badge">{stats.pendingLabOrders}</span>
                    )}
                    {tab.id === 'billing' && stats.pendingInvoices > 0 && (
                      <span className="profile-nav-badge">{stats.pendingInvoices}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="col-lg-9">
              {renderTab()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
