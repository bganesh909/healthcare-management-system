import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import DoctorDashboard from '../doctors/DoctorDashboard';
import PatientDashboard from './PatientDashboard';

const PublicHome = () => (
  <div className="container mt-5 fade-in">
    <div className="jumbotron">
      <h1 className="display-4">Healthcare Management System</h1>
      <p className="lead">
        A comprehensive solution for managing patients, doctors, and appointments.
      </p>
      <hr className="my-4" />
      <div className="row">
        <div className="col-md-3 mb-4">
          <div className="dashboard-card card h-100">
            <div className="card-body">
              <div className="dashboard-icon">
                <i className="fas fa-user-injured"></i>
              </div>
              <h5 className="card-title">Patient Management</h5>
              <p className="card-text">Manage patient records, view medical history, and track patient information.</p>
              <Link to="/patients" className="btn btn-primary btn-rounded">
                <i className="fas fa-arrow-right me-2"></i> Manage Patients
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-4">
          <div className="dashboard-card card h-100">
            <div className="card-body">
              <div className="dashboard-icon">
                <i className="fas fa-user-md"></i>
              </div>
              <h5 className="card-title">Doctor Management</h5>
              <p className="card-text">Manage doctor profiles, specializations, and availability schedules.</p>
              <Link to="/doctors" className="btn btn-primary btn-rounded">
                <i className="fas fa-arrow-right me-2"></i> Manage Doctors
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-4">
          <div className="dashboard-card card h-100">
            <div className="card-body">
              <div className="dashboard-icon">
                <i className="fas fa-calendar-check"></i>
              </div>
              <h5 className="card-title">Appointments</h5>
              <p className="card-text">Schedule, track, and manage patient-doctor appointments.</p>
              <Link to="/appointments" className="btn btn-primary btn-rounded">
                <i className="fas fa-arrow-right me-2"></i> Manage Appointments
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-4">
          <div className="dashboard-card card h-100">
            <div className="card-body">
              <div className="dashboard-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <h5 className="card-title">Analytics</h5>
              <p className="card-text">View insights, statistics, and performance analytics.</p>
              <Link to="/analytics" className="btn btn-primary btn-rounded">
                <i className="fas fa-arrow-right me-2"></i> View Analytics
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const RoleDashboard = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <PublicHome />;
  }

  switch (user?.role) {
    case 'admin':
    case 'staff':
      return <AdminDashboard />;
    case 'doctor':
      return <DoctorDashboard />;
    case 'patient':
      return <PatientDashboard />;
    default:
      return <PublicHome />;
  }
};

export default RoleDashboard;
