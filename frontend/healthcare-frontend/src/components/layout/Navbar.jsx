import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/api';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, isDoctor, isPatient, isStaff, logout, hasConsulted } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.data.count || 0);
    } catch { /* silent */ }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);
  const handleLogout = () => { logout(); navigate('/login'); };

  const showManagement = isAdmin || isStaff;
  const showClinical = isAdmin || isDoctor || isStaff;

  return (
    <nav className="navbar navbar-expand-lg custom-navbar">
      <div className="container-fluid px-3">
        <Link className="navbar-brand" to="/">
          <i className="fas fa-plus-circle me-2"></i>BG Hospitals
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            {/* Home - always visible */}
            <li className="nav-item">
              <Link className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} to="/">
                <i className="fas fa-home me-1"></i> Home
              </Link>
            </li>

            {/* ===== NOT LOGGED IN ===== */}
            {!isAuthenticated && (
              <>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/doctors') ? 'active' : ''}`} to="/doctors">
                    <i className="fas fa-user-md me-1"></i> Doctors
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/book-appointment') ? 'active' : ''}`} to="/book-appointment">
                    <i className="fas fa-calendar-plus me-1"></i> Book Appointment
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/patient-portal') ? 'active' : ''}`} to="/patient-portal">
                    <i className="fas fa-file-medical me-1"></i> My Records
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/login') ? 'active' : ''}`} to="/login">
                    <i className="fas fa-sign-in-alt me-1"></i> Login
                  </Link>
                </li>
              </>
            )}

            {/* ===== PATIENT ROLE ===== */}
            {isAuthenticated && isPatient && (
              <>
                {/* Always visible: Doctors, Appointments, Book */}
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/doctors') ? 'active' : ''}`} to="/doctors">
                    <i className="fas fa-user-md me-1"></i> Find Doctors
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/appointments') ? 'active' : ''}`} to="/appointments">
                    <i className="fas fa-calendar-alt me-1"></i> My Appointments
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/book-appointment') ? 'active' : ''}`} to="/book-appointment">
                    <i className="fas fa-calendar-plus me-1"></i> Book
                  </Link>
                </li>
                {/* Only visible after at least one completed consultation */}
                {hasConsulted && (
                  <>
                    <li className="nav-item">
                      <Link className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`} to="/dashboard">
                        <i className="fas fa-tachometer-alt me-1"></i> My Dashboard
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className={`nav-link ${isActive('/my-records') ? 'active' : ''}`} to="/my-records">
                        <i className="fas fa-file-medical me-1"></i> My Records
                      </Link>
                    </li>
                  </>
                )}
              </>
            )}

            {/* ===== DOCTOR ROLE ===== */}
            {isAuthenticated && isDoctor && (
              <>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/doctor-dashboard') ? 'active' : ''}`} to="/doctor-dashboard">
                    <i className="fas fa-tachometer-alt me-1"></i> Dashboard
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/appointments') ? 'active' : ''}`} to="/appointments">
                    <i className="fas fa-calendar-alt me-1"></i> Appointments
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/doctor-schedule') ? 'active' : ''}`} to="/doctor-schedule">
                    <i className="fas fa-calendar-cog me-1"></i> My Schedule
                  </Link>
                </li>
              </>
            )}

            {/* ===== ADMIN / STAFF ROLE ===== */}
            {isAuthenticated && (isAdmin || isStaff) && (
              <>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`} to="/dashboard">
                    <i className="fas fa-tachometer-alt me-1"></i> Dashboard
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/patients') ? 'active' : ''}`} to="/patients">
                    <i className="fas fa-user-injured me-1"></i> Patients
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/doctors') ? 'active' : ''}`} to="/doctors">
                    <i className="fas fa-user-md me-1"></i> Doctors
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/appointments') ? 'active' : ''}`} to="/appointments">
                    <i className="fas fa-calendar-alt me-1"></i> Appointments
                  </Link>
                </li>
              </>
            )}

            {/* Clinical dropdown - doctors, admin, staff */}
            {isAuthenticated && showClinical && (
              <li className="nav-item dropdown">
                <a className={`nav-link dropdown-toggle ${isActive('/prescriptions') || isActive('/vitals') || isActive('/clinical-notes') || isActive('/lab') || isActive('/radiology') ? 'active' : ''}`}
                  href="#clinical" role="button" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                  <i className="fas fa-stethoscope me-1"></i> Clinical
                </a>
                <ul className="dropdown-menu">
                  <li><Link className="dropdown-item" to="/prescriptions"><i className="fas fa-prescription me-2"></i>Prescriptions</Link></li>
                  <li><Link className="dropdown-item" to="/vitals"><i className="fas fa-heartbeat me-2"></i>Vitals & EHR</Link></li>
                  <li><Link className="dropdown-item" to="/clinical-notes"><i className="fas fa-notes-medical me-2"></i>Clinical Notes</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><Link className="dropdown-item" to="/lab"><i className="fas fa-flask me-2"></i>Laboratory</Link></li>
                  <li><Link className="dropdown-item" to="/radiology"><i className="fas fa-x-ray me-2"></i>Radiology</Link></li>
                  <li><Link className="dropdown-item" to="/discharge"><i className="fas fa-file-medical me-2"></i>Discharge</Link></li>
                </ul>
              </li>
            )}

            {/* Emergency & OT - doctors, admin, staff */}
            {isAuthenticated && showClinical && (
              <li className="nav-item dropdown">
                <a className={`nav-link dropdown-toggle ${isActive('/emergency') || isActive('/ot') || isActive('/blood-bank') ? 'active' : ''}`}
                  href="#emergency" role="button" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                  <i className="fas fa-ambulance me-1"></i> Emergency
                </a>
                <ul className="dropdown-menu">
                  <li><Link className="dropdown-item" to="/emergency"><i className="fas fa-procedures me-2"></i>ER Dashboard</Link></li>
                  <li><Link className="dropdown-item" to="/ot"><i className="fas fa-hospital-symbol me-2"></i>Operation Theater</Link></li>
                  <li><Link className="dropdown-item" to="/ot/surgeries"><i className="fas fa-cut me-2"></i>Surgeries</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><Link className="dropdown-item" to="/blood-bank"><i className="fas fa-tint me-2"></i>Blood Bank</Link></li>
                </ul>
              </li>
            )}

            {/* Management dropdown - admin, staff only */}
            {isAuthenticated && showManagement && (
              <li className="nav-item dropdown">
                <a className={`nav-link dropdown-toggle ${isActive('/billing') || isActive('/pharmacy') || isActive('/departments') || isActive('/bed-management') || isActive('/staff') || isActive('/inventory') || isActive('/queue') || isActive('/analytics') ? 'active' : ''}`}
                  href="#management" role="button" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                  <i className="fas fa-cogs me-1"></i> Management
                </a>
                <ul className="dropdown-menu">
                  <li><Link className="dropdown-item" to="/staff/check-in"><i className="fas fa-clipboard-check me-2"></i>Patient Check-in</Link></li>
                  <li><Link className="dropdown-item" to="/staff/patients"><i className="fas fa-hospital-user me-2"></i>Patient Management</Link></li>
                  <li><Link className="dropdown-item" to="/billing"><i className="fas fa-file-invoice-dollar me-2"></i>Billing</Link></li>
                  <li><Link className="dropdown-item" to="/pharmacy"><i className="fas fa-pills me-2"></i>Pharmacy</Link></li>
                  <li><Link className="dropdown-item" to="/departments"><i className="fas fa-hospital me-2"></i>Departments</Link></li>
                  <li><Link className="dropdown-item" to="/bed-management"><i className="fas fa-bed me-2"></i>Bed Management</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><Link className="dropdown-item" to="/staff"><i className="fas fa-users me-2"></i>Staff & HR</Link></li>
                  <li><Link className="dropdown-item" to="/staff/list"><i className="fas fa-id-badge me-2"></i>Staff Directory</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><Link className="dropdown-item" to="/inventory"><i className="fas fa-boxes me-2"></i>Inventory</Link></li>
                  <li><Link className="dropdown-item" to="/inventory/assets"><i className="fas fa-laptop-medical me-2"></i>Assets</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><Link className="dropdown-item" to="/queue/manage"><i className="fas fa-list-ol me-2"></i>OPD Queue</Link></li>
                  <li><Link className="dropdown-item" to="/queue"><i className="fas fa-tv me-2"></i>Queue Display</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><Link className="dropdown-item" to="/analytics"><i className="fas fa-chart-line me-2"></i>Analytics</Link></li>
                  <li><Link className="dropdown-item" to="/finance"><i className="fas fa-chart-pie me-2"></i>Finance & Budget</Link></li>
                </ul>
              </li>
            )}

            {/* User menu - all authenticated */}
            {isAuthenticated && (
              <>
                <li className="nav-item">
                  <Link className={`nav-link position-relative ${isActive('/notifications') ? 'active' : ''}`} to="/notifications">
                    <i className="fas fa-bell"></i>
                    {unreadCount > 0 && (
                      <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
                <li className="nav-item dropdown">
                  <a className="nav-link dropdown-toggle" href="#account" role="button" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                    <i className="fas fa-user-circle me-1"></i>
                    {user?.first_name || user?.email || 'Account'}
                  </a>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li><span className="dropdown-item-text text-muted small">{user?.email}</span></li>
                    <li><span className="dropdown-item-text text-muted small text-capitalize"><i className="fas fa-shield-alt me-1"></i>{user?.role}</span></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li><Link className="dropdown-item" to="/profile"><i className="fas fa-user me-2"></i>My Profile</Link></li>
                    <li><Link className="dropdown-item" to="/profile"><i className="fas fa-cog me-2"></i>Settings</Link></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li><button className="dropdown-item text-danger" onClick={handleLogout}><i className="fas fa-sign-out-alt me-2"></i>Logout</button></li>
                  </ul>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
