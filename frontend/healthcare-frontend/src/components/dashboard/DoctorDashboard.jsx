import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { appointmentService, prescriptionService, doctorLeaveService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const AUTO_REFRESH_INTERVAL = 60000;

const DoctorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const refreshTimerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [stats, setStats] = useState({
    todayPatients: 0,
    pendingAppointments: 0,
    completedToday: 0,
    totalPatients: 0,
    completionRate: 0,
    monthlyCount: 0,
  });
  const [recentPrescriptions, setRecentPrescriptions] = useState([]);
  const [upcomingLeaves, setUpcomingLeaves] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchDashboardData = useCallback(async (isAutoRefresh = false) => {
    if (isAutoRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [todayRes, allApptsRes, prescRes, leaveRes] = await Promise.allSettled([
        appointmentService.getToday(),
        appointmentService.getAll({ page_size: 200 }),
        prescriptionService.getAll({ page: 1, page_size: 5 }),
        doctorLeaveService.getAll(),
      ]);

      // Today's appointments
      const todayAppts = todayRes.status === 'fulfilled' ? (todayRes.value.data || []) : [];
      setTodayAppointments(todayAppts);

      // Stats from all appointments
      const allAppts = allApptsRes.status === 'fulfilled' ? (allApptsRes.value.data || []) : [];
      const completedToday = todayAppts.filter(a => a.status === 'COMPLETED').length;
      const pendingToday = todayAppts.filter(a =>
        a.status === 'SCHEDULED' || a.status === 'CHECKED_IN'
      ).length;
      const uniquePatients = new Set(allAppts.map(a => a.patient || a.patient_id)).size;
      const totalCompleted = allAppts.filter(a => a.status === 'COMPLETED').length;

      // Monthly count
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthlyAppts = allAppts.filter(a => {
        const date = a.appointment_date || a.date;
        return date && date >= monthStart;
      });

      setStats({
        todayPatients: todayAppts.length,
        pendingAppointments: pendingToday,
        completedToday,
        totalPatients: uniquePatients,
        completionRate: allAppts.length > 0
          ? Math.round((totalCompleted / allAppts.length) * 100)
          : 0,
        monthlyCount: monthlyAppts.length,
      });

      // Recent prescriptions
      setRecentPrescriptions(
        prescRes.status === 'fulfilled' ? (prescRes.value.data || []) : []
      );

      // Upcoming leaves
      if (leaveRes.status === 'fulfilled') {
        const leaves = leaveRes.value.data || [];
        const today = new Date().toISOString().split('T')[0];
        setUpcomingLeaves(leaves.filter(l => l.end_date >= today).slice(0, 5));
      } else {
        setUpcomingLeaves([]);
      }
    } catch (err) {
      setError('Failed to load dashboard data. Please try refreshing.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchDashboardData(false);

    refreshTimerRef.current = setInterval(() => {
      fetchDashboardData(true);
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [fetchDashboardData]);

  // Appointment action handlers
  const handleCheckIn = async (e, apptId) => {
    e.stopPropagation();
    setActionLoading(apptId);
    try {
      await appointmentService.checkIn(apptId);
      await fetchDashboardData(true);
    } catch {
      setError('Failed to check in patient.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartConsultation = async (e, apptId) => {
    e.stopPropagation();
    setActionLoading(apptId);
    try {
      await appointmentService.update(apptId, { status: 'IN_PROGRESS' });
      await fetchDashboardData(true);
    } catch {
      setError('Failed to start consultation.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (e, apptId) => {
    e.stopPropagation();
    setActionLoading(apptId);
    try {
      await appointmentService.checkOut(apptId);
      await fetchDashboardData(true);
    } catch {
      setError('Failed to complete appointment.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      SCHEDULED: { cls: 'bg-primary', icon: 'fa-clock', label: 'Scheduled' },
      CHECKED_IN: { cls: 'bg-info', icon: 'fa-sign-in-alt', label: 'Checked In' },
      IN_PROGRESS: { cls: 'bg-warning text-dark', icon: 'fa-stethoscope', label: 'In Progress' },
      COMPLETED: { cls: 'bg-success', icon: 'fa-check-circle', label: 'Completed' },
      CANCELLED: { cls: 'bg-danger', icon: 'fa-times-circle', label: 'Cancelled' },
    };
    const info = map[status] || { cls: 'bg-secondary', icon: 'fa-question-circle', label: status };
    return (
      <span className={`badge ${info.cls}`}>
        <i className={`fas ${info.icon} me-1`}></i>
        {info.label}
      </span>
    );
  };

  const getActionButtons = (appt) => {
    const isLoading = actionLoading === appt.id;
    const btnSize = 'btn btn-sm';

    if (appt.status === 'SCHEDULED') {
      return (
        <button
          className={`${btnSize} btn-outline-info`}
          onClick={(e) => handleCheckIn(e, appt.id)}
          disabled={isLoading}
        >
          {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-sign-in-alt me-1"></i>Check In</>}
        </button>
      );
    }
    if (appt.status === 'CHECKED_IN') {
      return (
        <button
          className={`${btnSize} btn-outline-warning`}
          onClick={(e) => handleStartConsultation(e, appt.id)}
          disabled={isLoading}
        >
          {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-stethoscope me-1"></i>Start</>}
        </button>
      );
    }
    if (appt.status === 'IN_PROGRESS') {
      return (
        <button
          className={`${btnSize} btn-outline-success`}
          onClick={(e) => handleComplete(e, appt.id)}
          disabled={isLoading}
        >
          {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-check me-1"></i>Complete</>}
        </button>
      );
    }
    return null;
  };

  const getLeaveBadge = (leave) => {
    if (leave.is_approved === true || leave.status === 'APPROVED') {
      return <span className="badge bg-success"><i className="fas fa-check me-1"></i>Approved</span>;
    }
    if (leave.is_approved === false || leave.status === 'REJECTED') {
      return <span className="badge bg-danger"><i className="fas fa-times me-1"></i>Rejected</span>;
    }
    return <span className="badge bg-warning text-dark"><i className="fas fa-hourglass-half me-1"></i>Pending</span>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="container-fluid mt-4 px-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="container-fluid mt-4 px-4">
      {/* Welcome Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            <i className="fas fa-user-md me-2 text-primary"></i>
            Welcome, Dr. {user?.first_name || user?.username || 'Doctor'}
          </h2>
          <p className="text-muted mb-0">
            <i className="fas fa-calendar-alt me-1"></i> {todayStr}
            <span className="badge bg-primary bg-opacity-10 text-primary ms-3 px-3 py-1">
              <i className="fas fa-stethoscope me-1"></i>
              {user?.specialization || 'Physician'}
            </span>
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {refreshing && (
            <span className="text-muted small">
              <i className="fas fa-sync-alt fa-spin me-1"></i>Updating...
            </span>
          )}
          <button
            className="btn btn-outline-primary"
            onClick={() => fetchDashboardData(false)}
            disabled={loading || refreshing}
          >
            <i className="fas fa-sync-alt me-1"></i> Refresh
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>{error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="card shadow-sm border-0 border-start border-4 border-primary h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted text-uppercase small fw-semibold mb-1">Today's Patients</p>
                  <h2 className="fw-bold mb-0">{stats.todayPatients}</h2>
                </div>
                <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                  <i className="fas fa-calendar-check fa-lg text-primary"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="card shadow-sm border-0 border-start border-4 border-warning h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted text-uppercase small fw-semibold mb-1">Pending Appointments</p>
                  <h2 className="fw-bold mb-0">{stats.pendingAppointments}</h2>
                </div>
                <div className="bg-warning bg-opacity-10 rounded-circle p-3">
                  <i className="fas fa-clock fa-lg text-warning"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="card shadow-sm border-0 border-start border-4 border-success h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted text-uppercase small fw-semibold mb-1">Completed Today</p>
                  <h2 className="fw-bold mb-0">{stats.completedToday}</h2>
                </div>
                <div className="bg-success bg-opacity-10 rounded-circle p-3">
                  <i className="fas fa-check-circle fa-lg text-success"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="card shadow-sm border-0 border-start border-4 border-info h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted text-uppercase small fw-semibold mb-1">Total Patients</p>
                  <h2 className="fw-bold mb-0">{stats.totalPatients}</h2>
                </div>
                <div className="bg-info bg-opacity-10 rounded-circle p-3">
                  <i className="fas fa-users fa-lg text-info"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Row: Schedule + Quick Actions */}
      <div className="row g-4 mb-4">
        {/* Today's Schedule */}
        <div className="col-lg-8">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
              <h5 className="mb-0 fw-semibold">
                <i className="fas fa-calendar-day me-2 text-primary"></i>
                Today's Schedule
                <span className="badge bg-primary ms-2">{todayAppointments.length}</span>
              </h5>
              <Link to="/appointments" className="btn btn-sm btn-outline-primary">
                <i className="fas fa-external-link-alt me-1"></i>View All
              </Link>
            </div>
            <div className="card-body p-0" style={{ maxHeight: '480px', overflowY: 'auto' }}>
              {todayAppointments.length === 0 ? (
                <div className="p-5 text-center text-muted">
                  <i className="fas fa-calendar-times fa-3x mb-3 d-block opacity-50"></i>
                  <p className="mb-0">No appointments scheduled for today.</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {todayAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="list-group-item list-group-item-action px-4 py-3"
                      onClick={() => navigate(`/appointments/${appt.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          <div className="bg-light rounded-circle p-2 me-3 text-center" style={{ width: '42px', height: '42px' }}>
                            <i className="fas fa-user text-secondary"></i>
                          </div>
                          <div>
                            <h6 className="mb-0 fw-semibold">
                              {appt.patient_name || `${appt.patient?.first_name || ''} ${appt.patient?.last_name || ''}`.trim() || 'Patient'}
                            </h6>
                            <small className="text-muted">
                              <i className="fas fa-clock me-1"></i>
                              {appt.appointment_time || appt.time_slot || '--:--'}
                              {appt.reason && (
                                <span className="ms-2">
                                  <i className="fas fa-notes-medical me-1"></i>{appt.reason}
                                </span>
                              )}
                            </small>
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {getStatusBadge(appt.status)}
                          {getActionButtons(appt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="col-lg-4">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <h5 className="mb-0 fw-semibold">
                <i className="fas fa-bolt me-2 text-warning"></i>
                Quick Actions
              </h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-3">
                <Link to="/prescriptions/add" className="btn btn-outline-primary text-start py-3 px-3">
                  <div className="d-flex align-items-center">
                    <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-prescription text-primary"></i>
                    </div>
                    <div>
                      <span className="fw-semibold d-block">Write Prescription</span>
                      <small className="text-muted">Create a new prescription</small>
                    </div>
                  </div>
                </Link>
                <Link to="/lab/add" className="btn btn-outline-success text-start py-3 px-3">
                  <div className="d-flex align-items-center">
                    <div className="bg-success bg-opacity-10 rounded-circle p-2 me-3" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-flask text-success"></i>
                    </div>
                    <div>
                      <span className="fw-semibold d-block">Order Lab Test</span>
                      <small className="text-muted">Request laboratory tests</small>
                    </div>
                  </div>
                </Link>
                <Link to="/clinical-notes" className="btn btn-outline-info text-start py-3 px-3">
                  <div className="d-flex align-items-center">
                    <div className="bg-info bg-opacity-10 rounded-circle p-2 me-3" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-notes-medical text-info"></i>
                    </div>
                    <div>
                      <span className="fw-semibold d-block">View Clinical Notes</span>
                      <small className="text-muted">Browse patient notes</small>
                    </div>
                  </div>
                </Link>
                <Link to="/vitals" className="btn btn-outline-danger text-start py-3 px-3">
                  <div className="d-flex align-items-center">
                    <div className="bg-danger bg-opacity-10 rounded-circle p-2 me-3" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-heartbeat text-danger"></i>
                    </div>
                    <div>
                      <span className="fw-semibold d-block">View Patient Vitals</span>
                      <small className="text-muted">Monitor vital signs</small>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row: Prescriptions + Leaves */}
      <div className="row g-4 mb-4">
        {/* Recent Prescriptions */}
        <div className="col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
              <h5 className="mb-0 fw-semibold">
                <i className="fas fa-prescription me-2 text-primary"></i>
                Recent Prescriptions
              </h5>
              <Link to="/prescriptions" className="btn btn-sm btn-outline-primary">
                <i className="fas fa-list me-1"></i>View All
              </Link>
            </div>
            <div className="card-body p-0">
              {recentPrescriptions.length === 0 ? (
                <div className="p-4 text-center text-muted">
                  <i className="fas fa-file-prescription fa-2x mb-2 d-block opacity-50"></i>
                  <p className="mb-0">No recent prescriptions.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Patient</th>
                        <th>Diagnosis</th>
                        <th className="pe-4 text-end">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPrescriptions.slice(0, 5).map((rx) => (
                        <tr
                          key={rx.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/prescriptions/${rx.id}`)}
                        >
                          <td className="ps-4">
                            <i className="fas fa-user-circle me-2 text-muted"></i>
                            {rx.patient_name || 'Patient'}
                          </td>
                          <td className="text-muted">
                            {rx.diagnosis || rx.medication || 'N/A'}
                          </td>
                          <td className="pe-4 text-end text-muted small">
                            {formatDate(rx.created_at || rx.date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Leaves */}
        <div className="col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
              <h5 className="mb-0 fw-semibold">
                <i className="fas fa-plane-departure me-2 text-info"></i>
                Upcoming Leaves
              </h5>
              <Link to="/doctor-leaves" className="btn btn-sm btn-outline-info">
                <i className="fas fa-plus me-1"></i>Request Leave
              </Link>
            </div>
            <div className="card-body p-0">
              {upcomingLeaves.length === 0 ? (
                <div className="p-4 text-center text-muted">
                  <i className="fas fa-umbrella-beach fa-2x mb-2 d-block opacity-50"></i>
                  <p className="mb-0">No upcoming leaves scheduled.</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {upcomingLeaves.map((leave) => (
                    <div key={leave.id} className="list-group-item px-4 py-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1 fw-semibold">
                            <i className="fas fa-calendar-minus me-2 text-muted"></i>
                            {leave.reason || leave.leave_type || 'Leave'}
                          </h6>
                          <small className="text-muted">
                            {formatDate(leave.start_date)} &mdash; {formatDate(leave.end_date)}
                          </small>
                        </div>
                        {getLeaveBadge(leave)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* My Performance Section */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header bg-white py-3">
              <h5 className="mb-0 fw-semibold">
                <i className="fas fa-chart-line me-2 text-success"></i>
                My Performance
              </h5>
            </div>
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-6 mb-3 mb-md-0">
                  <label className="form-label text-muted fw-semibold small text-uppercase">
                    Completion Rate
                  </label>
                  <div className="d-flex align-items-center">
                    <div className="progress flex-grow-1 me-3" style={{ height: '12px' }}>
                      <div
                        className={`progress-bar ${
                          stats.completionRate >= 80
                            ? 'bg-success'
                            : stats.completionRate >= 50
                            ? 'bg-warning'
                            : 'bg-danger'
                        }`}
                        role="progressbar"
                        style={{ width: `${stats.completionRate}%` }}
                        aria-valuenow={stats.completionRate}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      ></div>
                    </div>
                    <span className="fw-bold fs-5">{stats.completionRate}%</span>
                  </div>
                  <small className="text-muted">Based on all-time appointment data</small>
                </div>
                <div className="col-md-6">
                  <label className="form-label text-muted fw-semibold small text-uppercase">
                    Monthly Appointments
                  </label>
                  <div className="d-flex align-items-center">
                    <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                      <i className="fas fa-calendar-alt fa-lg text-primary"></i>
                    </div>
                    <div>
                      <h3 className="fw-bold mb-0">{stats.monthlyCount}</h3>
                      <small className="text-muted">
                        Appointments in {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
