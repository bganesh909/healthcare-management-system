import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  appointmentService, prescriptionService, labService,
  vitalsService, allergyService, patientService, staffService,
  attendanceService,
} from '../../services/api';
import apiClient from '../../services/api';

/* ── helpers ─────────────────────────────────────────────────── */
const today = () => new Date().toISOString().slice(0, 10);

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const weekDates = () => {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
};

/* status config */
const STATUS_CFG = {
  SCHEDULED:       { bg: '#6c757d', label: 'Scheduled', text: 'white' },
  CHECKED_IN:      { bg: '#6c757d', label: 'Checked In', text: 'white' },
  READY:           { bg: '#198754', label: 'Ready', text: 'white', pulse: true },
  IN_CONSULTATION: { bg: '#0d6efd', label: 'In Consultation', text: 'white' },
  COMPLETED:       { bg: '#198754', label: 'Completed', text: 'white' },
  CANCELLED:       { bg: '#dc3545', label: 'Cancelled', text: 'white' },
  NO_SHOW:         { bg: '#ffc107', label: 'No Show', text: 'dark' },
};

const statusBadge = (status) => {
  const c = STATUS_CFG[status] || { bg: '#6c757d', label: status, text: 'white' };
  return (
    <span
      className={c.pulse ? 'pulse-badge' : ''}
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 12,
        fontSize: '0.75rem',
        fontWeight: 600,
        color: c.text === 'dark' ? '#212529' : '#fff',
        background: c.bg,
      }}
    >
      {c.label}
    </span>
  );
};

/* ── pulse animation (injected once) ─────────────────────────── */
const PULSE_CSS = `
@keyframes pulseGlow {
  0%   { box-shadow: 0 0 0 0 rgba(25,135,84,.55); }
  70%  { box-shadow: 0 0 0 8px rgba(25,135,84,0); }
  100% { box-shadow: 0 0 0 0 rgba(25,135,84,0); }
}
.pulse-badge { animation: pulseGlow 1.6s infinite; }
.btn-pulse   { animation: pulseGlow 1.6s infinite; }
`;

/* ── Spinner ──────────────────────────────────────────────────── */
const Spinner = ({ size = '', className = '' }) => (
  <div className={`d-flex justify-content-center align-items-center ${className}`}>
    <div className={`spinner-border text-primary ${size === 'sm' ? 'spinner-border-sm' : ''}`} role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
const DoctorDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('today');
  const [loading, setLoading] = useState(true);

  /* ── Tab 1 state ─────────────────────────────── */
  const [todayAppts, setTodayAppts] = useState([]);
  const [expandedAppt, setExpandedAppt] = useState(null);
  const [patientDetails, setPatientDetails] = useState({});   // { apptId: { patient, vitals, allergies, prescriptions, labOrders, pastAppts } }
  const [detailLoading, setDetailLoading] = useState({});
  const [consultLoading, setConsultLoading] = useState({});

  /* ── Tab 2 state ─────────────────────────────── */
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [patientHistoryLoading, setPatientHistoryLoading] = useState(false);

  /* ── Tab 3 state ─────────────────────────────── */
  const [staffList, setStaffList] = useState([]);
  const [staffAttendance, setStaffAttendance] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);

  /* ── Tab 4 state ─────────────────────────────── */
  const [weekAppts, setWeekAppts] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const doctorId = user?.doctor_profile;

  /* ── redirect if not authed ────────────────────── */
  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  /* ── inject pulse css ──────────────────────────── */
  useEffect(() => {
    const id = 'doctor-dashboard-pulse';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = PULSE_CSS;
      document.head.appendChild(s);
    }
  }, []);

  /* ── load today's appointments ─────────────────── */
  const loadToday = useCallback(async () => {
    if (!doctorId) { setLoading(false); return; }
    try {
      const res = await appointmentService.getToday({ doctor: doctorId });
      const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setTodayAppts(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [doctorId]);

  useEffect(() => { loadToday(); }, [loadToday]);

  /* ── derived stats ─────────────────────────────── */
  const stats = useMemo(() => {
    const pending = todayAppts.filter(a => ['SCHEDULED', 'CHECKED_IN', 'READY', 'IN_CONSULTATION'].includes(a.status)).length;
    const completed = todayAppts.filter(a => a.status === 'COMPLETED').length;
    return { total: todayAppts.length, pending, completed };
  }, [todayAppts]);

  /* ── start consultation ────────────────────────── */
  const handleStartConsultation = async (id) => {
    setConsultLoading(p => ({ ...p, [id]: true }));
    try {
      await appointmentService.startConsultation(id);
      await loadToday();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to start consultation');
    }
    setConsultLoading(p => ({ ...p, [id]: false }));
  };

  /* ── expand patient details inline ─────────────── */
  const togglePatientView = async (appt) => {
    if (expandedAppt === appt.id) { setExpandedAppt(null); return; }
    setExpandedAppt(appt.id);

    if (patientDetails[appt.id]) return; // already loaded

    const pid = appt.patient;
    setDetailLoading(p => ({ ...p, [appt.id]: true }));
    try {
      const [patRes, vitRes, allergyRes, rxRes, labRes, pastRes] = await Promise.allSettled([
        patientService.get(pid),
        vitalsService.getHistory(pid),
        allergyService.getByPatient(pid),
        prescriptionService.getByPatient(pid),
        labService.getOrdersByPatient(pid),
        appointmentService.getAll({ patient: pid, doctor: doctorId }),
      ]);
      setPatientDetails(p => ({
        ...p,
        [appt.id]: {
          patient:       patRes.status === 'fulfilled' ? patRes.value.data : null,
          vitals:        vitRes.status === 'fulfilled' ? (vitRes.value.data?.results || vitRes.value.data || []) : [],
          allergies:     allergyRes.status === 'fulfilled' ? (allergyRes.value.data?.results || allergyRes.value.data || []) : [],
          prescriptions: rxRes.status === 'fulfilled' ? (rxRes.value.data?.results || rxRes.value.data || []) : [],
          labOrders:     labRes.status === 'fulfilled' ? (labRes.value.data?.results || labRes.value.data || []) : [],
          pastAppts:     pastRes.status === 'fulfilled' ? (pastRes.data || []) : [],
        },
      }));
    } catch { /* ignore */ }
    setDetailLoading(p => ({ ...p, [appt.id]: false }));
  };

  /* ── Tab 2: search patients ────────────────────── */
  const searchPatients = async () => {
    if (!patientSearch.trim()) return;
    setPatientSearchLoading(true);
    setSelectedPatient(null);
    setPatientHistory(null);
    try {
      const res = await patientService.getAll({ search: patientSearch.trim() });
      setPatientResults(Array.isArray(res.data) ? res.data : (res.data?.results || res.data || []));
    } catch { setPatientResults([]); }
    setPatientSearchLoading(false);
  };

  const loadPatientHistory = async (patient) => {
    setSelectedPatient(patient);
    setPatientHistoryLoading(true);
    try {
      const pid = patient.id;
      const [apptRes, rxRes, labRes, vitRes] = await Promise.allSettled([
        appointmentService.getAll({ patient: pid }),
        prescriptionService.getByPatient(pid),
        labService.getOrdersByPatient(pid),
        vitalsService.getHistory(pid),
      ]);
      setPatientHistory({
        appointments:  apptRes.status === 'fulfilled' ? (apptRes.data || []) : [],
        prescriptions: rxRes.status === 'fulfilled' ? (rxRes.value.data?.results || rxRes.value.data || []) : [],
        labOrders:     labRes.status === 'fulfilled' ? (labRes.value.data?.results || labRes.value.data || []) : [],
        vitals:        vitRes.status === 'fulfilled' ? (vitRes.value.data?.results || vitRes.value.data || []) : [],
      });
    } catch { setPatientHistory(null); }
    setPatientHistoryLoading(false);
  };

  /* ── Tab 3: load staff ─────────────────────────── */
  const loadStaff = useCallback(async () => {
    setStaffLoading(true);
    try {
      const [staffRes, attRes] = await Promise.allSettled([
        apiClient.get('staff/staff-members/', { params: { is_active: true } }),
        apiClient.get('staff/attendance/', { params: { date: today() } }),
      ]);
      if (staffRes.status === 'fulfilled') {
        const d = staffRes.value.data?.results || staffRes.value.data || [];
        setStaffList(Array.isArray(d) ? d : []);
      }
      if (attRes.status === 'fulfilled') {
        const d = attRes.value.data?.results || attRes.value.data || [];
        setStaffAttendance(Array.isArray(d) ? d : []);
      }
    } catch { /* ignore */ }
    setStaffLoading(false);
  }, []);

  /* ── Tab 4: load week schedule ─────────────────── */
  const loadSchedule = useCallback(async () => {
    if (!doctorId) return;
    setScheduleLoading(true);
    try {
      const res = await appointmentService.getAll({ doctor: doctorId });
      const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setWeekAppts(data);
    } catch { /* ignore */ }
    setScheduleLoading(false);
  }, [doctorId]);

  /* lazy-load tab data */
  useEffect(() => {
    if (activeTab === 'staff' && staffList.length === 0) loadStaff();
    if (activeTab === 'schedule' && weekAppts.length === 0) loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* ── no doctor profile guard ───────────────────── */
  if (!loading && !doctorId) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <i className="fas fa-exclamation-triangle fa-3x text-warning mb-3 d-block"></i>
          <h5>Doctor Profile Not Found</h5>
          <p className="text-muted">
            Your account is not linked to a doctor profile.<br />
            Please contact the administrator to set up your profile.
          </p>
        </div>
      </div>
    );
  }

  if (loading) return <Spinner className="py-5" style={{ minHeight: '60vh' }} />;

  /* ── week schedule grouped ─────────────────────── */
  const week = weekDates();
  const weekGrouped = week.map(date => ({
    date,
    appts: weekAppts.filter(a => a.appointment_date === date)
      .sort((a, b) => (a.appointment_time || '').localeCompare(b.appointment_time || '')),
  }));

  /* attendance lookup */
  const attendanceLookup = {};
  staffAttendance.forEach(a => { attendanceLookup[a.staff_member] = a; });

  /* ════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════ */
  return (
    <div style={{ background: '#f4f6f9', minHeight: '100vh' }}>
      {/* ── Header ─────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #1a5276, #2980b9)', padding: '2rem 0', color: '#fff' }}>
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h3 className="mb-1" style={{ fontWeight: 700 }}>
                {greeting()}, Dr. {user?.first_name || 'Doctor'}
              </h3>
              <p className="mb-0" style={{ opacity: 0.85, fontSize: '0.9rem' }}>
                <i className="fas fa-calendar me-1"></i>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="col-md-6">
              <div className="d-flex gap-3 justify-content-md-end mt-3 mt-md-0">
                {[
                  { label: "Today's Appts", value: stats.total, icon: 'fa-calendar-day' },
                  { label: 'Pending', value: stats.pending, icon: 'fa-hourglass-half' },
                  { label: 'Completed', value: stats.completed, icon: 'fa-check-circle' },
                ].map((s, i) => (
                  <div key={i} className="text-center" style={{ minWidth: 80 }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>
                      <i className={`fas ${s.icon} me-1`} style={{ fontSize: '0.9rem', opacity: 0.8 }}></i>
                      {s.value}
                    </div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ─────────────────────────── */}
      <div className="container mt-n2">
        <ul className="nav nav-tabs border-0 mt-3" style={{ gap: 4 }}>
          {[
            { key: 'today',    label: "Today's Appointments", icon: 'fa-calendar-day' },
            { key: 'patients', label: 'Patient Records',      icon: 'fa-user-injured' },
            { key: 'staff',    label: 'Available Staff',       icon: 'fa-users-cog' },
            { key: 'schedule', label: 'My Schedule',           icon: 'fa-calendar-week' },
          ].map(t => (
            <li className="nav-item" key={t.key}>
              <button
                className={`nav-link ${activeTab === t.key ? 'active fw-bold' : ''}`}
                onClick={() => setActiveTab(t.key)}
                style={{
                  borderRadius: '8px 8px 0 0',
                  border: activeTab === t.key ? '1px solid #dee2e6' : '1px solid transparent',
                  borderBottom: activeTab === t.key ? '1px solid #fff' : 'none',
                  background: activeTab === t.key ? '#fff' : 'transparent',
                  color: activeTab === t.key ? '#1a5276' : '#6c757d',
                  fontSize: '0.88rem',
                }}
              >
                <i className={`fas ${t.icon} me-1`}></i>{t.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Tab Content ────────────────────────────── */}
      <div className="container pb-5">
        <div className="card border-0 shadow-sm" style={{ borderRadius: '0 12px 12px 12px' }}>
          <div className="card-body p-0">

            {/* ═══ TAB 1: TODAY'S APPOINTMENTS ═══ */}
            {activeTab === 'today' && (
              <div>
                {todayAppts.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="fas fa-mug-hot fa-3x mb-3 d-block" style={{ opacity: 0.4 }}></i>
                    <h6>No appointments scheduled for today</h6>
                    <p className="mb-0" style={{ fontSize: '0.85rem' }}>Enjoy your free time!</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#7f8c8d', background: '#fafbfc' }}>
                        <tr>
                          <th style={{ paddingLeft: '1.2rem', width: 70 }}>Token #</th>
                          <th>Patient Name</th>
                          <th>Time</th>
                          <th>Symptoms / Reason</th>
                          <th>Status</th>
                          <th style={{ width: 180 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayAppts
                          .sort((a, b) => (a.token_number || 999) - (b.token_number || 999))
                          .map(appt => (
                          <React.Fragment key={appt.id}>
                            <tr>
                              <td style={{ paddingLeft: '1.2rem' }}>
                                <span className="badge bg-light text-dark border fw-bold" style={{ fontSize: '0.85rem' }}>
                                  #{appt.token_number || '-'}
                                </span>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#2c3e50' }}>
                                  {appt.patient_name || `Patient #${appt.patient}`}
                                </div>
                              </td>
                              <td style={{ fontWeight: 500, color: '#495057' }}>
                                {fmtTime(appt.appointment_time)}
                              </td>
                              <td>
                                <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                                  {appt.reason || appt.symptoms || '-'}
                                </span>
                              </td>
                              <td>{statusBadge(appt.status)}</td>
                              <td>
                                {appt.status === 'READY' && (
                                  <button
                                    className="btn btn-success btn-sm btn-pulse"
                                    disabled={consultLoading[appt.id]}
                                    onClick={() => handleStartConsultation(appt.id)}
                                    style={{ borderRadius: 8, fontWeight: 600, fontSize: '0.8rem' }}
                                  >
                                    {consultLoading[appt.id] ? (
                                      <><span className="spinner-border spinner-border-sm me-1"></span>Starting...</>
                                    ) : (
                                      <><i className="fas fa-play me-1"></i>Start Consultation</>
                                    )}
                                  </button>
                                )}
                                {appt.status === 'IN_CONSULTATION' && (
                                  <button
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => togglePatientView(appt)}
                                    style={{ borderRadius: 8, fontSize: '0.8rem' }}
                                  >
                                    <i className={`fas ${expandedAppt === appt.id ? 'fa-chevron-up' : 'fa-eye'} me-1`}></i>
                                    {expandedAppt === appt.id ? 'Hide Details' : 'View Patient'}
                                  </button>
                                )}
                                {appt.status === 'COMPLETED' && (
                                  <span className="text-success" style={{ fontSize: '0.8rem' }}>
                                    <i className="fas fa-check-circle me-1"></i>Done
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* ── Expanded patient details ── */}
                            {expandedAppt === appt.id && (
                              <tr>
                                <td colSpan="6" style={{ background: '#f8f9fa', padding: 0 }}>
                                  {detailLoading[appt.id] ? (
                                    <Spinner size="sm" className="py-4" />
                                  ) : patientDetails[appt.id] ? (
                                    <PatientInlineDetails data={patientDetails[appt.id]} />
                                  ) : (
                                    <div className="text-center py-3 text-muted">Unable to load details</div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ═══ TAB 2: PATIENT RECORDS ═══ */}
            {activeTab === 'patients' && (
              <div className="p-4">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search patient by name or phone..."
                        value={patientSearch}
                        onChange={e => setPatientSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && searchPatients()}
                      />
                      <button className="btn btn-primary" onClick={searchPatients} disabled={patientSearchLoading}>
                        {patientSearchLoading ? (
                          <span className="spinner-border spinner-border-sm"></span>
                        ) : (
                          <i className="fas fa-search"></i>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* search results */}
                {patientResults.length > 0 && !selectedPatient && (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#7f8c8d' }}>
                        <tr><th>Name</th><th>Phone</th><th>Gender</th><th>Blood Group</th><th></th></tr>
                      </thead>
                      <tbody>
                        {patientResults.map(p => (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</td>
                            <td>{p.phone || p.phone_number || '-'}</td>
                            <td>{p.gender || '-'}</td>
                            <td>{p.blood_group || '-'}</td>
                            <td>
                              <button className="btn btn-sm btn-outline-primary" onClick={() => loadPatientHistory(p)} style={{ borderRadius: 8 }}>
                                <i className="fas fa-folder-open me-1"></i>View Records
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {patientResults.length > 0 && patientResults.length === 0 && (
                  <div className="text-center text-muted py-4">No patients found matching your search.</div>
                )}

                {/* selected patient's history */}
                {selectedPatient && (
                  <div>
                    <button className="btn btn-sm btn-outline-secondary mb-3" onClick={() => { setSelectedPatient(null); setPatientHistory(null); }}>
                      <i className="fas fa-arrow-left me-1"></i>Back to results
                    </button>

                    <div className="card border mb-3">
                      <div className="card-body">
                        <h5 className="mb-1">{selectedPatient.first_name} {selectedPatient.last_name}</h5>
                        <div className="d-flex flex-wrap gap-3" style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                          <span><i className="fas fa-phone me-1"></i>{selectedPatient.phone || selectedPatient.phone_number || 'N/A'}</span>
                          <span><i className="fas fa-venus-mars me-1"></i>{selectedPatient.gender || 'N/A'}</span>
                          <span><i className="fas fa-tint me-1"></i>{selectedPatient.blood_group || 'N/A'}</span>
                          {selectedPatient.date_of_birth && <span><i className="fas fa-birthday-cake me-1"></i>{fmt(selectedPatient.date_of_birth)}</span>}
                        </div>
                      </div>
                    </div>

                    {patientHistoryLoading ? (
                      <Spinner className="py-5" />
                    ) : patientHistory ? (
                      <div className="row g-3">
                        {/* Appointments */}
                        <div className="col-md-6">
                          <div className="card border h-100">
                            <div className="card-header bg-white"><h6 className="mb-0"><i className="fas fa-calendar-alt me-2 text-primary"></i>Appointments ({patientHistory.appointments.length})</h6></div>
                            <div className="card-body p-0" style={{ maxHeight: 300, overflowY: 'auto' }}>
                              {patientHistory.appointments.length === 0 ? (
                                <div className="text-center text-muted py-3" style={{ fontSize: '0.85rem' }}>No records</div>
                              ) : (
                                <table className="table table-hover table-sm mb-0">
                                  <thead><tr><th>Date</th><th>Reason</th><th>Status</th></tr></thead>
                                  <tbody>
                                    {patientHistory.appointments.map(a => (
                                      <tr key={a.id}>
                                        <td style={{ fontSize: '0.82rem' }}>{fmt(a.appointment_date)}</td>
                                        <td style={{ fontSize: '0.82rem' }}>{a.reason || '-'}</td>
                                        <td>{statusBadge(a.status)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Prescriptions */}
                        <div className="col-md-6">
                          <div className="card border h-100">
                            <div className="card-header bg-white"><h6 className="mb-0"><i className="fas fa-prescription me-2 text-success"></i>Prescriptions ({patientHistory.prescriptions.length})</h6></div>
                            <div className="card-body p-0" style={{ maxHeight: 300, overflowY: 'auto' }}>
                              {patientHistory.prescriptions.length === 0 ? (
                                <div className="text-center text-muted py-3" style={{ fontSize: '0.85rem' }}>No records</div>
                              ) : (
                                <table className="table table-hover table-sm mb-0">
                                  <thead><tr><th>Date</th><th>Diagnosis</th><th>Doctor</th></tr></thead>
                                  <tbody>
                                    {patientHistory.prescriptions.map(rx => (
                                      <tr key={rx.id}>
                                        <td style={{ fontSize: '0.82rem' }}>{fmt(rx.created_at || rx.date)}</td>
                                        <td style={{ fontSize: '0.82rem' }}>{rx.diagnosis || '-'}</td>
                                        <td style={{ fontSize: '0.82rem' }}>{rx.doctor_name || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Lab Reports */}
                        <div className="col-md-6">
                          <div className="card border h-100">
                            <div className="card-header bg-white"><h6 className="mb-0"><i className="fas fa-flask me-2 text-info"></i>Lab Reports ({patientHistory.labOrders.length})</h6></div>
                            <div className="card-body p-0" style={{ maxHeight: 300, overflowY: 'auto' }}>
                              {patientHistory.labOrders.length === 0 ? (
                                <div className="text-center text-muted py-3" style={{ fontSize: '0.85rem' }}>No records</div>
                              ) : (
                                <table className="table table-hover table-sm mb-0">
                                  <thead><tr><th>Date</th><th>Test</th><th>Status</th></tr></thead>
                                  <tbody>
                                    {patientHistory.labOrders.map(lo => (
                                      <tr key={lo.id}>
                                        <td style={{ fontSize: '0.82rem' }}>{fmt(lo.created_at || lo.order_date)}</td>
                                        <td style={{ fontSize: '0.82rem' }}>{lo.test_name || lo.test?.name || '-'}</td>
                                        <td><span className={`badge bg-${lo.status === 'COMPLETED' ? 'success' : 'warning'}`} style={{ fontSize: '0.7rem' }}>{lo.status || '-'}</span></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Vitals History */}
                        <div className="col-md-6">
                          <div className="card border h-100">
                            <div className="card-header bg-white"><h6 className="mb-0"><i className="fas fa-heartbeat me-2 text-danger"></i>Vitals History ({patientHistory.vitals.length})</h6></div>
                            <div className="card-body p-0" style={{ maxHeight: 300, overflowY: 'auto' }}>
                              {patientHistory.vitals.length === 0 ? (
                                <div className="text-center text-muted py-3" style={{ fontSize: '0.85rem' }}>No records</div>
                              ) : (
                                <table className="table table-hover table-sm mb-0">
                                  <thead><tr><th>Date</th><th>BP</th><th>Temp</th><th>Weight</th></tr></thead>
                                  <tbody>
                                    {patientHistory.vitals.map((v, i) => (
                                      <tr key={v.id || i}>
                                        <td style={{ fontSize: '0.82rem' }}>{fmt(v.recorded_at || v.created_at)}</td>
                                        <td style={{ fontSize: '0.82rem' }}>{v.blood_pressure || v.bp || '-'}</td>
                                        <td style={{ fontSize: '0.82rem' }}>{v.temperature ? `${v.temperature}F` : '-'}</td>
                                        <td style={{ fontSize: '0.82rem' }}>{v.weight ? `${v.weight} kg` : '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {patientResults.length === 0 && !selectedPatient && !patientSearchLoading && (
                  <div className="text-center text-muted py-5">
                    <i className="fas fa-search fa-3x mb-3 d-block" style={{ opacity: 0.3 }}></i>
                    <p>Search for a patient to view their medical records</p>
                  </div>
                )}
              </div>
            )}

            {/* ═══ TAB 3: AVAILABLE STAFF ═══ */}
            {activeTab === 'staff' && (
              <div className="p-4">
                {staffLoading ? (
                  <Spinner className="py-5" />
                ) : staffList.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <i className="fas fa-users fa-3x mb-3 d-block" style={{ opacity: 0.3 }}></i>
                    <p>No staff records found</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#7f8c8d', background: '#fafbfc' }}>
                        <tr>
                          <th>Name</th>
                          <th>Role</th>
                          <th>Shift</th>
                          <th>Department</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffList.map(s => {
                          const att = attendanceLookup[s.id];
                          const onDuty = att ? att.status === 'PRESENT' || att.status === 'present' : false;
                          const onLeave = att ? att.status === 'ON_LEAVE' || att.status === 'ABSENT' || att.status === 'absent' : false;
                          return (
                            <tr key={s.id}>
                              <td style={{ fontWeight: 600, color: '#2c3e50' }}>
                                {s.first_name || s.user_first_name || ''} {s.last_name || s.user_last_name || ''}
                                {!s.first_name && !s.user_first_name && (s.name || `Staff #${s.id}`)}
                              </td>
                              <td>
                                <span className="badge bg-light text-dark border" style={{ fontSize: '0.78rem' }}>
                                  {s.role || s.designation || s.position || '-'}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.85rem', color: '#495057' }}>
                                {s.shift || s.shift_timing || '-'}
                              </td>
                              <td style={{ fontSize: '0.85rem', color: '#495057' }}>
                                {s.department_name || s.department || '-'}
                              </td>
                              <td>
                                {att ? (
                                  onDuty ? (
                                    <span className="badge bg-success" style={{ fontSize: '0.75rem' }}>
                                      <i className="fas fa-circle me-1" style={{ fontSize: '0.5rem' }}></i>On Duty
                                    </span>
                                  ) : onLeave ? (
                                    <span className="badge bg-warning text-dark" style={{ fontSize: '0.75rem' }}>
                                      <i className="fas fa-circle me-1" style={{ fontSize: '0.5rem' }}></i>On Leave
                                    </span>
                                  ) : (
                                    <span className="badge bg-secondary" style={{ fontSize: '0.75rem' }}>{att.status}</span>
                                  )
                                ) : (
                                  <span className="badge bg-light text-muted border" style={{ fontSize: '0.75rem' }}>No Record</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ═══ TAB 4: MY SCHEDULE ═══ */}
            {activeTab === 'schedule' && (
              <div className="p-4">
                {scheduleLoading ? (
                  <Spinner className="py-5" />
                ) : (
                  <div>
                    <h6 className="mb-3" style={{ color: '#1a5276', fontWeight: 700 }}>
                      <i className="fas fa-calendar-week me-2"></i>This Week's Schedule
                    </h6>
                    <div className="row g-3">
                      {weekGrouped.map(({ date, appts }) => {
                        const d = new Date(date + 'T00:00:00');
                        const isToday = date === today();
                        return (
                          <div className="col-12" key={date}>
                            <div
                              className="card border"
                              style={{
                                borderLeft: isToday ? '4px solid #0d6efd' : '4px solid #dee2e6',
                                borderRadius: 8,
                              }}
                            >
                              <div className="card-header bg-white d-flex justify-content-between align-items-center py-2">
                                <span style={{ fontWeight: 600, color: isToday ? '#0d6efd' : '#495057', fontSize: '0.9rem' }}>
                                  {d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                                  {isToday && <span className="badge bg-primary ms-2" style={{ fontSize: '0.65rem' }}>TODAY</span>}
                                </span>
                                <span className="badge bg-light text-dark border" style={{ fontSize: '0.78rem' }}>
                                  {appts.length} appointment{appts.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              {appts.length > 0 && (
                                <div className="card-body p-0">
                                  <table className="table table-hover table-sm mb-0">
                                    <thead style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#adb5bd' }}>
                                      <tr><th style={{ paddingLeft: '1rem' }}>Time</th><th>Patient</th><th>Reason</th><th>Status</th></tr>
                                    </thead>
                                    <tbody>
                                      {appts.map(a => (
                                        <tr key={a.id}>
                                          <td style={{ paddingLeft: '1rem', fontWeight: 500, fontSize: '0.85rem' }}>{fmtTime(a.appointment_time)}</td>
                                          <td style={{ fontSize: '0.85rem' }}>{a.patient_name || `Patient #${a.patient}`}</td>
                                          <td style={{ fontSize: '0.82rem', color: '#6c757d' }}>{a.reason || '-'}</td>
                                          <td>{statusBadge(a.status)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              {appts.length === 0 && (
                                <div className="card-body text-center text-muted py-2" style={{ fontSize: '0.82rem' }}>
                                  No appointments
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   INLINE PATIENT DETAILS (expanded row in Tab 1)
   ══════════════════════════════════════════════════════════════ */
const PatientInlineDetails = ({ data }) => {
  const { patient, vitals, allergies, prescriptions, labOrders, pastAppts } = data;

  return (
    <div className="p-4">
      <div className="row g-3">
        {/* Patient Info */}
        <div className="col-md-4">
          <div className="card border h-100">
            <div className="card-header bg-white py-2">
              <h6 className="mb-0" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                <i className="fas fa-user me-2 text-primary"></i>Patient Info
              </h6>
            </div>
            <div className="card-body py-2">
              {patient ? (
                <div style={{ fontSize: '0.84rem' }}>
                  <div className="mb-1"><strong>Name:</strong> {patient.first_name} {patient.last_name}</div>
                  <div className="mb-1"><strong>Age:</strong> {patient.age || calculateAge(patient.date_of_birth) || 'N/A'}</div>
                  <div className="mb-1"><strong>Gender:</strong> {patient.gender || 'N/A'}</div>
                  <div className="mb-1"><strong>Blood Group:</strong> {patient.blood_group || 'N/A'}</div>
                  <div className="mb-1"><strong>Phone:</strong> {patient.phone || patient.phone_number || 'N/A'}</div>
                  {allergies && allergies.length > 0 && (
                    <div className="mt-2">
                      <strong className="text-danger">Allergies:</strong>
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {allergies.map((a, i) => (
                          <span key={i} className="badge bg-danger bg-opacity-10 text-danger border border-danger" style={{ fontSize: '0.72rem' }}>
                            {a.allergen || a.name || a.allergy_name || a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>Unable to load</div>
              )}
            </div>
          </div>
        </div>

        {/* Current Visit Vitals */}
        <div className="col-md-4">
          <div className="card border h-100">
            <div className="card-header bg-white py-2">
              <h6 className="mb-0" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                <i className="fas fa-heartbeat me-2 text-danger"></i>Current Visit Vitals
              </h6>
            </div>
            <div className="card-body py-2">
              {vitals && vitals.length > 0 ? (
                <div style={{ fontSize: '0.84rem' }}>
                  {(() => {
                    const latest = Array.isArray(vitals) ? vitals[0] : vitals;
                    return (
                      <>
                        <div className="mb-1"><strong>BP:</strong> {latest.blood_pressure || latest.bp || 'N/A'}</div>
                        <div className="mb-1"><strong>Weight:</strong> {latest.weight ? `${latest.weight} kg` : 'N/A'}</div>
                        <div className="mb-1"><strong>Height:</strong> {latest.height ? `${latest.height} cm` : 'N/A'}</div>
                        <div className="mb-1"><strong>Temperature:</strong> {latest.temperature ? `${latest.temperature} F` : 'N/A'}</div>
                        <div className="mb-1"><strong>Pulse:</strong> {latest.pulse_rate || latest.pulse || 'N/A'}</div>
                        <div className="mb-1 text-muted" style={{ fontSize: '0.75rem' }}>
                          Recorded: {fmt(latest.recorded_at || latest.created_at)}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>No vitals recorded</div>
              )}
            </div>
          </div>
        </div>

        {/* Past Visits */}
        <div className="col-md-4">
          <div className="card border h-100">
            <div className="card-header bg-white py-2">
              <h6 className="mb-0" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                <i className="fas fa-history me-2 text-info"></i>Past Visits
              </h6>
            </div>
            <div className="card-body p-0" style={{ maxHeight: 200, overflowY: 'auto' }}>
              {pastAppts && pastAppts.length > 0 ? (
                <table className="table table-sm mb-0" style={{ fontSize: '0.8rem' }}>
                  <tbody>
                    {pastAppts.slice(0, 10).map(a => (
                      <tr key={a.id}>
                        <td>{fmt(a.appointment_date)}</td>
                        <td>{a.reason || '-'}</td>
                        <td>{statusBadge(a.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-muted py-3" style={{ fontSize: '0.82rem' }}>No past visits</div>
              )}
            </div>
          </div>
        </div>

        {/* Previous Prescriptions */}
        <div className="col-md-6">
          <div className="card border">
            <div className="card-header bg-white py-2">
              <h6 className="mb-0" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                <i className="fas fa-prescription me-2 text-success"></i>Previous Prescriptions
              </h6>
            </div>
            <div className="card-body p-0" style={{ maxHeight: 200, overflowY: 'auto' }}>
              {prescriptions && prescriptions.length > 0 ? (
                <table className="table table-hover table-sm mb-0" style={{ fontSize: '0.8rem' }}>
                  <thead><tr><th>Date</th><th>Diagnosis</th><th>Doctor</th></tr></thead>
                  <tbody>
                    {prescriptions.map(rx => (
                      <tr key={rx.id}>
                        <td>{fmt(rx.created_at || rx.date)}</td>
                        <td>{rx.diagnosis || '-'}</td>
                        <td>{rx.doctor_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-muted py-3" style={{ fontSize: '0.82rem' }}>No previous prescriptions</div>
              )}
            </div>
          </div>
        </div>

        {/* Previous Lab Reports */}
        <div className="col-md-6">
          <div className="card border">
            <div className="card-header bg-white py-2">
              <h6 className="mb-0" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                <i className="fas fa-flask me-2 text-warning"></i>Lab Reports
              </h6>
            </div>
            <div className="card-body p-0" style={{ maxHeight: 200, overflowY: 'auto' }}>
              {labOrders && labOrders.length > 0 ? (
                <table className="table table-hover table-sm mb-0" style={{ fontSize: '0.8rem' }}>
                  <thead><tr><th>Date</th><th>Test</th><th>Status</th></tr></thead>
                  <tbody>
                    {labOrders.map(lo => (
                      <tr key={lo.id}>
                        <td>{fmt(lo.created_at || lo.order_date)}</td>
                        <td>{lo.test_name || lo.test?.name || '-'}</td>
                        <td>
                          <span className={`badge bg-${lo.status === 'COMPLETED' ? 'success' : 'warning'}`} style={{ fontSize: '0.7rem' }}>
                            {lo.status || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-muted py-3" style={{ fontSize: '0.82rem' }}>No lab reports</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* helper for age calc from DOB */
function calculateAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export default DoctorDashboard;
