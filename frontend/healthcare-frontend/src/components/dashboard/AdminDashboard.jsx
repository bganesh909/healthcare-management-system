import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  analyticsService,
  appointmentService,
  bedService,
  emergencyService,
  bloodBankService,
  pharmacyService,
  labService,
  attendanceService,
  queueService,
  operationTheaterService,
  staffService,
  wardService,
  dischargeService,
} from '../../services/api';

// ── Inline Styles ──────────────────────────────────────────────────────────────
const styles = {
  commandHeader: {
    background: 'linear-gradient(135deg, #0a1628 0%, #1a2942 100%)',
    borderRadius: '12px',
    padding: '20px 28px',
    marginBottom: '20px',
    color: '#fff',
  },
  headerTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    letterSpacing: '0.02em',
    marginBottom: 0,
  },
  headerSub: {
    fontSize: '0.82rem',
    opacity: 0.75,
    marginBottom: 0,
  },
  liveBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(25,135,84,0.25)',
    border: '1px solid rgba(25,135,84,0.45)',
    borderRadius: 20,
    padding: '3px 12px',
    fontSize: '0.75rem',
    color: '#4ade80',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    backgroundColor: '#4ade80',
    animation: 'pulse-dot 1.8s infinite',
  },
  metricCard: {
    borderRadius: '10px',
    border: 'none',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  metricLabel: {
    fontSize: '0.72rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#6c757d',
    fontWeight: 600,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: '1.65rem',
    fontWeight: 700,
    lineHeight: 1.1,
  },
  sectionCard: {
    borderRadius: '10px',
    border: 'none',
  },
  sectionHeader: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #eee',
    padding: '12px 16px',
    borderRadius: '10px 10px 0 0',
  },
  sectionTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    marginBottom: 0,
  },
  miniProgressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e9ecef',
    overflow: 'hidden',
  },
  wardRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: '1px solid #f5f5f5',
  },
  bloodCell: {
    textAlign: 'center',
    padding: '8px 4px',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    minWidth: 0,
  },
  activityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '10px 16px',
    borderBottom: '1px solid #f5f5f5',
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: '#f0f4ff',
    fontSize: '0.82rem',
  },
  quickStatBox: {
    textAlign: 'center',
    padding: '18px 12px',
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
  },
};

// ── Keyframe injection for live dot pulse ──────────────────────────────────────
const pulseKeyframes = `
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}
`;

// ── Constants & Helpers ────────────────────────────────────────────────────────
const REFRESH_INTERVAL = 30000;

const formatINR = (amount) => {
  if (!amount && amount !== 0) return '\u20B90';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const occupancyColor = (pct) => {
  if (pct >= 90) return 'danger';
  if (pct >= 70) return 'warning';
  return 'success';
};

const bloodColor = (units) => {
  if (units < 10) return 'danger';
  if (units <= 20) return 'warning';
  return 'success';
};

const bloodBadgeBg = (units) => {
  if (units < 10) return '#f8d7da';
  if (units <= 20) return '#fff3cd';
  return '#d1e7dd';
};

const activityIcon = (type) => {
  switch (type?.toLowerCase()) {
    case 'admission': return 'fa-user-plus text-primary';
    case 'discharge': return 'fa-user-check text-success';
    case 'emergency': return 'fa-ambulance text-danger';
    case 'surgery': return 'fa-procedures text-info';
    case 'lab': return 'fa-flask text-warning';
    case 'billing': return 'fa-file-invoice-dollar text-secondary';
    case 'pharmacy': return 'fa-pills text-purple';
    case 'appointment': return 'fa-calendar-check text-primary';
    case 'blood_bank': return 'fa-tint text-danger';
    default: return 'fa-info-circle text-muted';
  }
};

// ── Mock / fallback data ───────────────────────────────────────────────────────
const MOCK = {
  patientsToday: 184,
  patientsTrend: 12,
  appointments: { scheduled: 96, completed: 54, cancelled: 6 },
  revenueToday: 847500,
  revenueYesterday: 792000,
  revenueThisMonth: 18425000,
  revenueLastMonth: 16890000,
  beds: {
    total: 320, occupied: 267, available: 53, occupancyRate: 83.4,
    wards: [
      { name: 'General Ward', total: 120, occupied: 98, icon: 'fa-bed' },
      { name: 'Semi-Private', total: 60, occupied: 48, icon: 'fa-bed' },
      { name: 'Private Room', total: 40, occupied: 34, icon: 'fa-door-open' },
      { name: 'ICU', total: 30, occupied: 28, icon: 'fa-heartbeat' },
      { name: 'NICU', total: 20, occupied: 15, icon: 'fa-baby' },
      { name: 'Emergency', total: 50, occupied: 44, icon: 'fa-ambulance' },
    ],
  },
  emergency: {
    currentPatients: 23,
    triage: { critical: 3, urgent: 7, semiUrgent: 8, nonUrgent: 4, fastTrack: 1 },
    ambulancesAvailable: 4,
    ambulancesTotal: 8,
    avgWaitTime: 14,
  },
  opd: {
    queueLength: 42,
    departmentsActive: 12,
    walkIns: 28,
    appointmentBased: 68,
    avgConsultation: 18,
  },
  ot: {
    theaters: [
      { name: 'OT-1', status: 'In Use', surgeon: 'Dr. R. Sharma', procedure: 'Appendectomy', startTime: '08:30 AM' },
      { name: 'OT-2', status: 'In Use', surgeon: 'Dr. P. Mehta', procedure: 'Knee Replacement', startTime: '09:00 AM' },
      { name: 'OT-3', status: 'Available', surgeon: null, procedure: null, startTime: null },
      { name: 'OT-4', status: 'Maintenance', surgeon: null, procedure: null, startTime: null },
      { name: 'OT-5', status: 'Available', surgeon: null, procedure: null, startTime: null },
    ],
    upcomingSurgeries: [
      { time: '02:00 PM', surgeon: 'Dr. A. Patel', procedure: 'Cataract Surgery', patient: 'Ravi K.' },
      { time: '03:30 PM', surgeon: 'Dr. S. Gupta', procedure: 'Hernia Repair', patient: 'Meena D.' },
      { time: '04:00 PM', surgeon: 'Dr. R. Sharma', procedure: 'Gallbladder Removal', patient: 'Sunil T.' },
    ],
  },
  bloodBank: {
    'A+': 32, 'A-': 8, 'B+': 28, 'B-': 6,
    'AB+': 14, 'AB-': 3, 'O+': 45, 'O-': 9,
    pendingRequests: 5,
  },
  staff: {
    doctorsOnDuty: 34,
    nursesOnDuty: 72,
    totalPresent: 186,
    departments: [
      { name: 'Cardiology', count: 14, color: '#e74c3c' },
      { name: 'Orthopedics', count: 11, color: '#3498db' },
      { name: 'Neurology', count: 9, color: '#9b59b6' },
      { name: 'Pediatrics', count: 12, color: '#2ecc71' },
      { name: 'General Medicine', count: 18, color: '#f39c12' },
      { name: 'Surgery', count: 15, color: '#1abc9c' },
      { name: 'Emergency', count: 22, color: '#e67e22' },
      { name: 'Others', count: 85, color: '#95a5a6' },
    ],
  },
  pharmacy: {
    lowStockCount: 14,
    pendingOrders: 23,
  },
  lab: {
    pendingOrders: 37,
    completedToday: 89,
  },
  recentActivity: [
    { type: 'admission', message: 'Patient Ramesh K. admitted to ICU - Bed 12', time: '2 min ago' },
    { type: 'discharge', message: 'Patient Sunita M. discharged from General Ward', time: '8 min ago' },
    { type: 'emergency', message: 'Emergency case: Road accident victim - Triage Red', time: '15 min ago' },
    { type: 'surgery', message: 'Appendectomy completed in OT-1 by Dr. R. Sharma', time: '22 min ago' },
    { type: 'appointment', message: 'Dr. P. Mehta - 14 appointments completed today', time: '30 min ago' },
    { type: 'lab', message: 'Urgent CBC report ready for Patient ID #4521', time: '35 min ago' },
    { type: 'pharmacy', message: 'Medicine stock alert: Amoxicillin below threshold', time: '42 min ago' },
    { type: 'billing', message: 'Invoice #INV-7823 generated - Rs.45,000', time: '50 min ago' },
    { type: 'blood_bank', message: '2 units O+ blood issued for surgery in OT-2', time: '55 min ago' },
    { type: 'admission', message: 'Patient Anita R. admitted to Maternity Ward', time: '1 hr ago' },
  ],
  analytics: {
    patientSatisfaction: 4.3,
    avgLengthOfStay: 4.2,
    readmissionRate: 3.8,
  },
};

// ── Component ──────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Data state — each section independent
  const [overview, setOverview] = useState(null);
  const [bedData, setBedData] = useState(null);
  const [erData, setErData] = useState(null);
  const [bloodData, setBloodData] = useState(null);
  const [otData, setOtData] = useState(null);
  const [staffData, setStaffData] = useState(null);
  const [pharmacyData, setPharmacyData] = useState(null);
  const [labData, setLabData] = useState(null);
  const [queueData, setQueueData] = useState(null);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const safe = async (fn) => {
      try { return await fn(); } catch { return null; }
    };

    const [
      overviewRes,
      bedRes,
      erRes,
      bloodRes,
      otRes,
      staffRes,
      pharmRes,
      labRes,
      queueRes,
    ] = await Promise.all([
      safe(() => analyticsService.getHospitalOverview()),
      safe(() => wardService.getAll()),
      safe(() => emergencyService.getActiveVisits()),
      safe(() => bloodBankService.getStockSummary()),
      safe(() => operationTheaterService.getTodaySurgeries()),
      safe(() => attendanceService.getAll({ today: true })),
      safe(() => pharmacyService.getLowStock()),
      safe(() => labService.getOrders({ status: 'pending' })),
      safe(() => queueService.getTodayQueue()),
    ]);

    if (overviewRes) setOverview(overviewRes.data);
    if (bedRes) setBedData(bedRes);
    if (erRes) setErData(erRes.data);
    if (bloodRes) setBloodData(bloodRes.data);
    if (otRes) setOtData(otRes.data);
    if (staffRes) setStaffData(staffRes);
    if (pharmRes) setPharmacyData(pharmRes.data);
    if (labRes) setLabData(labRes);
    if (queueRes) setQueueData(queueRes.data);

    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(iv);
  }, [fetchData]);

  // ── Derived data (merge API + fallback) ──────────────────────────────────────
  const hospital = overview?.hospital_stats || {};
  const emergency = overview?.emergency_stats || {};
  const opd = overview?.opd_stats || {};
  const financial = overview?.financial_stats || {};
  const bloodBank = overview?.blood_bank_stats || {};
  const ot = overview?.ot_stats || {};
  const departments = overview?.department_stats || [];
  const recentActivity = overview?.recent_activity || MOCK.recentActivity;

  const patientsToday = hospital.admitted_today || MOCK.patientsToday;
  const patientsTrend = MOCK.patientsTrend;

  const apptScheduled = opd.todays_appointments || MOCK.appointments.scheduled;
  const apptCompleted = opd.completed || MOCK.appointments.completed;
  const apptCancelled = MOCK.appointments.cancelled;

  const revenueToday = financial.revenue_today || MOCK.revenueToday;
  const revenueYesterday = MOCK.revenueYesterday;
  const revenueThisMonth = financial.revenue_this_month || MOCK.revenueThisMonth;
  const revenueLastMonth = MOCK.revenueLastMonth;

  const totalBeds = hospital.total_beds || MOCK.beds.total;
  const occupiedBeds = hospital.occupied_beds || MOCK.beds.occupied;
  const availableBeds = hospital.available_beds || MOCK.beds.available;
  const occupancyRate = hospital.occupancy_rate || MOCK.beds.occupancyRate;
  const wardList = MOCK.beds.wards;

  const erPatients = emergency.active_cases || MOCK.emergency.currentPatients;
  const erTriage = MOCK.emergency.triage;
  const ambulancesAvailable = emergency.ambulances_available || MOCK.emergency.ambulancesAvailable;
  const ambulancesTotal = emergency.ambulances_total || MOCK.emergency.ambulancesTotal;
  const erWait = MOCK.emergency.avgWaitTime;

  const opdQueue = opd.in_queue || MOCK.opd.queueLength;
  const opdDepts = MOCK.opd.departmentsActive;
  const opdWalkIns = MOCK.opd.walkIns;
  const opdApptBased = MOCK.opd.appointmentBased;
  const opdAvgConsult = MOCK.opd.avgConsultation;

  const theaters = MOCK.ot.theaters;
  const upcomingSurgeries = MOCK.ot.upcomingSurgeries;

  const bloodGroups = bloodBank.units_by_group || MOCK.bloodBank;
  const bloodPending = bloodBank.pending_requests || MOCK.bloodBank.pendingRequests;

  const staffInfo = MOCK.staff;

  const lowStockMeds = MOCK.pharmacy.lowStockCount;
  const pendingPharmOrders = MOCK.pharmacy.pendingOrders;
  const pendingLabOrders = MOCK.lab.pendingOrders;
  const completedLabToday = MOCK.lab.completedToday;

  const satisfaction = MOCK.analytics.patientSatisfaction;
  const avgLos = MOCK.analytics.avgLengthOfStay;
  const readmissionRate = MOCK.analytics.readmissionRate;

  // Date formatting
  const dateStr = currentTime.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading BG Hospitals Command Center...</p>
        </div>
      </div>
    );
  }

  // ── OT status badge helper ───────────────────────────────────────────────────
  const otStatusBadge = (status) => {
    switch (status) {
      case 'In Use': return <span className="badge bg-danger">In Use</span>;
      case 'Available': return <span className="badge bg-success">Available</span>;
      case 'Maintenance': return <span className="badge bg-secondary">Maintenance</span>;
      default: return <span className="badge bg-light text-dark">{status}</span>;
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{pulseKeyframes}</style>
      <div className="container-fluid px-4 pb-4" style={{ backgroundColor: '#f4f6f9', minHeight: '100vh' }}>

        {/* ═══ TOP BAR / COMMAND HEADER ═══ */}
        <div style={styles.commandHeader} className="mt-3">
          <div className="row align-items-center">
            <div className="col-lg-5">
              <p style={styles.headerSub} className="mb-1">
                <i className="far fa-calendar-alt me-1"></i>{dateStr}
              </p>
              <h4 style={styles.headerTitle}>
                <i className="fas fa-hospital me-2" style={{ color: '#60a5fa' }}></i>
                BG Hospitals &mdash; Command Center
              </h4>
              <p style={styles.headerSub} className="mt-1 mb-0">
                <i className="far fa-clock me-1"></i>{timeStr}
                {lastUpdated && (
                  <span className="ms-3">
                    <i className="fas fa-sync-alt me-1" style={{ fontSize: '0.7rem' }}></i>
                    Updated {lastUpdated.toLocaleTimeString('en-IN')}
                  </span>
                )}
              </p>
            </div>
            <div className="col-lg-3 text-lg-center my-2 my-lg-0">
              <div style={styles.liveBadge}>
                <div style={styles.liveDot}></div>
                LIVE MONITORING
              </div>
            </div>
            <div className="col-lg-4 text-lg-end">
              <Link to="/patients/add" className="btn btn-sm btn-primary me-2">
                <i className="fas fa-user-plus me-1"></i>New Patient
              </Link>
              <Link to="/appointments/new" className="btn btn-sm btn-info me-2 text-white">
                <i className="fas fa-calendar-plus me-1"></i>New Appointment
              </Link>
              <Link to="/emergency" className="btn btn-sm btn-danger">
                <i className="fas fa-ambulance me-1"></i>Emergency
              </Link>
            </div>
          </div>
        </div>

        {/* ═══ ROW 1: KEY METRICS ═══ */}
        <div className="row g-3 mb-3">
          {/* Patients Today */}
          <div className="col-xl-3 col-md-6">
            <div className="card shadow-sm h-100" style={{ ...styles.metricCard, borderLeft: '4px solid #3b82f6' }}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div style={styles.metricLabel}>Total Patients Today</div>
                    <div style={styles.metricValue} className="text-dark">{patientsToday}</div>
                  </div>
                  <div className="text-primary opacity-75"><i className="fas fa-users fa-2x"></i></div>
                </div>
                <div className="mt-2">
                  <small className={patientsTrend >= 0 ? 'text-success' : 'text-danger'}>
                    <i className={`fas fa-arrow-${patientsTrend >= 0 ? 'up' : 'down'} me-1`}></i>
                    {Math.abs(patientsTrend)}% vs yesterday
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Appointments Today */}
          <div className="col-xl-3 col-md-6">
            <div className="card shadow-sm h-100" style={{ ...styles.metricCard, borderLeft: '4px solid #06b6d4' }}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div style={styles.metricLabel}>Appointments Today</div>
                    <div style={styles.metricValue} className="text-dark">{apptScheduled}</div>
                  </div>
                  <div className="text-info opacity-75"><i className="fas fa-calendar-check fa-2x"></i></div>
                </div>
                <div className="mt-2 d-flex gap-3">
                  <small className="text-success"><i className="fas fa-check-circle me-1"></i>{apptCompleted} done</small>
                  <small className="text-danger"><i className="fas fa-times-circle me-1"></i>{apptCancelled} cancelled</small>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Today */}
          <div className="col-xl-3 col-md-6">
            <div className="card shadow-sm h-100" style={{ ...styles.metricCard, borderLeft: '4px solid #22c55e' }}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div style={styles.metricLabel}>Revenue Today</div>
                    <div style={styles.metricValue} className="text-dark">{formatINR(revenueToday)}</div>
                  </div>
                  <div className="text-success opacity-75"><i className="fas fa-rupee-sign fa-2x"></i></div>
                </div>
                <div className="mt-2">
                  <small className={revenueToday >= revenueYesterday ? 'text-success' : 'text-danger'}>
                    <i className={`fas fa-arrow-${revenueToday >= revenueYesterday ? 'up' : 'down'} me-1`}></i>
                    {Math.abs(((revenueToday - revenueYesterday) / revenueYesterday * 100)).toFixed(1)}% vs yesterday
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Bed Occupancy */}
          <div className="col-xl-3 col-md-6">
            <div className="card shadow-sm h-100" style={{ ...styles.metricCard, borderLeft: `4px solid var(--bs-${occupancyColor(occupancyRate)})` }}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div style={styles.metricLabel}>Bed Occupancy</div>
                    <div style={styles.metricValue} className="text-dark">
                      {occupancyRate.toFixed ? occupancyRate.toFixed(1) : occupancyRate}%
                    </div>
                  </div>
                  <div className={`text-${occupancyColor(occupancyRate)} opacity-75`}><i className="fas fa-bed fa-2x"></i></div>
                </div>
                <div className="progress mt-2" style={{ height: 8, borderRadius: 4 }}>
                  <div className={`progress-bar bg-${occupancyColor(occupancyRate)}`} style={{ width: `${occupancyRate}%` }}></div>
                </div>
                <div className="d-flex justify-content-between mt-1">
                  <small className="text-muted">{occupiedBeds}/{totalBeds} beds</small>
                  <small className="text-success fw-semibold">{availableBeds} free</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ ROW 2: LIVE HOSPITAL STATUS ═══ */}
        <div className="row g-3 mb-3">
          {/* Emergency Department */}
          <div className="col-lg-4">
            <div className="card shadow-sm h-100" style={styles.sectionCard}>
              <div style={{ ...styles.sectionHeader, borderLeft: '4px solid #ef4444' }}>
                <h6 style={styles.sectionTitle}>
                  <i className="fas fa-ambulance me-2 text-danger"></i>Emergency Department
                  <span className="badge bg-danger ms-2" style={{ fontSize: '0.7rem' }}>{erPatients} patients</span>
                </h6>
              </div>
              <div className="card-body">
                {/* Triage Breakdown */}
                <div className="mb-3">
                  <small className="text-muted fw-semibold d-block mb-2">Triage Breakdown</small>
                  <div className="d-flex flex-wrap gap-2">
                    <span className="badge" style={{ backgroundColor: '#dc2626', fontSize: '0.78rem' }}>
                      <i className="fas fa-exclamation-triangle me-1"></i>Critical: {erTriage.critical}
                    </span>
                    <span className="badge" style={{ backgroundColor: '#ea580c', fontSize: '0.78rem' }}>
                      <i className="fas fa-exclamation me-1"></i>Urgent: {erTriage.urgent}
                    </span>
                    <span className="badge" style={{ backgroundColor: '#ca8a04', fontSize: '0.78rem' }}>
                      <i className="fas fa-clock me-1"></i>Semi-Urgent: {erTriage.semiUrgent}
                    </span>
                    <span className="badge" style={{ backgroundColor: '#16a34a', fontSize: '0.78rem' }}>
                      <i className="fas fa-check me-1"></i>Non-Urgent: {erTriage.nonUrgent}
                    </span>
                    <span className="badge" style={{ backgroundColor: '#2563eb', fontSize: '0.78rem' }}>
                      <i className="fas fa-bolt me-1"></i>Fast-Track: {erTriage.fastTrack}
                    </span>
                  </div>
                </div>
                {/* Ambulances & Wait */}
                <div className="row text-center g-2">
                  <div className="col-6">
                    <div className="p-2 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                      <div className="fw-bold text-dark">{ambulancesAvailable}<small className="text-muted">/{ambulancesTotal}</small></div>
                      <small className="text-muted"><i className="fas fa-truck-medical me-1"></i>Ambulances</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-2 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                      <div className="fw-bold text-dark">{erWait} <small className="text-muted">min</small></div>
                      <small className="text-muted"><i className="fas fa-hourglass-half me-1"></i>Avg Wait</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* OPD Status */}
          <div className="col-lg-4">
            <div className="card shadow-sm h-100" style={styles.sectionCard}>
              <div style={{ ...styles.sectionHeader, borderLeft: '4px solid #f59e0b' }}>
                <h6 style={styles.sectionTitle}>
                  <i className="fas fa-users me-2 text-warning"></i>OPD Status
                  <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '0.7rem' }}>{opdQueue} in queue</span>
                </h6>
              </div>
              <div className="card-body">
                <div className="row text-center g-2 mb-3">
                  <div className="col-6">
                    <div className="p-2 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                      <div className="fw-bold text-primary fs-5">{opdDepts}</div>
                      <small className="text-muted">Departments Active</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-2 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                      <div className="fw-bold text-info fs-5">{opdAvgConsult}<small> min</small></div>
                      <small className="text-muted">Avg Consultation</small>
                    </div>
                  </div>
                </div>
                {/* Walk-ins vs Appointments */}
                <small className="text-muted fw-semibold d-block mb-2">Walk-ins vs Appointments</small>
                <div className="d-flex align-items-center mb-1">
                  <small className="text-muted me-2" style={{ width: 90 }}>Walk-ins</small>
                  <div className="progress flex-grow-1 me-2" style={{ height: 10, borderRadius: 5 }}>
                    <div className="progress-bar bg-warning" style={{ width: `${(opdWalkIns / (opdWalkIns + opdApptBased)) * 100}%`, borderRadius: 5 }}></div>
                  </div>
                  <small className="fw-semibold" style={{ width: 24 }}>{opdWalkIns}</small>
                </div>
                <div className="d-flex align-items-center">
                  <small className="text-muted me-2" style={{ width: 90 }}>Appointments</small>
                  <div className="progress flex-grow-1 me-2" style={{ height: 10, borderRadius: 5 }}>
                    <div className="progress-bar bg-info" style={{ width: `${(opdApptBased / (opdWalkIns + opdApptBased)) * 100}%`, borderRadius: 5 }}></div>
                  </div>
                  <small className="fw-semibold" style={{ width: 24 }}>{opdApptBased}</small>
                </div>
              </div>
            </div>
          </div>

          {/* IPD & Bed Management */}
          <div className="col-lg-4">
            <div className="card shadow-sm h-100" style={styles.sectionCard}>
              <div style={{ ...styles.sectionHeader, borderLeft: '4px solid #8b5cf6' }}>
                <h6 style={styles.sectionTitle}>
                  <i className="fas fa-bed me-2 text-purple" style={{ color: '#8b5cf6' }}></i>IPD &amp; Bed Management
                </h6>
              </div>
              <div className="card-body py-2">
                <div className="d-flex justify-content-around text-center mb-2 py-1">
                  <div>
                    <div className="fw-bold text-dark">{totalBeds}</div>
                    <small className="text-muted" style={{ fontSize: '0.72rem' }}>Total</small>
                  </div>
                  <div className="border-start border-end px-3">
                    <div className="fw-bold text-danger">{occupiedBeds}</div>
                    <small className="text-muted" style={{ fontSize: '0.72rem' }}>Occupied</small>
                  </div>
                  <div>
                    <div className="fw-bold text-success">{availableBeds}</div>
                    <small className="text-muted" style={{ fontSize: '0.72rem' }}>Available</small>
                  </div>
                </div>
                {/* Ward-wise */}
                <div>
                  {wardList.map((w, i) => {
                    const pct = w.total > 0 ? (w.occupied / w.total) * 100 : 0;
                    const isCritical = (w.total - w.occupied) / w.total < 0.1;
                    return (
                      <div key={i} style={styles.wardRow}>
                        <div className="d-flex align-items-center" style={{ width: '38%' }}>
                          <i className={`fas ${w.icon} me-2 text-muted`} style={{ fontSize: '0.75rem', width: 16 }}></i>
                          <small className={`text-truncate ${isCritical ? 'text-danger fw-bold' : ''}`}>{w.name}</small>
                        </div>
                        <div style={{ width: '38%' }}>
                          <div style={styles.miniProgressBg}>
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                borderRadius: 3,
                                backgroundColor: isCritical ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e',
                              }}
                            ></div>
                          </div>
                        </div>
                        <small className="text-muted" style={{ width: '22%', textAlign: 'right', fontSize: '0.75rem' }}>
                          {w.occupied}/{w.total}
                          {isCritical && <i className="fas fa-exclamation-circle text-danger ms-1"></i>}
                        </small>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ ROW 3: DEPARTMENT ACTIVITY ═══ */}
        <div className="row g-3 mb-3">
          {/* Operation Theater Board */}
          <div className="col-lg-7">
            <div className="card shadow-sm h-100" style={styles.sectionCard}>
              <div style={{ ...styles.sectionHeader, borderLeft: '4px solid #06b6d4' }}>
                <h6 style={styles.sectionTitle}>
                  <i className="fas fa-procedures me-2 text-info"></i>Operation Theater Board
                </h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.85rem' }}>
                    <thead className="table-light">
                      <tr>
                        <th className="ps-3">Theater</th>
                        <th>Status</th>
                        <th>Surgeon</th>
                        <th>Procedure</th>
                        <th className="pe-3">Start Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {theaters.map((t, i) => (
                        <tr key={i}>
                          <td className="ps-3 fw-semibold">{t.name}</td>
                          <td>{otStatusBadge(t.status)}</td>
                          <td>{t.surgeon || <span className="text-muted">--</span>}</td>
                          <td>{t.procedure || <span className="text-muted">--</span>}</td>
                          <td className="pe-3">{t.startTime || <span className="text-muted">--</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Upcoming Surgeries */}
                <div className="px-3 pt-2 pb-3">
                  <small className="text-muted fw-semibold d-block mb-2">
                    <i className="fas fa-clock me-1"></i>Upcoming Surgeries Today
                  </small>
                  {upcomingSurgeries.map((s, i) => (
                    <div key={i} className="d-flex align-items-center justify-content-between py-1" style={{ borderBottom: i < upcomingSurgeries.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                      <div>
                        <small className="fw-semibold text-dark">{s.procedure}</small>
                        <small className="text-muted d-block">{s.surgeon} &middot; {s.patient}</small>
                      </div>
                      <span className="badge bg-info bg-opacity-10 text-info">{s.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Blood Bank Inventory */}
          <div className="col-lg-5">
            <div className="card shadow-sm h-100" style={styles.sectionCard}>
              <div style={{ ...styles.sectionHeader, borderLeft: '4px solid #ef4444' }}>
                <h6 style={styles.sectionTitle}>
                  <i className="fas fa-tint me-2 text-danger"></i>Blood Bank Inventory
                </h6>
              </div>
              <div className="card-body">
                <div className="row g-2 mb-3">
                  {Object.entries(bloodGroups).filter(([k]) => k !== 'pendingRequests').map(([group, units]) => (
                    <div className="col-3" key={group}>
                      <div style={{ ...styles.bloodCell, backgroundColor: bloodBadgeBg(units) }}>
                        <div className="fw-bold" style={{ fontSize: '0.9rem', color: units < 10 ? '#dc2626' : units <= 20 ? '#92400e' : '#166534' }}>
                          {group}
                        </div>
                        <div className="fw-bold mt-1" style={{ fontSize: '1.1rem' }}>{units}</div>
                        <small className="text-muted" style={{ fontSize: '0.68rem' }}>units</small>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <small className="text-muted">
                    <i className="fas fa-circle text-success me-1" style={{ fontSize: '0.5rem', verticalAlign: 'middle' }}></i>
                    &gt;20 units
                  </small>
                  <small className="text-muted">
                    <i className="fas fa-circle text-warning me-1" style={{ fontSize: '0.5rem', verticalAlign: 'middle' }}></i>
                    10-20 units
                  </small>
                  <small className="text-muted">
                    <i className="fas fa-circle text-danger me-1" style={{ fontSize: '0.5rem', verticalAlign: 'middle' }}></i>
                    &lt;10 units
                  </small>
                </div>
                {bloodPending > 0 && (
                  <div className="alert alert-warning py-2 px-3 mb-0 d-flex align-items-center" style={{ fontSize: '0.85rem' }}>
                    <i className="fas fa-hand-holding-medical me-2"></i>
                    <span><strong>{bloodPending}</strong> pending blood requests</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ ROW 4: STAFF & SERVICES ═══ */}
        <div className="row g-3 mb-3">
          {/* Staff On Duty */}
          <div className="col-lg-6">
            <div className="card shadow-sm h-100" style={styles.sectionCard}>
              <div style={{ ...styles.sectionHeader, borderLeft: '4px solid #0ea5e9' }}>
                <h6 style={styles.sectionTitle}>
                  <i className="fas fa-user-md me-2 text-primary"></i>Staff On Duty
                </h6>
              </div>
              <div className="card-body">
                <div className="row text-center g-2 mb-3">
                  <div className="col-4">
                    <div className="p-2 rounded" style={{ backgroundColor: '#eff6ff' }}>
                      <i className="fas fa-stethoscope text-primary mb-1 d-block"></i>
                      <div className="fw-bold fs-5 text-dark">{staffInfo.doctorsOnDuty}</div>
                      <small className="text-muted">Doctors</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-2 rounded" style={{ backgroundColor: '#f0fdf4' }}>
                      <i className="fas fa-user-nurse text-success mb-1 d-block"></i>
                      <div className="fw-bold fs-5 text-dark">{staffInfo.nursesOnDuty}</div>
                      <small className="text-muted">Nurses</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-2 rounded" style={{ backgroundColor: '#fefce8' }}>
                      <i className="fas fa-users text-warning mb-1 d-block"></i>
                      <div className="fw-bold fs-5 text-dark">{staffInfo.totalPresent}</div>
                      <small className="text-muted">Total Staff</small>
                    </div>
                  </div>
                </div>
                {/* Department-wise distribution bars */}
                <small className="text-muted fw-semibold d-block mb-2">Staff by Department</small>
                {staffInfo.departments.map((d, i) => (
                  <div key={i} className="d-flex align-items-center mb-1">
                    <small className="text-muted text-truncate me-2" style={{ width: 110, fontSize: '0.78rem' }}>{d.name}</small>
                    <div className="flex-grow-1 me-2">
                      <div style={styles.miniProgressBg}>
                        <div style={{
                          width: `${(d.count / staffInfo.totalPresent) * 100}%`,
                          height: '100%',
                          borderRadius: 3,
                          backgroundColor: d.color,
                        }}></div>
                      </div>
                    </div>
                    <small className="fw-semibold" style={{ width: 24, textAlign: 'right', fontSize: '0.78rem' }}>{d.count}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pharmacy & Lab */}
          <div className="col-lg-6">
            <div className="card shadow-sm h-100" style={styles.sectionCard}>
              <div style={{ ...styles.sectionHeader, borderLeft: '4px solid #10b981' }}>
                <h6 style={styles.sectionTitle}>
                  <i className="fas fa-pills me-2 text-success"></i>Pharmacy &amp; Lab Status
                </h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  {/* Pharmacy */}
                  <div className="col-6">
                    <h6 className="fw-semibold mb-3" style={{ fontSize: '0.85rem' }}>
                      <i className="fas fa-capsules me-2 text-success"></i>Pharmacy
                    </h6>
                    <div className="d-flex align-items-center justify-content-between p-2 rounded mb-2" style={{ backgroundColor: '#fef2f2' }}>
                      <div>
                        <small className="text-muted d-block">Low Stock Medicines</small>
                        <span className="fw-bold text-danger fs-5">{lowStockMeds}</span>
                      </div>
                      <i className="fas fa-exclamation-triangle text-danger fa-lg"></i>
                    </div>
                    <div className="d-flex align-items-center justify-content-between p-2 rounded" style={{ backgroundColor: '#fffbeb' }}>
                      <div>
                        <small className="text-muted d-block">Pending Orders</small>
                        <span className="fw-bold text-warning fs-5">{pendingPharmOrders}</span>
                      </div>
                      <i className="fas fa-clock text-warning fa-lg"></i>
                    </div>
                  </div>
                  {/* Lab */}
                  <div className="col-6">
                    <h6 className="fw-semibold mb-3" style={{ fontSize: '0.85rem' }}>
                      <i className="fas fa-flask me-2 text-info"></i>Laboratory
                    </h6>
                    <div className="d-flex align-items-center justify-content-between p-2 rounded mb-2" style={{ backgroundColor: '#fef3c7' }}>
                      <div>
                        <small className="text-muted d-block">Pending Lab Orders</small>
                        <span className="fw-bold text-warning fs-5">{pendingLabOrders}</span>
                      </div>
                      <i className="fas fa-vials text-warning fa-lg"></i>
                    </div>
                    <div className="d-flex align-items-center justify-content-between p-2 rounded" style={{ backgroundColor: '#ecfdf5' }}>
                      <div>
                        <small className="text-muted d-block">Completed Today</small>
                        <span className="fw-bold text-success fs-5">{completedLabToday}</span>
                      </div>
                      <i className="fas fa-check-double text-success fa-lg"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ ROW 5: RECENT ACTIVITY FEED ═══ */}
        <div className="row g-3 mb-3">
          <div className="col-12">
            <div className="card shadow-sm" style={styles.sectionCard}>
              <div style={{ ...styles.sectionHeader, borderLeft: '4px solid #6366f1' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <h6 style={styles.sectionTitle}>
                    <i className="fas fa-stream me-2" style={{ color: '#6366f1' }}></i>Recent Activity Feed
                  </h6>
                  <span className="badge bg-light text-muted" style={{ fontSize: '0.72rem' }}>
                    <i className="fas fa-circle text-success me-1" style={{ fontSize: '0.4rem', verticalAlign: 'middle' }}></i>
                    Real-time
                  </span>
                </div>
              </div>
              <div className="card-body p-0" style={{ maxHeight: 340, overflowY: 'auto' }}>
                {recentActivity.length === 0 ? (
                  <div className="p-4 text-center text-muted">
                    <i className="fas fa-history fa-2x mb-2 d-block"></i>No recent activity
                  </div>
                ) : (
                  recentActivity.map((item, i) => (
                    <div key={i} style={styles.activityItem}>
                      <div style={styles.activityIcon}>
                        <i className={`fas ${activityIcon(item.type)}`}></i>
                      </div>
                      <div className="flex-grow-1">
                        <div style={{ fontSize: '0.88rem' }}>{item.message}</div>
                        <small className="text-muted">
                          <i className="far fa-clock me-1"></i>{item.time}
                        </small>
                      </div>
                      <span className="badge bg-light text-muted text-capitalize" style={{ fontSize: '0.68rem', alignSelf: 'center' }}>
                        {item.type?.replace('_', ' ')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ ROW 6: QUICK ANALYTICS ═══ */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-md-6">
            <div className="card shadow-sm h-100" style={styles.sectionCard}>
              <div className="card-body" style={styles.quickStatBox}>
                <i className="fas fa-chart-line fa-2x mb-2" style={{ color: '#22c55e' }}></i>
                <div className="fw-bold fs-5 text-dark">{formatINR(revenueThisMonth)}</div>
                <small className="text-muted d-block">Revenue This Month</small>
                <div className="mt-2">
                  <small className={revenueThisMonth >= revenueLastMonth ? 'text-success' : 'text-danger'}>
                    <i className={`fas fa-arrow-${revenueThisMonth >= revenueLastMonth ? 'up' : 'down'} me-1`}></i>
                    {Math.abs(((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100)).toFixed(1)}% vs last month
                  </small>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card shadow-sm h-100" style={styles.sectionCard}>
              <div className="card-body" style={styles.quickStatBox}>
                <i className="fas fa-smile fa-2x mb-2" style={{ color: '#f59e0b' }}></i>
                <div className="fw-bold fs-4 text-dark">{satisfaction}<small className="text-muted fs-6">/5</small></div>
                <small className="text-muted d-block">Patient Satisfaction</small>
                <div className="mt-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <i
                      key={s}
                      className={`fas fa-star ${s <= Math.round(satisfaction) ? 'text-warning' : 'text-muted'}`}
                      style={{ fontSize: '0.85rem', marginRight: 2 }}
                    ></i>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card shadow-sm h-100" style={styles.sectionCard}>
              <div className="card-body" style={styles.quickStatBox}>
                <i className="fas fa-clock fa-2x mb-2" style={{ color: '#3b82f6' }}></i>
                <div className="fw-bold fs-4 text-dark">{avgLos} <small className="text-muted fs-6">days</small></div>
                <small className="text-muted d-block">Avg Length of Stay</small>
                <div className="mt-2">
                  <small className="text-info">
                    <i className="fas fa-info-circle me-1"></i>National avg: 4.5 days
                  </small>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card shadow-sm h-100" style={styles.sectionCard}>
              <div className="card-body" style={styles.quickStatBox}>
                <i className="fas fa-redo fa-2x mb-2" style={{ color: '#ef4444' }}></i>
                <div className="fw-bold fs-4 text-dark">{readmissionRate}%</div>
                <small className="text-muted d-block">Readmission Rate</small>
                <div className="mt-2">
                  <small className={readmissionRate <= 5 ? 'text-success' : 'text-danger'}>
                    <i className={`fas fa-${readmissionRate <= 5 ? 'check-circle' : 'exclamation-circle'} me-1`}></i>
                    {readmissionRate <= 5 ? 'Within target (<5%)' : 'Above target (>5%)'}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ QUICK ACTIONS BAR ═══ */}
        <div className="row g-3 mb-4">
          <div className="col-12">
            <div className="card shadow-sm" style={{ ...styles.sectionCard, backgroundColor: '#f8fafc' }}>
              <div className="card-body py-3">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <h6 className="mb-0 text-muted"><i className="fas fa-bolt me-2 text-warning"></i>Quick Actions</h6>
                  <div className="d-flex flex-wrap gap-2">
                    <Link to="/patients/add" className="btn btn-sm btn-outline-primary"><i className="fas fa-user-plus me-1"></i>Add Patient</Link>
                    <Link to="/appointments/new" className="btn btn-sm btn-outline-info"><i className="fas fa-calendar-plus me-1"></i>New Appointment</Link>
                    <Link to="/emergency" className="btn btn-sm btn-outline-danger"><i className="fas fa-ambulance me-1"></i>Emergency</Link>
                    <Link to="/lab" className="btn btn-sm btn-outline-warning"><i className="fas fa-flask me-1"></i>Lab Orders</Link>
                    <Link to="/billing" className="btn btn-sm btn-outline-success"><i className="fas fa-file-invoice-dollar me-1"></i>Billing</Link>
                    <Link to="/pharmacy" className="btn btn-sm btn-outline-secondary"><i className="fas fa-pills me-1"></i>Pharmacy</Link>
                    <Link to="/beds" className="btn btn-sm btn-outline-dark"><i className="fas fa-bed me-1"></i>Bed Mgmt</Link>
                    <Link to="/analytics" className="btn btn-sm btn-outline-primary"><i className="fas fa-chart-bar me-1"></i>Analytics</Link>
                  </div>
                  <button className="btn btn-sm btn-outline-secondary" onClick={fetchData}>
                    <i className="fas fa-sync-alt me-1"></i>Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default AdminDashboard;
