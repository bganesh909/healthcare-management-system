import React from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Routes that require a completed consultation for patients
const CONSULTATION_REQUIRED_ROUTES = ['/dashboard', '/my-records'];

const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, loading, user, hasConsulted } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Check if patient is trying to access consultation-required routes
  if (user?.role === 'patient' && !hasConsulted) {
    const isRestricted = CONSULTATION_REQUIRED_ROUTES.some(r => location.pathname.startsWith(r));
    if (isRestricted) {
      return (
        <div className="container mt-5">
          <div className="row justify-content-center">
            <div className="col-md-7">
              <div className="card shadow-sm text-center p-5" style={{ borderTop: '4px solid #4361ee' }}>
                <i className="fas fa-calendar-check text-primary mb-3" style={{ fontSize: '3rem' }}></i>
                <h3 className="mb-3">Complete Your First Consultation</h3>
                <p className="text-muted mb-4">
                  Your dashboard and medical records will be available after your first doctor consultation.
                  Book an appointment and visit the hospital to get started.
                </p>
                <div className="d-flex justify-content-center gap-3 flex-wrap">
                  <Link to="/book-appointment" className="btn btn-primary btn-rounded px-4">
                    <i className="fas fa-calendar-plus me-2"></i>Book Appointment
                  </Link>
                  <Link to="/appointments" className="btn btn-outline-primary btn-rounded px-4">
                    <i className="fas fa-calendar-alt me-2"></i>View Appointments
                  </Link>
                  <Link to="/doctors" className="btn btn-outline-secondary btn-rounded px-4">
                    <i className="fas fa-user-md me-2"></i>Find Doctors
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  if (roles && user && !roles.includes(user.role)) {
    // Redirect patients to appointments if they try to access restricted pages
    if (user.role === 'patient') {
      return <Navigate to={hasConsulted ? '/my-records' : '/appointments'} replace />;
    }
    return (
      <div className="container mt-5 text-center">
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
        <Link to="/">Go Home</Link>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
