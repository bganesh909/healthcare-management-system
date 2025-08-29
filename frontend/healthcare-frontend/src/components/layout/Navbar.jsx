import React from 'react';
import { Link, useLocation } from 'react-router-dom';
const Navbar = () => {
  const location = useLocation();
  // Function to determine if a link is active
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };
  return (
    <nav className="navbar navbar-expand-lg custom-navbar">
      <div className="container">
        <Link className="navbar-brand" to="/">
          <i className="fas fa-heartbeat me-2"></i>
          Healthcare System
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/') && location.pathname === '/' ? 'active' : ''}`} to="/">
                <i className="fas fa-home me-1"></i> Home
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/patients') ? 'active' : ''}`} to="/patients">
                <i className="fas fa-user me-1"></i> Patients
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
          </ul>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
