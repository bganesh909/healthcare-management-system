import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
// Import CSS files
import './styles/main.css';
import './styles/layout.css';
import './styles/patient.css';
import './styles/doctor.css';
import './styles/appointment.css';
import './styles/analytics.css';
import './styles/auth.css';
// Context
import { AuthProvider } from './context/AuthContext';
// Layout components
import Navbar from './components/layout/Navbar.jsx';
// Auth components
import Login from './components/auth/Login.jsx';
import Register from './components/auth/Register.jsx';
import ForgotPassword from './components/auth/ForgotPassword.jsx';
import ResetPassword from './components/auth/ResetPassword.jsx';
import MyRecords from './components/auth/MyRecords.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
// Dashboard
import RoleDashboard from './components/dashboard/RoleDashboard.jsx';
// Patient components
import PatientList from './components/patients/PatientList.jsx';
import PatientDetail from './components/patients/PatientDetail.jsx';
import PatientForm from './components/patients/PatientForm.jsx';
import PatientDocuments from './components/patients/PatientDocuments.jsx';
// Doctor components
import DoctorList from './components/doctors/DoctorList.jsx';
import DoctorDetail from './components/doctors/DoctorDetail.jsx';
import DoctorForm from './components/doctors/DoctorForm.jsx';
import DoctorReviews from './components/doctors/DoctorReviews.jsx';
import DoctorDashboard from './components/doctors/DoctorDashboard.jsx';
import DoctorSchedule from './components/doctors/DoctorSchedule.jsx';
// Appointment components
import AppointmentList from './components/appointments/AppointmentList.jsx';
import AppointmentDetail from './components/appointments/AppointmentDetail.jsx';
import AppointmentForm from './components/appointments/AppointmentForm.jsx';
// Analytics components
import Dashboard from './components/analytics/Dashboard.jsx';
// Prescription components
import PrescriptionList from './components/prescriptions/PrescriptionList.jsx';
import PrescriptionDetail from './components/prescriptions/PrescriptionDetail.jsx';
import PrescriptionForm from './components/prescriptions/PrescriptionForm.jsx';
// Billing components
import InvoiceList from './components/billing/InvoiceList.jsx';
import InvoiceDetail from './components/billing/InvoiceDetail.jsx';
import InvoiceForm from './components/billing/InvoiceForm.jsx';
// Department components
import DepartmentList from './components/departments/DepartmentList.jsx';
import DepartmentDetail from './components/departments/DepartmentDetail.jsx';
import BedManagement from './components/departments/BedManagement.jsx';
// Pharmacy components
import PharmacyDashboard from './components/pharmacy/PharmacyDashboard.jsx';
import MedicineList from './components/pharmacy/MedicineList.jsx';
import MedicineForm from './components/pharmacy/MedicineForm.jsx';
// Lab components
import LabOrderList from './components/lab/LabOrderList.jsx';
import LabOrderDetail from './components/lab/LabOrderDetail.jsx';
import LabOrderForm from './components/lab/LabOrderForm.jsx';
// Notification components
import NotificationList from './components/notifications/NotificationList.jsx';
// Vitals & EHR components
import VitalsDashboard from './components/vitals/VitalsDashboard.jsx';
import ClinicalNotes from './components/vitals/ClinicalNotes.jsx';
// Staff & HR components
import StaffDashboard from './components/staff/StaffDashboard.jsx';
import StaffList from './components/staff/StaffList.jsx';
import StaffCheckIn from './components/staff/StaffCheckIn.jsx';
// Blood Bank components
import BloodBankDashboard from './components/bloodbank/BloodBankDashboard.jsx';
// Radiology components
import ImagingOrderList from './components/radiology/ImagingOrderList.jsx';
import ImagingOrderDetail from './components/radiology/ImagingOrderDetail.jsx';
// Emergency components
import EmergencyDashboard from './components/emergency/EmergencyDashboard.jsx';
// Operation Theater components
import OTDashboard from './components/ot/OTDashboard.jsx';
import SurgeryList from './components/ot/SurgeryList.jsx';
import SurgeryDetail from './components/ot/SurgeryDetail.jsx';
// Inventory components
import InventoryDashboard from './components/inventory/InventoryDashboard.jsx';
import AssetList from './components/inventory/AssetList.jsx';
// OPD Queue components
import OPDQueueDisplay from './components/queue/OPDQueueDisplay.jsx';
import QueueManagement from './components/queue/QueueManagement.jsx';
// Discharge components
import DischargeSummaryList from './components/discharge/DischargeSummaryList.jsx';
import DischargeSummaryDetail from './components/discharge/DischargeSummaryDetail.jsx';
// Staff Patient Management
import PatientManagement from './components/staff/PatientManagement';
// Website components
import LandingPage from './components/website/LandingPage.jsx';
import BookAppointment from './components/booking/BookAppointment.jsx';
// Accounting components
import FinanceDashboard from './components/accounting/FinanceDashboard.jsx';
// Patient Portal
import PatientPortal from './components/portal/PatientPortal.jsx';
// User Profile
import UserProfile from './components/profile/UserProfile.jsx';

function AppContent() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
        <div className="App">
          <Navbar />
          <main className={isLandingPage ? '' : 'mb-5 pb-5'}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/book-appointment" element={<BookAppointment />} />
              <Route path="/patient-portal" element={<PatientPortal />} />
              <Route path="/dashboard" element={<RoleDashboard />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
              <Route path="/my-records" element={
                <ProtectedRoute>
                  <MyRecords />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              } />

              {/* Patient routes - admin/staff/doctor can view list and details */}
              <Route path="/patients" element={
                <ProtectedRoute roles={['admin', 'staff', 'doctor']}>
                  <PatientList />
                </ProtectedRoute>
              } />
              <Route path="/patients/:id" element={
                <ProtectedRoute roles={['admin', 'staff', 'doctor']}>
                  <PatientDetail />
                </ProtectedRoute>
              } />
              <Route path="/patients/add" element={
                <ProtectedRoute roles={['admin', 'staff', 'doctor']}>
                  <PatientForm />
                </ProtectedRoute>
              } />
              <Route path="/patients/edit/:id" element={
                <ProtectedRoute roles={['admin', 'staff', 'doctor']}>
                  <PatientForm />
                </ProtectedRoute>
              } />
              <Route path="/patients/:id/documents" element={
                <ProtectedRoute>
                  <PatientDocuments />
                </ProtectedRoute>
              } />

              {/* Doctor routes */}
              <Route path="/doctors" element={<DoctorList />} />
              <Route path="/doctors/:id" element={<DoctorDetail />} />
              <Route path="/doctors/add" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <DoctorForm />
                </ProtectedRoute>
              } />
              <Route path="/doctors/edit/:id" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <DoctorForm />
                </ProtectedRoute>
              } />
              <Route path="/doctors/:id/reviews" element={<DoctorReviews />} />
              <Route path="/doctor-dashboard" element={
                <ProtectedRoute roles={['doctor']}>
                  <DoctorDashboard />
                </ProtectedRoute>
              } />
              <Route path="/doctor-schedule" element={
                <ProtectedRoute roles={['doctor']}>
                  <DoctorSchedule />
                </ProtectedRoute>
              } />

              {/* Appointment routes */}
              <Route path="/appointments" element={
                <ProtectedRoute>
                  <AppointmentList />
                </ProtectedRoute>
              } />
              <Route path="/appointments/:id" element={
                <ProtectedRoute>
                  <AppointmentDetail />
                </ProtectedRoute>
              } />
              <Route path="/appointments/add" element={
                <ProtectedRoute>
                  <AppointmentForm />
                </ProtectedRoute>
              } />
              <Route path="/appointments/edit/:id" element={
                <ProtectedRoute>
                  <AppointmentForm />
                </ProtectedRoute>
              } />

              {/* Prescription routes */}
              <Route path="/prescriptions" element={
                <ProtectedRoute>
                  <PrescriptionList />
                </ProtectedRoute>
              } />
              <Route path="/prescriptions/:id" element={
                <ProtectedRoute>
                  <PrescriptionDetail />
                </ProtectedRoute>
              } />
              <Route path="/prescriptions/add" element={
                <ProtectedRoute roles={['admin', 'doctor']}>
                  <PrescriptionForm />
                </ProtectedRoute>
              } />
              <Route path="/prescriptions/edit/:id" element={
                <ProtectedRoute roles={['admin', 'doctor']}>
                  <PrescriptionForm />
                </ProtectedRoute>
              } />

              {/* Billing routes */}
              <Route path="/billing" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <InvoiceList />
                </ProtectedRoute>
              } />
              <Route path="/billing/:id" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <InvoiceDetail />
                </ProtectedRoute>
              } />
              <Route path="/billing/add" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <InvoiceForm />
                </ProtectedRoute>
              } />
              <Route path="/billing/edit/:id" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <InvoiceForm />
                </ProtectedRoute>
              } />

              {/* Department routes */}
              <Route path="/departments" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <DepartmentList />
                </ProtectedRoute>
              } />
              <Route path="/departments/:id" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <DepartmentDetail />
                </ProtectedRoute>
              } />
              <Route path="/bed-management" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <BedManagement />
                </ProtectedRoute>
              } />

              {/* Pharmacy routes */}
              <Route path="/pharmacy" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <PharmacyDashboard />
                </ProtectedRoute>
              } />
              <Route path="/pharmacy/medicines" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <MedicineList />
                </ProtectedRoute>
              } />
              <Route path="/pharmacy/medicines/add" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <MedicineForm />
                </ProtectedRoute>
              } />
              <Route path="/pharmacy/medicines/edit/:id" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <MedicineForm />
                </ProtectedRoute>
              } />

              {/* Lab routes */}
              <Route path="/lab" element={
                <ProtectedRoute>
                  <LabOrderList />
                </ProtectedRoute>
              } />
              <Route path="/lab/:id" element={
                <ProtectedRoute>
                  <LabOrderDetail />
                </ProtectedRoute>
              } />
              <Route path="/lab/add" element={
                <ProtectedRoute roles={['admin', 'doctor', 'staff']}>
                  <LabOrderForm />
                </ProtectedRoute>
              } />

              {/* Analytics route */}
              <Route path="/analytics" element={
                <ProtectedRoute roles={['admin', 'staff', 'doctor']}>
                  <Dashboard />
                </ProtectedRoute>
              } />

              {/* Finance & Budget route */}
              <Route path="/finance" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <FinanceDashboard />
                </ProtectedRoute>
              } />

              {/* Notifications */}
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <NotificationList />
                </ProtectedRoute>
              } />

              {/* Vitals & EHR routes */}
              <Route path="/vitals" element={
                <ProtectedRoute roles={['admin', 'doctor', 'staff']}>
                  <VitalsDashboard />
                </ProtectedRoute>
              } />
              <Route path="/clinical-notes" element={
                <ProtectedRoute roles={['admin', 'doctor']}>
                  <ClinicalNotes />
                </ProtectedRoute>
              } />

              {/* Staff & HR routes */}
              <Route path="/staff" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <StaffDashboard />
                </ProtectedRoute>
              } />
              <Route path="/staff/list" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <StaffList />
                </ProtectedRoute>
              } />

              {/* Blood Bank routes */}
              <Route path="/blood-bank" element={
                <ProtectedRoute roles={['admin', 'staff', 'doctor']}>
                  <BloodBankDashboard />
                </ProtectedRoute>
              } />

              {/* Radiology routes */}
              <Route path="/radiology" element={
                <ProtectedRoute roles={['admin', 'doctor', 'staff']}>
                  <ImagingOrderList />
                </ProtectedRoute>
              } />
              <Route path="/radiology/:id" element={
                <ProtectedRoute roles={['admin', 'doctor', 'staff']}>
                  <ImagingOrderDetail />
                </ProtectedRoute>
              } />

              {/* Emergency routes */}
              <Route path="/emergency" element={
                <ProtectedRoute roles={['admin', 'doctor', 'staff']}>
                  <EmergencyDashboard />
                </ProtectedRoute>
              } />

              {/* Operation Theater routes */}
              <Route path="/ot" element={
                <ProtectedRoute roles={['admin', 'doctor', 'staff']}>
                  <OTDashboard />
                </ProtectedRoute>
              } />
              <Route path="/ot/surgeries" element={
                <ProtectedRoute roles={['admin', 'doctor', 'staff']}>
                  <SurgeryList />
                </ProtectedRoute>
              } />
              <Route path="/ot/surgeries/:id" element={
                <ProtectedRoute roles={['admin', 'doctor', 'staff']}>
                  <SurgeryDetail />
                </ProtectedRoute>
              } />

              {/* Inventory routes */}
              <Route path="/inventory" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <InventoryDashboard />
                </ProtectedRoute>
              } />
              <Route path="/inventory/assets" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <AssetList />
                </ProtectedRoute>
              } />

              {/* OPD Queue routes */}
              <Route path="/queue" element={<OPDQueueDisplay />} />
              <Route path="/queue/manage" element={
                <ProtectedRoute roles={['admin', 'staff', 'doctor']}>
                  <QueueManagement />
                </ProtectedRoute>
              } />

              {/* Discharge routes */}
              <Route path="/discharge" element={
                <ProtectedRoute roles={['admin', 'doctor', 'staff']}>
                  <DischargeSummaryList />
                </ProtectedRoute>
              } />
              <Route path="/discharge/:id" element={
                <ProtectedRoute roles={['admin', 'doctor', 'staff']}>
                  <DischargeSummaryDetail />
                </ProtectedRoute>
              } />

              {/* Staff Check-in */}
              <Route path="/staff/check-in" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <StaffCheckIn />
                </ProtectedRoute>
              } />

              {/* Staff Patient Management */}
              <Route path="/staff/patients" element={
                <ProtectedRoute roles={['admin', 'staff']}>
                  <PatientManagement />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
          {!isLandingPage && (
            <footer className="custom-footer">
              <div className="container">
                <div className="row">
                  <div className="col-md-6 text-center text-md-start">
                    <p className="mb-0">&copy; {new Date().getFullYear()} BG Hospitals. All Rights Reserved.</p>
                  </div>
                  <div className="col-md-6 text-center text-md-end">
                    <p className="mb-0">
                      <i className="fas fa-heart text-danger"></i> Built with care for healthcare professionals
                    </p>
                  </div>
                </div>
              </div>
            </footer>
          )}
        </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
