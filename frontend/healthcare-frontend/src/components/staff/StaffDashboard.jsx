import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { staffService, attendanceService, leaveRequestService } from '../../services/api';

const ROLE_COLORS = {
  NURSE: { bg: '#0d6efd', label: 'Nurse' },
  TECHNICIAN: { bg: '#6f42c1', label: 'Technician' },
  RECEPTIONIST: { bg: '#198754', label: 'Receptionist' },
  PHARMACIST: { bg: '#0dcaf0', label: 'Pharmacist' },
  LAB_TECHNICIAN: { bg: '#ffc107', label: 'Lab Technician' },
  RADIOLOGIST: { bg: '#212529', label: 'Radiologist' },
  ADMIN: { bg: '#dc3545', label: 'Admin' },
  ACCOUNTANT: { bg: '#6c757d', label: 'Accountant' },
  HOUSEKEEPING: { bg: '#adb5bd', label: 'Housekeeping' },
  SECURITY: { bg: '#343a40', label: 'Security' },
  OTHER: { bg: '#6c757d', label: 'Other' },
};

const StaffDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalStaff, setTotalStaff] = useState(0);
  const [staffByRole, setStaffByRole] = useState({});
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [onDutyCount, setOnDutyCount] = useState(0);
  const [onLeaveCount, setOnLeaveCount] = useState(0);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch staff list
      const staffRes = await staffService.getAll({ page_size: 200 });
      const allStaff = staffRes.data || [];
      setTotalStaff(staffRes.count || allStaff.length);

      // Count by role
      const roleCounts = {};
      let onDuty = 0;
      let onLeave = 0;
      allStaff.forEach(s => {
        const role = s.role || 'OTHER';
        roleCounts[role] = (roleCounts[role] || 0) + 1;
        if (s.status === 'ACTIVE') onDuty++;
        if (s.status === 'ON_LEAVE') onLeave++;
      });
      setStaffByRole(roleCounts);
      setOnDutyCount(onDuty);
      setOnLeaveCount(onLeave);

      // Fetch recent attendance
      try {
        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        const attRes = await attendanceService.getMonthlyReport(month, year);
        const attData = attRes.data;
        setRecentAttendance(Array.isArray(attData) ? attData.slice(0, 10) : []);
      } catch {
        setRecentAttendance([]);
      }

      // Fetch pending leave requests
      try {
        const leaveRes = await leaveRequestService.getAll({ status: 'PENDING' });
        setPendingLeaves(leaveRes.data || []);
      } catch {
        setPendingLeaves([]);
      }

      setLoading(false);
    } catch (err) {
      setError('Error loading staff dashboard data');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleApproveLeave = async (id) => {
    try {
      await leaveRequestService.approve(id);
      fetchDashboardData();
    } catch {
      setError('Error approving leave request');
    }
  };

  const handleRejectLeave = async (id) => {
    try {
      await leaveRequestService.reject(id);
      fetchDashboardData();
    } catch {
      setError('Error rejecting leave request');
    }
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
        <h2><i className="fas fa-id-card-alt me-2"></i>Staff Dashboard</h2>
        <button className="btn btn-outline-primary" onClick={fetchDashboardData}>
          <i className="fas fa-sync-alt me-2"></i>Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm border-start border-primary border-4 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted text-uppercase mb-1">Total Staff</h6>
                  <h2 className="fw-bold mb-0">{totalStaff}</h2>
                </div>
                <div className="text-primary">
                  <i className="fas fa-users fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-start border-success border-4 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted text-uppercase mb-1">On Duty Today</h6>
                  <h2 className="fw-bold mb-0">{onDutyCount}</h2>
                </div>
                <div className="text-success">
                  <i className="fas fa-user-check fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-start border-warning border-4 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted text-uppercase mb-1">On Leave Today</h6>
                  <h2 className="fw-bold mb-0">{onLeaveCount}</h2>
                </div>
                <div className="text-warning">
                  <i className="fas fa-user-clock fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-start border-danger border-4 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted text-uppercase mb-1">Pending Leave Requests</h6>
                  <h2 className="fw-bold mb-0">{pendingLeaves.length}</h2>
                </div>
                <div className="text-danger">
                  <i className="fas fa-clipboard-list fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Staff by Role */}
      <div className="card shadow-sm mb-4">
        <div className="card-header">
          <h5 className="mb-0"><i className="fas fa-chart-pie me-2"></i>Staff by Role</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            {Object.entries(staffByRole).map(([role, count]) => {
              const roleInfo = ROLE_COLORS[role] || { bg: '#6c757d', label: role };
              return (
                <div key={role} className="col-md-3 col-sm-4 col-6">
                  <div className="d-flex align-items-center p-2 rounded" style={{ backgroundColor: `${roleInfo.bg}15`, border: `1px solid ${roleInfo.bg}40` }}>
                    <span className="badge rounded-pill me-2" style={{ backgroundColor: roleInfo.bg, minWidth: '32px' }}>
                      {count}
                    </span>
                    <span className="fw-semibold">{roleInfo.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Pending Leave Requests */}
        <div className="col-md-7">
          <div className="card shadow-sm h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0"><i className="fas fa-calendar-minus me-2"></i>Pending Leave Requests</h5>
              <Link to="/staff/leaves" className="btn btn-sm btn-outline-primary">View All</Link>
            </div>
            <div className="card-body p-0">
              {pendingLeaves.length === 0 ? (
                <div className="p-3 text-muted text-center">No pending leave requests</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Staff Member</th>
                        <th>Leave Type</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingLeaves.slice(0, 5).map((leave) => (
                        <tr key={leave.id}>
                          <td>{leave.staff_member_name || leave.staff_name || '--'}</td>
                          <td>
                            <span className="badge bg-info">{leave.leave_type_display || leave.leave_type || '--'}</span>
                          </td>
                          <td>{leave.start_date || '--'}</td>
                          <td>{leave.end_date || '--'}</td>
                          <td>
                            <button className="btn btn-sm btn-success me-1" onClick={() => handleApproveLeave(leave.id)} title="Approve">
                              <i className="fas fa-check"></i>
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleRejectLeave(leave.id)} title="Reject">
                              <i className="fas fa-times"></i>
                            </button>
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

        {/* Recent Attendance */}
        <div className="col-md-5">
          <div className="card shadow-sm h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0"><i className="fas fa-clipboard-check me-2"></i>Recent Attendance</h5>
              <Link to="/staff/attendance" className="btn btn-sm btn-outline-primary">View All</Link>
            </div>
            <div className="card-body p-0">
              {recentAttendance.length === 0 ? (
                <div className="p-3 text-muted text-center">No attendance records available</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAttendance.map((record, idx) => (
                        <tr key={record.id || idx}>
                          <td>{record.staff_member_name || record.staff_name || '--'}</td>
                          <td>
                            <span className={`badge ${record.status === 'PRESENT' ? 'bg-success' : record.status === 'ABSENT' ? 'bg-danger' : record.status === 'LATE' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                              {record.status_display || record.status || '--'}
                            </span>
                          </td>
                          <td>{record.date || '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="card shadow-sm mb-4">
        <div className="card-header">
          <h5 className="mb-0"><i className="fas fa-link me-2"></i>Quick Links</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-2 col-sm-4 col-6">
              <Link to="/staff" className="btn btn-outline-primary w-100 py-3">
                <i className="fas fa-users d-block mb-1 fa-lg"></i>
                Staff List
              </Link>
            </div>
            <div className="col-md-2 col-sm-4 col-6">
              <Link to="/staff/attendance" className="btn btn-outline-success w-100 py-3">
                <i className="fas fa-clipboard-check d-block mb-1 fa-lg"></i>
                Attendance
              </Link>
            </div>
            <div className="col-md-2 col-sm-4 col-6">
              <Link to="/staff/payroll" className="btn btn-outline-info w-100 py-3">
                <i className="fas fa-money-check-alt d-block mb-1 fa-lg"></i>
                Payroll
              </Link>
            </div>
            <div className="col-md-2 col-sm-4 col-6">
              <Link to="/staff/shifts" className="btn btn-outline-warning w-100 py-3">
                <i className="fas fa-clock d-block mb-1 fa-lg"></i>
                Shifts
              </Link>
            </div>
            <div className="col-md-2 col-sm-4 col-6">
              <Link to="/staff/leaves" className="btn btn-outline-danger w-100 py-3">
                <i className="fas fa-calendar-minus d-block mb-1 fa-lg"></i>
                Leaves
              </Link>
            </div>
            <div className="col-md-2 col-sm-4 col-6">
              <Link to="/staff/add" className="btn btn-outline-dark w-100 py-3">
                <i className="fas fa-user-plus d-block mb-1 fa-lg"></i>
                Add Staff
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
