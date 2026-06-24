import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  patientService,
  appointmentService,
  prescriptionService,
  labService,
  vitalsService,
  allergyService,
  dischargeService,
  pharmacyService,
} from '../../services/api';
import './PatientManagement.css';

const PatientManagement = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, isStaff } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState([]);
  const [overdueFollowUps, setOverdueFollowUps] = useState([]);
  const [patients, setPatients] = useState([]);
  const [pendingLabs, setPendingLabs] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [toast, setToast] = useState(null);

  // Patient detail panel
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [panelTab, setPanelTab] = useState('visits');
  const [panelLoading, setPanelLoading] = useState(false);
  const [patientVisits, setPatientVisits] = useState([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);
  const [patientLabOrders, setPatientLabOrders] = useState([]);
  const [patientUpcoming, setPatientUpcoming] = useState([]);
  const [patientVitals, setPatientVitals] = useState(null);
  const [patientAllergies, setPatientAllergies] = useState([]);

  // Show toast
  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [todayRes, upcomingRes, upFollowRes, overdueRes, patientsRes] = await Promise.allSettled([
        appointmentService.getToday(),
        appointmentService.getUpcoming(),
        dischargeService.getUpcomingFollowUps(),
        dischargeService.getOverdueFollowUps(),
        patientService.getAll({ page_size: 500 }),
      ]);

      if (todayRes.status === 'fulfilled') setTodayAppointments(todayRes.value.data || []);
      if (upcomingRes.status === 'fulfilled') setUpcomingAppointments(upcomingRes.value.data || []);
      if (upFollowRes.status === 'fulfilled') setUpcomingFollowUps(upFollowRes.value.data?.results || upFollowRes.value.data || []);
      if (overdueRes.status === 'fulfilled') setOverdueFollowUps(overdueRes.value.data?.results || overdueRes.value.data || []);
      if (patientsRes.status === 'fulfilled') setPatients(patientsRes.value.data || []);

      // Non-critical fetches
      try {
        const labRes = await labService.getOrders({ status: 'pending' });
        setPendingLabs(labRes.data?.length || labRes.count || 0);
      } catch { setPendingLabs(0); }

      try {
        const stockRes = await pharmacyService.getLowStock();
        const stockData = stockRes.data?.results || stockRes.data || [];
        setLowStockCount(Array.isArray(stockData) ? stockData.length : 0);
      } catch { setLowStockCount(0); }

    } catch (err) {
      console.error('Dashboard fetch error:', err);
      showToast('Failed to load dashboard data', true);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!isAdmin && !isStaff) {
      navigate('/dashboard');
      return;
    }
    fetchDashboardData();
  }, [isAuthenticated, isAdmin, isStaff, navigate, fetchDashboardData]);

  // Open patient detail panel
  const openPatientPanel = useCallback(async (patient) => {
    setSelectedPatient(patient);
    setPanelTab('visits');
    setPanelLoading(true);

    const pid = patient.id;
    try {
      const [visitsRes, rxRes, labRes, vitalsRes, allergyRes] = await Promise.allSettled([
        appointmentService.getAll({ patient: pid }),
        prescriptionService.getByPatient(pid),
        labService.getOrdersByPatient(pid),
        vitalsService.getLatestByPatient(pid),
        allergyService.getByPatient(pid),
      ]);

      setPatientVisits(visitsRes.status === 'fulfilled' ? (visitsRes.value.data || []) : []);
      const rxData = rxRes.status === 'fulfilled' ? (rxRes.value.data?.results || rxRes.value.data || []) : [];
      setPatientPrescriptions(Array.isArray(rxData) ? rxData : []);
      const labData = labRes.status === 'fulfilled' ? (labRes.value.data?.results || labRes.value.data || []) : [];
      setPatientLabOrders(Array.isArray(labData) ? labData : []);
      setPatientVitals(vitalsRes.status === 'fulfilled' ? vitalsRes.value.data : null);
      const alData = allergyRes.status === 'fulfilled' ? (allergyRes.value.data?.results || allergyRes.value.data || []) : [];
      setPatientAllergies(Array.isArray(alData) ? alData : []);

      // filter upcoming for this patient
      setPatientUpcoming(upcomingAppointments.filter(a =>
        (a.patient === pid || a.patient_id === pid || a.patient_detail?.id === pid)
      ));
    } catch (err) {
      console.error('Panel fetch error:', err);
    }
    setPanelLoading(false);
  }, [upcomingAppointments]);

  // Actions
  const handleCheckIn = async (id) => {
    try {
      await appointmentService.checkIn(id);
      showToast('Patient checked in successfully');
      fetchDashboardData();
    } catch {
      showToast('Check-in failed', true);
    }
  };

  const handleCheckOut = async (id) => {
    try {
      await appointmentService.checkOut(id);
      showToast('Patient checked out successfully');
      fetchDashboardData();
    } catch {
      showToast('Check-out failed', true);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await appointmentService.update(id, { status: 'cancelled' });
      showToast('Appointment cancelled');
      fetchDashboardData();
    } catch {
      showToast('Cancellation failed', true);
    }
  };

  const handleSendReminder = (patientName) => {
    showToast(`Reminder sent to patient ${patientName}`);
  };

  const handleCallPatient = (phone) => {
    showToast(`Patient phone: ${phone || 'Not available'}`);
  };

  // Helpers
  const getStatusBadge = (status) => {
    const map = {
      waiting: 'waiting',
      scheduled: 'scheduled',
      in_consultation: 'in-consultation',
      in_progress: 'in-consultation',
      completed: 'completed',
      checked_in: 'checked-in',
      no_show: 'no-show',
      cancelled: 'cancelled',
    };
    const label = (status || '').replace(/_/g, ' ');
    return <span className={`pm-badge ${map[status] || 'waiting'}`}>{label || 'Scheduled'}</span>;
  };

  const getPatientName = (appt) => {
    if (appt.patient_name) return appt.patient_name;
    if (appt.patient_detail) return `${appt.patient_detail.first_name || ''} ${appt.patient_detail.last_name || ''}`.trim();
    return `Patient #${appt.patient || appt.patient_id || ''}`;
  };

  const getDoctorName = (appt) => {
    if (appt.doctor_name) return appt.doctor_name;
    if (appt.doctor_detail) return `Dr. ${appt.doctor_detail.first_name || ''} ${appt.doctor_detail.last_name || ''}`.trim();
    return `Doctor #${appt.doctor || appt.doctor_id || ''}`;
  };

  const getDepartment = (appt) => {
    return appt.department_name || appt.doctor_detail?.department_name || appt.department || '-';
  };

  const getTimeStr = (appt) => {
    if (appt.appointment_time) {
      const parts = appt.appointment_time.split(':');
      if (parts.length >= 2) {
        const h = parseInt(parts[0]);
        const m = parts[1];
        const ampm = h >= 12 ? 'PM' : 'AM';
        return `${h > 12 ? h - 12 : h || 12}:${m} ${ampm}`;
      }
    }
    if (appt.time_slot_detail?.start_time) return appt.time_slot_detail.start_time;
    return appt.start_time || '-';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Group upcoming appointments by date
  const groupByDate = (appointments) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const nextWeekEnd = new Date(now);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 14);

    const groups = { 'Today': [], 'Tomorrow': [], 'This Week': [], 'Next Week': [], 'Later': [] };
    (appointments || []).forEach(a => {
      const d = a.appointment_date || a.date;
      if (!d) { groups['Later'].push(a); return; }
      if (d === todayStr) groups['Today'].push(a);
      else if (d === tomorrowStr) groups['Tomorrow'].push(a);
      else if (d <= weekEnd.toISOString().split('T')[0]) groups['This Week'].push(a);
      else if (d <= nextWeekEnd.toISOString().split('T')[0]) groups['Next Week'].push(a);
      else groups['Later'].push(a);
    });
    return groups;
  };

  const getUrgencyClass = (appt) => {
    const d = appt.appointment_date || appt.date;
    const t = appt.appointment_time || appt.start_time;
    if (!d) return '';
    const apptDate = new Date(`${d}T${t || '23:59'}`);
    const now = new Date();
    const hoursAway = (apptDate - now) / (1000 * 60 * 60);
    if (hoursAway <= 1 && hoursAway > 0) return 'urgent-high';
    if (hoursAway <= 24 && hoursAway > 0) return 'urgent-medium';
    return '';
  };

  const getDaysOverdue = (dateStr) => {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((now - d) / (1000 * 60 * 60 * 24));
  };

  // Summary counts
  const totalToday = todayAppointments.length;
  const checkedInCount = todayAppointments.filter(a => a.status === 'checked_in' || a.status === 'in_consultation' || a.status === 'in_progress').length;
  const completedCount = todayAppointments.filter(a => a.status === 'completed').length;
  const pendingCount = todayAppointments.filter(a => a.status === 'scheduled' || a.status === 'waiting').length;
  const noShowCount = todayAppointments.filter(a => a.status === 'no_show').length;

  // Filter logic
  const getFilteredPatients = () => {
    let list = patients;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
        (p.phone || '').includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.patient_id || '').toLowerCase().includes(q)
      );
    }
    return list;
  };

  // Filter appointment list for search
  const filteredTodayAppointments = searchQuery.trim()
    ? todayAppointments.filter(a => getPatientName(a).toLowerCase().includes(searchQuery.toLowerCase()))
    : todayAppointments;

  if (!isAuthenticated || (!isAdmin && !isStaff)) return null;

  if (loading) {
    return (
      <div className="pm-dashboard">
        <div className="pm-loading">
          <div className="spinner-border text-primary me-2" role="status"></div>
          Loading Patient Management Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="pm-dashboard">
      {/* Header */}
      <div className="page-header">
        <h2><i className="fas fa-hospital-user me-2"></i>Patient Management</h2>
        <div className="header-actions">
          <Link to="/patients/add" className="btn btn-primary btn-sm">
            <i className="fas fa-user-plus me-1"></i> Register Patient
          </Link>
          <Link to="/appointments/add" className="btn btn-outline-primary btn-sm">
            <i className="fas fa-calendar-plus me-1"></i> Schedule Appointment
          </Link>
          <button className="btn btn-outline-secondary btn-sm" onClick={fetchDashboardData}>
            <i className="fas fa-sync-alt me-1"></i> Refresh
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="pm-search-bar">
        <div className="row align-items-center g-2">
          <div className="col-md-5">
            <div className="search-input-group">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                className="form-control"
                placeholder="Search patients by name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-7">
            <div className="pm-filter-pills">
              <button className={`btn btn-sm ${activeFilter === 'all' ? 'btn-primary active' : 'btn-outline-secondary'}`} onClick={() => setActiveFilter('all')}>
                <i className="fas fa-users me-1"></i> All Patients
              </button>
              <button className={`btn btn-sm ${activeFilter === 'today' ? 'btn-primary active' : 'btn-outline-secondary'}`} onClick={() => setActiveFilter('today')}>
                <i className="fas fa-calendar-day me-1"></i> Today's Appointments
              </button>
              <button className={`btn btn-sm ${activeFilter === 'upcoming-followups' ? 'btn-primary active' : 'btn-outline-secondary'}`} onClick={() => setActiveFilter('upcoming-followups')}>
                <i className="fas fa-clock me-1"></i> Upcoming Follow-ups
              </button>
              <button className={`btn btn-sm ${activeFilter === 'overdue' ? 'btn-danger active' : 'btn-outline-danger'}`} onClick={() => setActiveFilter('overdue')}>
                <i className="fas fa-exclamation-triangle me-1"></i> Overdue ({overdueFollowUps.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="pm-summary-cards">
        <div className="pm-summary-card">
          <div className="card-icon total"><i className="fas fa-calendar-check"></i></div>
          <div className="card-info"><h4>{totalToday}</h4><p>Total Today</p></div>
        </div>
        <div className="pm-summary-card">
          <div className="card-icon checked-in"><i className="fas fa-user-check"></i></div>
          <div className="card-info"><h4>{checkedInCount}</h4><p>Checked In</p></div>
        </div>
        <div className="pm-summary-card">
          <div className="card-icon completed"><i className="fas fa-check-circle"></i></div>
          <div className="card-info"><h4>{completedCount}</h4><p>Completed</p></div>
        </div>
        <div className="pm-summary-card">
          <div className="card-icon pending"><i className="fas fa-hourglass-half"></i></div>
          <div className="card-info"><h4>{pendingCount}</h4><p>Pending</p></div>
        </div>
        <div className="pm-summary-card">
          <div className="card-icon no-show"><i className="fas fa-user-slash"></i></div>
          <div className="card-info"><h4>{noShowCount}</h4><p>No Shows</p></div>
        </div>
      </div>

      {/* Section 1: Today's Schedule Board */}
      {(activeFilter === 'all' || activeFilter === 'today') && (
        <div className="pm-section">
          <div className="pm-section-header">
            <h5><i className="fas fa-clipboard-list me-2"></i>Today's Schedule Board - {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</h5>
            <span className="text-muted small">{filteredTodayAppointments.length} appointments</span>
          </div>
          <div className="pm-section-body p-0">
            {filteredTodayAppointments.length === 0 ? (
              <div className="pm-empty">
                <i className="fas fa-calendar-times"></i>
                No appointments scheduled for today
              </div>
            ) : (
              <div className="table-responsive">
                <table className="pm-schedule-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Patient Name</th>
                      <th>Doctor</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Token</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTodayAppointments.map(appt => (
                      <tr key={appt.id}>
                        <td><strong>{getTimeStr(appt)}</strong></td>
                        <td>
                          <span
                            className="patient-name-cell"
                            onClick={() => {
                              const p = patients.find(pt => pt.id === (appt.patient || appt.patient_id || appt.patient_detail?.id));
                              if (p) openPatientPanel(p);
                              else if (appt.patient_detail) openPatientPanel(appt.patient_detail);
                            }}
                          >
                            {getPatientName(appt)}
                          </span>
                        </td>
                        <td>{getDoctorName(appt)}</td>
                        <td>{getDepartment(appt)}</td>
                        <td>{getStatusBadge(appt.status)}</td>
                        <td>{appt.token_number || appt.queue_number || '-'}</td>
                        <td>
                          {(appt.status === 'scheduled' || appt.status === 'waiting') && (
                            <button className="pm-action-btn check-in" onClick={() => handleCheckIn(appt.id)} title="Check In">
                              <i className="fas fa-sign-in-alt"></i> Check In
                            </button>
                          )}
                          {(appt.status === 'checked_in' || appt.status === 'in_consultation' || appt.status === 'in_progress') && (
                            <button className="pm-action-btn check-out" onClick={() => handleCheckOut(appt.id)} title="Check Out">
                              <i className="fas fa-sign-out-alt"></i> Check Out
                            </button>
                          )}
                          <Link to={`/appointments/${appt.id}`} className="pm-action-btn view" title="View">
                            <i className="fas fa-eye"></i>
                          </Link>
                          {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                            <button className="pm-action-btn cancel" onClick={() => handleCancel(appt.id)} title="Cancel">
                              <i className="fas fa-times"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section: Patient Search Results */}
      {activeFilter === 'all' && searchQuery.trim() && (
        <div className="pm-section">
          <div className="pm-section-header">
            <h5><i className="fas fa-search me-2"></i>Patient Search Results</h5>
            <span className="text-muted small">{getFilteredPatients().length} found</span>
          </div>
          <div className="pm-section-body p-0">
            {getFilteredPatients().length === 0 ? (
              <div className="pm-empty">
                <i className="fas fa-user-slash"></i>
                No patients match your search
              </div>
            ) : (
              <div className="table-responsive">
                <table className="pm-schedule-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Gender</th>
                      <th>Blood Group</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredPatients().slice(0, 50).map(p => (
                      <tr key={p.id}>
                        <td>
                          <span className="patient-name-cell" onClick={() => openPatientPanel(p)}>
                            {p.first_name} {p.last_name}
                          </span>
                        </td>
                        <td>{p.phone || '-'}</td>
                        <td>{p.email || '-'}</td>
                        <td className="text-capitalize">{p.gender || '-'}</td>
                        <td>{p.blood_group || '-'}</td>
                        <td>
                          <button className="pm-action-btn view" onClick={() => openPatientPanel(p)}>
                            <i className="fas fa-eye me-1"></i>View
                          </button>
                          <Link to={`/patients/${p.id}`} className="pm-action-btn check-out">
                            <i className="fas fa-external-link-alt me-1"></i>Full Profile
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 3: Upcoming Appointments & Reminders */}
      {(activeFilter === 'all' || activeFilter === 'upcoming-followups') && (
        <div className="pm-section">
          <div className="pm-section-header">
            <h5><i className="fas fa-calendar-alt me-2"></i>Upcoming Appointments & Reminders</h5>
            <span className="text-muted small">{upcomingAppointments.length} upcoming</span>
          </div>
          <div className="pm-section-body">
            {upcomingAppointments.length === 0 ? (
              <div className="pm-empty">
                <i className="fas fa-calendar-check"></i>
                No upcoming appointments
              </div>
            ) : (
              Object.entries(groupByDate(upcomingAppointments)).map(([label, appts]) => {
                if (appts.length === 0) return null;
                return (
                  <div key={label} className="pm-upcoming-group">
                    <h6>{label} ({appts.length})</h6>
                    {appts.map(appt => (
                      <div key={appt.id} className={`pm-upcoming-item ${getUrgencyClass(appt)}`}>
                        <div className="item-details">
                          <span className="item-time">{getTimeStr(appt)}</span>
                          <div className="item-info">
                            <div className="patient">{getPatientName(appt)}</div>
                            <div className="doctor">{getDoctorName(appt)} &middot; {getDepartment(appt)}</div>
                          </div>
                        </div>
                        <div>
                          {getStatusBadge(appt.status)}
                          <button className="pm-action-btn reminder ms-2" onClick={() => handleSendReminder(getPatientName(appt))}>
                            <i className="fas fa-bell"></i> Remind
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}

            {/* Follow-up reminders from discharge */}
            {upcomingFollowUps.length > 0 && (
              <div className="pm-upcoming-group mt-3">
                <h6><i className="fas fa-redo me-1"></i> Follow-up Reminders ({upcomingFollowUps.length})</h6>
                {upcomingFollowUps.slice(0, 10).map((fu, idx) => (
                  <div key={fu.id || idx} className="pm-upcoming-item">
                    <div className="item-details">
                      <span className="item-time">{formatDate(fu.follow_up_date || fu.scheduled_date || fu.date)}</span>
                      <div className="item-info">
                        <div className="patient">{fu.patient_name || `Patient #${fu.patient || ''}`}</div>
                        <div className="doctor">{fu.doctor_name || ''} &middot; {fu.follow_up_type || fu.type || 'Follow-up'}</div>
                      </div>
                    </div>
                    <button className="pm-action-btn reminder" onClick={() => handleSendReminder(fu.patient_name || 'patient')}>
                      <i className="fas fa-bell"></i> Remind
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 4: Follow-up Tracker */}
      {(activeFilter === 'all' || activeFilter === 'upcoming-followups' || activeFilter === 'overdue') && (
        <div className="pm-section">
          <div className="pm-section-header">
            <h5><i className="fas fa-clipboard-check me-2"></i>Follow-up Tracker</h5>
          </div>
          <div className="pm-section-body">
            <div className="row">
              {/* Upcoming Follow-ups */}
              <div className="col-md-6 mb-3">
                <h6 className="fw-bold mb-3"><i className="fas fa-clock text-primary me-1"></i> Upcoming Follow-ups ({upcomingFollowUps.length})</h6>
                {upcomingFollowUps.length === 0 ? (
                  <div className="pm-empty"><i className="fas fa-check-circle"></i>No upcoming follow-ups</div>
                ) : (
                  upcomingFollowUps.slice(0, 10).map((fu, idx) => (
                    <div key={fu.id || idx} className="pm-followup-card">
                      <div className="followup-header">
                        <span className="patient">{fu.patient_name || `Patient #${fu.patient || ''}`}</span>
                        <span className="pm-badge scheduled">{fu.status || 'Scheduled'}</span>
                      </div>
                      <div className="followup-meta">
                        <i className="fas fa-user-md me-1"></i>{fu.doctor_name || 'Doctor'} &middot;
                        <i className="fas fa-calendar ms-2 me-1"></i>{formatDate(fu.follow_up_date || fu.scheduled_date || fu.date)} &middot;
                        <span className="ms-1">{fu.follow_up_type || fu.type || 'Follow-up'}</span>
                      </div>
                      <div className="followup-actions">
                        <button className="pm-action-btn call" onClick={() => handleCallPatient(fu.patient_phone || fu.phone)}>
                          <i className="fas fa-phone me-1"></i>Call
                        </button>
                        <button className="pm-action-btn reschedule" onClick={() => showToast('Reschedule feature coming soon')}>
                          <i className="fas fa-calendar-alt me-1"></i>Reschedule
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Overdue Follow-ups */}
              <div className="col-md-6 mb-3">
                <h6 className="fw-bold mb-3"><i className="fas fa-exclamation-circle text-danger me-1"></i> Overdue Follow-ups ({overdueFollowUps.length})</h6>
                {overdueFollowUps.length === 0 ? (
                  <div className="pm-empty"><i className="fas fa-check-circle"></i>No overdue follow-ups</div>
                ) : (
                  overdueFollowUps.slice(0, 10).map((fu, idx) => {
                    const days = getDaysOverdue(fu.follow_up_date || fu.scheduled_date || fu.date);
                    return (
                      <div key={fu.id || idx} className="pm-followup-card overdue">
                        <div className="followup-header">
                          <span className="patient">{fu.patient_name || `Patient #${fu.patient || ''}`}</span>
                          <span className="days-overdue">{days} day{days !== 1 ? 's' : ''} overdue</span>
                        </div>
                        <div className="followup-meta">
                          <i className="fas fa-user-md me-1"></i>{fu.doctor_name || 'Doctor'} &middot;
                          <i className="fas fa-calendar ms-2 me-1"></i>{formatDate(fu.follow_up_date || fu.scheduled_date || fu.date)} &middot;
                          <span className="ms-1">{fu.follow_up_type || fu.type || 'Follow-up'}</span>
                        </div>
                        <div className="followup-actions">
                          <button className="pm-action-btn call" onClick={() => handleCallPatient(fu.patient_phone || fu.phone)}>
                            <i className="fas fa-phone me-1"></i>Call
                          </button>
                          <button className="pm-action-btn reschedule" onClick={() => showToast('Reschedule feature coming soon')}>
                            <i className="fas fa-calendar-alt me-1"></i>Reschedule
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Pending Actions Summary */}
      {activeFilter === 'all' && (
        <div className="pm-section">
          <div className="pm-section-header">
            <h5><i className="fas fa-tasks me-2"></i>Pending Actions Summary</h5>
          </div>
          <div className="pm-section-body">
            <div className="pm-pending-grid">
              <div className="pm-pending-item">
                <div className="pending-icon lab"><i className="fas fa-flask"></i></div>
                <div className="pending-info">
                  <h5>{pendingLabs}</h5>
                  <p>Pending Lab Results</p>
                </div>
              </div>
              <div className="pm-pending-item">
                <div className="pending-icon discharge"><i className="fas fa-file-medical"></i></div>
                <div className="pending-info">
                  <h5>{pendingCount}</h5>
                  <p>Patients Waiting</p>
                </div>
              </div>
              <div className="pm-pending-item">
                <div className="pending-icon followup"><i className="fas fa-exclamation-triangle"></i></div>
                <div className="pending-info">
                  <h5>{overdueFollowUps.length}</h5>
                  <p>Overdue Follow-ups</p>
                </div>
              </div>
              <div className="pm-pending-item">
                <div className="pending-icon medicine"><i className="fas fa-pills"></i></div>
                <div className="pending-info">
                  <h5>{lowStockCount}</h5>
                  <p>Low Stock Medicines</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Detail Panel (Slide-in) */}
      {selectedPatient && (
        <>
          <div className="pm-panel-overlay" onClick={() => setSelectedPatient(null)}></div>
          <div className="pm-patient-panel">
            <div className="pm-panel-header">
              <div className="patient-info">
                <h4>{selectedPatient.first_name} {selectedPatient.last_name}</h4>
                <div className="patient-meta">
                  {selectedPatient.age && <span><i className="fas fa-birthday-cake"></i> {selectedPatient.age} yrs</span>}
                  {selectedPatient.date_of_birth && !selectedPatient.age && <span><i className="fas fa-birthday-cake"></i> DOB: {formatDate(selectedPatient.date_of_birth)}</span>}
                  {selectedPatient.gender && <span><i className="fas fa-venus-mars"></i> {selectedPatient.gender}</span>}
                  {selectedPatient.blood_group && <span><i className="fas fa-tint"></i> {selectedPatient.blood_group}</span>}
                  {selectedPatient.phone && <span><i className="fas fa-phone"></i> {selectedPatient.phone}</span>}
                  {selectedPatient.email && <span><i className="fas fa-envelope"></i> {selectedPatient.email}</span>}
                </div>
                {selectedPatient.address && (
                  <div className="patient-meta mt-1">
                    <span><i className="fas fa-map-marker-alt"></i> {selectedPatient.address}</span>
                  </div>
                )}
              </div>
              <button className="pm-panel-close" onClick={() => setSelectedPatient(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Quick Stats */}
            <div className="pm-panel-stats">
              <div className="pm-panel-stat">
                <h5>{patientVisits.length}</h5>
                <p>Total Visits</p>
              </div>
              <div className="pm-panel-stat">
                <h5>{patientVisits.length > 0 ? formatDate(patientVisits[0]?.appointment_date || patientVisits[0]?.date) : '-'}</h5>
                <p>Last Visit</p>
              </div>
              <div className="pm-panel-stat">
                <h5>{patientPrescriptions.filter(rx => rx.is_active !== false).length}</h5>
                <p>Active Rx</p>
              </div>
              <div className="pm-panel-stat">
                <h5>{patientLabOrders.filter(o => o.status === 'pending' || o.status === 'in_progress').length}</h5>
                <p>Pending Reports</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="pm-panel-tabs">
              <ul className="nav nav-tabs">
                {[
                  { key: 'visits', icon: 'fas fa-history', label: 'Visits' },
                  { key: 'medications', icon: 'fas fa-pills', label: 'Medications' },
                  { key: 'labs', icon: 'fas fa-flask', label: 'Lab Orders' },
                  { key: 'upcoming', icon: 'fas fa-calendar', label: 'Upcoming' },
                  { key: 'vitals', icon: 'fas fa-heartbeat', label: 'Vitals' },
                  { key: 'allergies', icon: 'fas fa-allergies', label: 'Allergies' },
                ].map(tab => (
                  <li className="nav-item" key={tab.key}>
                    <button
                      className={`nav-link ${panelTab === tab.key ? 'active' : ''}`}
                      onClick={() => setPanelTab(tab.key)}
                    >
                      <i className={`${tab.icon} me-1`}></i>{tab.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tab Content */}
            <div className="pm-panel-content">
              {panelLoading ? (
                <div className="pm-loading"><div className="spinner-border spinner-border-sm me-2"></div> Loading...</div>
              ) : (
                <>
                  {/* Visit History */}
                  {panelTab === 'visits' && (
                    patientVisits.length === 0 ? (
                      <div className="pm-empty"><i className="fas fa-history"></i>No visit history</div>
                    ) : (
                      patientVisits.map(v => (
                        <div key={v.id} className="pm-followup-card">
                          <div className="followup-header">
                            <span className="patient">{formatDate(v.appointment_date || v.date)}</span>
                            {getStatusBadge(v.status)}
                          </div>
                          <div className="followup-meta">
                            <i className="fas fa-user-md me-1"></i>{getDoctorName(v)} &middot; {getDepartment(v)} &middot; {getTimeStr(v)}
                          </div>
                          {v.reason && <div className="followup-meta"><i className="fas fa-comment-medical me-1"></i>{v.reason}</div>}
                        </div>
                      ))
                    )
                  )}

                  {/* Current Medications */}
                  {panelTab === 'medications' && (
                    patientPrescriptions.length === 0 ? (
                      <div className="pm-empty"><i className="fas fa-pills"></i>No prescriptions found</div>
                    ) : (
                      patientPrescriptions.map(rx => (
                        <div key={rx.id} className="pm-followup-card">
                          <div className="followup-header">
                            <span className="patient">{formatDate(rx.date || rx.created_at || rx.prescribed_date)}</span>
                            <span className={`pm-badge ${rx.is_active !== false ? 'checked-in' : 'cancelled'}`}>
                              {rx.is_active !== false ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="followup-meta">
                            <i className="fas fa-user-md me-1"></i>{rx.doctor_name || `Dr. #${rx.doctor || ''}`}
                          </div>
                          {rx.medicines && Array.isArray(rx.medicines) && rx.medicines.map((m, i) => (
                            <div key={i} className="followup-meta ms-2">
                              <i className="fas fa-capsules me-1"></i>
                              {m.medicine_name || m.name || 'Medicine'} - {m.dosage || ''} {m.frequency || ''} {m.duration ? `for ${m.duration}` : ''}
                            </div>
                          ))}
                          {rx.diagnosis && <div className="followup-meta"><i className="fas fa-notes-medical me-1"></i>{rx.diagnosis}</div>}
                        </div>
                      ))
                    )
                  )}

                  {/* Lab Orders */}
                  {panelTab === 'labs' && (
                    patientLabOrders.length === 0 ? (
                      <div className="pm-empty"><i className="fas fa-flask"></i>No lab orders</div>
                    ) : (
                      patientLabOrders.map(order => (
                        <div key={order.id} className="pm-followup-card">
                          <div className="followup-header">
                            <span className="patient">{order.test_name || order.test_detail?.name || `Order #${order.id}`}</span>
                            <span className={`pm-badge ${order.status === 'completed' ? 'completed' : order.status === 'pending' ? 'waiting' : 'in-consultation'}`}>
                              {(order.status || '').replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="followup-meta">
                            <i className="fas fa-calendar me-1"></i>{formatDate(order.order_date || order.created_at)}
                            {order.doctor_name && <> &middot; <i className="fas fa-user-md ms-1 me-1"></i>{order.doctor_name}</>}
                          </div>
                        </div>
                      ))
                    )
                  )}

                  {/* Upcoming Schedule */}
                  {panelTab === 'upcoming' && (
                    patientUpcoming.length === 0 ? (
                      <div className="pm-empty"><i className="fas fa-calendar"></i>No upcoming appointments</div>
                    ) : (
                      patientUpcoming.map(a => (
                        <div key={a.id} className="pm-followup-card">
                          <div className="followup-header">
                            <span className="patient">{formatDate(a.appointment_date || a.date)}</span>
                            {getStatusBadge(a.status)}
                          </div>
                          <div className="followup-meta">
                            <i className="fas fa-clock me-1"></i>{getTimeStr(a)} &middot;
                            <i className="fas fa-user-md ms-2 me-1"></i>{getDoctorName(a)} &middot; {getDepartment(a)}
                          </div>
                        </div>
                      ))
                    )
                  )}

                  {/* Vitals */}
                  {panelTab === 'vitals' && (
                    !patientVitals ? (
                      <div className="pm-empty"><i className="fas fa-heartbeat"></i>No vitals recorded</div>
                    ) : (
                      <div>
                        <p className="text-muted small mb-3">Latest vitals recorded on {formatDate(patientVitals.recorded_at || patientVitals.created_at || patientVitals.date)}</p>
                        <div className="row g-2">
                          {[
                            { label: 'Blood Pressure', value: patientVitals.blood_pressure || (patientVitals.systolic_bp && `${patientVitals.systolic_bp}/${patientVitals.diastolic_bp}`) || '-', icon: 'fa-heartbeat', unit: 'mmHg' },
                            { label: 'Heart Rate', value: patientVitals.heart_rate || patientVitals.pulse_rate || '-', icon: 'fa-heart', unit: 'bpm' },
                            { label: 'Temperature', value: patientVitals.temperature || '-', icon: 'fa-thermometer-half', unit: 'F' },
                            { label: 'SpO2', value: patientVitals.spo2 || patientVitals.oxygen_saturation || '-', icon: 'fa-lungs', unit: '%' },
                            { label: 'Respiratory Rate', value: patientVitals.respiratory_rate || '-', icon: 'fa-wind', unit: '/min' },
                            { label: 'Weight', value: patientVitals.weight || '-', icon: 'fa-weight', unit: 'kg' },
                            { label: 'Height', value: patientVitals.height || '-', icon: 'fa-ruler-vertical', unit: 'cm' },
                            { label: 'BMI', value: patientVitals.bmi || '-', icon: 'fa-calculator', unit: '' },
                          ].map((v, i) => (
                            <div key={i} className="col-6">
                              <div className="pm-panel-stat">
                                <p><i className={`fas ${v.icon} me-1`}></i>{v.label}</p>
                                <h5>{v.value} <small className="text-muted fw-normal">{v.value !== '-' ? v.unit : ''}</small></h5>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}

                  {/* Allergies */}
                  {panelTab === 'allergies' && (
                    patientAllergies.length === 0 ? (
                      <div className="pm-empty"><i className="fas fa-check-circle"></i>No known allergies</div>
                    ) : (
                      patientAllergies.map((a, idx) => {
                        const severity = (a.severity || '').toLowerCase();
                        const cls = severity === 'severe' || severity === 'high' ? 'allergy-severe' :
                                    severity === 'moderate' || severity === 'medium' ? 'allergy-moderate' : 'allergy-mild';
                        return (
                          <div key={a.id || idx} className={cls}>
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <strong>{a.allergen || a.allergy_name || a.name || 'Unknown Allergen'}</strong>
                                {a.reaction && <span className="ms-2 text-muted small">Reaction: {a.reaction}</span>}
                              </div>
                              <span className={`pm-badge ${severity === 'severe' || severity === 'high' ? 'no-show' : severity === 'moderate' || severity === 'medium' ? 'waiting' : 'completed'}`}>
                                {a.severity || 'Unknown'}
                              </span>
                            </div>
                            {a.notes && <div className="text-muted small mt-1">{a.notes}</div>}
                          </div>
                        );
                      })
                    )
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className={`pm-toast ${toast.isError ? 'error' : ''}`}>
          <i className={`fas ${toast.isError ? 'fa-exclamation-circle' : 'fa-check-circle'} me-2`}></i>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default PatientManagement;
