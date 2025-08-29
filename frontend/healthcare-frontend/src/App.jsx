import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
// Import CSS files
import './styles/main.css';
import './styles/layout.css';
import './styles/patient.css';
import './styles/doctor.css';
import './styles/appointment.css';
// Layout components
import Navbar from './components/layout/Navbar.jsx';
// Patient components
import PatientList from './components/patients/PatientList.jsx';
import PatientDetail from './components/patients/PatientDetail.jsx';
import PatientForm from './components/patients/PatientForm.jsx';
// Doctor components
import DoctorList from './components/doctors/DoctorList.jsx';
import DoctorDetail from './components/doctors/DoctorDetail.jsx';
import DoctorForm from './components/doctors/DoctorForm.jsx';
// Appointment components
import AppointmentList from './components/appointments/AppointmentList.jsx';
import AppointmentDetail from './components/appointments/AppointmentDetail.jsx';
import AppointmentForm from './components/appointments/AppointmentForm.jsx';
// Home component
const Home = () => (
  <div className="container mt-5 fade-in">
    <div className="jumbotron">
      <h1 className="display-4">Healthcare Management System</h1>
      <p className="lead">
        A comprehensive solution for managing patients, doctors, and appointments.
      </p>
      <hr className="my-4" />
      <div className="row">
        <div className="col-md-4 mb-4">
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
        <div className="col-md-4 mb-4">
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
        <div className="col-md-4 mb-4">
          <div className="dashboard-card card h-100">
            <div className="card-body">
              <div className="dashboard-icon">
                <i className="fas fa-calendar-check"></i>
              </div>
              <h5 className="card-title">Appointment Scheduling</h5>
              <p className="card-text">Schedule, track, and manage patient-doctor appointments.</p>
              <Link to="/appointments" className="btn btn-primary btn-rounded">
                <i className="fas fa-arrow-right me-2"></i> Manage Appointments
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <main className="mb-5 pb-5">
          <Routes>
            {}
            <Route path="/" element={<Home />} />
            {}
            <Route path="/patients" element={<PatientList />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
            <Route path="/patients/add" element={<PatientForm />} />
            <Route path="/patients/edit/:id" element={<PatientForm />} />
            {}
            <Route path="/doctors" element={<DoctorList />} />
            <Route path="/doctors/:id" element={<DoctorDetail />} />
            <Route path="/doctors/add" element={<DoctorForm />} />
            <Route path="/doctors/edit/:id" element={<DoctorForm />} />
            {}
            <Route path="/appointments" element={<AppointmentList />} />
            <Route path="/appointments/:id" element={<AppointmentDetail />} />
            <Route path="/appointments/add" element={<AppointmentForm />} />
            <Route path="/appointments/edit/:id" element={<AppointmentForm />} />
          </Routes>
        </main>
        <footer className="custom-footer">
          <div className="container">
            <div className="row">
              <div className="col-md-6 text-center text-md-start">
                <p className="mb-0">© {new Date().getFullYear()} Healthcare Management System</p>
              </div>
              <div className="col-md-6 text-center text-md-end">
                <p className="mb-0">
                  <i className="fas fa-heart text-danger"></i> Built with care for healthcare professionals
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
export default App;

