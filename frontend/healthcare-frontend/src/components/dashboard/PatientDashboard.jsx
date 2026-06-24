import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  authService,
  appointmentService,
  prescriptionService,
  labService,
  billingService,
  allergyService,
  treatmentPlanService,
  patientService,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState([]);
  const [recentLabResults, setRecentLabResults] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [activeTreatmentPlans, setActiveTreatmentPlans] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const safeCall = async (fn, fallback = []) => {
      try { return await fn(); } catch { return fallback; }
    };

    try {
      // First get the patient_profile ID from the auth profile
      let patientId = user?.patient_profile;
      if (!patientId) {
        try {
          const profileRes = await authService.getProfile();
          patientId = profileRes.data?.patient_profile;
        } catch { /* empty */ }
      }

      const [appts, prescriptions, labs, invoices, allergyData, treatments, patient] =
        await Promise.all([
          safeCall(async () => {
            const params = { page_size: 5 };
            if (patientId) params.patient = patientId;
            const res = await appointmentService.getUpcoming(params);
            return res.data || [];
          }),
          safeCall(async () => {
            if (patientId) {
              const res = await prescriptionService.getByPatient(patientId);
              const d = res.data?.results || res.data || [];
              return Array.isArray(d) ? d.slice(0, 5) : [];
            }
            const res = await prescriptionService.getAll({ page: 1, page_size: 5 });
            return res.data || [];
          }),
          safeCall(async () => {
            if (patientId) {
              const res = await labService.getOrdersByPatient(patientId);
              const d = res.data?.results || res.data || [];
              return Array.isArray(d) ? d.slice(0, 5) : [];
            }
            const res = await labService.getOrders({ page: 1, page_size: 5 });
            return res.data || [];
          }),
          safeCall(async () => {
            if (patientId) {
              const res = await billingService.getByPatient(patientId);
              const d = res.data?.results || res.data || [];
              return Array.isArray(d) ? d.slice(0, 5) : [];
            }
            const res = await billingService.getAll({ page: 1, page_size: 5 });
            return res.data || [];
          }),
          safeCall(async () => {
            if (patientId) {
              const res = await allergyService.getByPatient(patientId);
              return res.data?.results || res.data || [];
            }
            const res = await allergyService.getAll({ page_size: 50 });
            return res.data || [];
          }),
          safeCall(async () => {
            if (patientId) {
              const res = await treatmentPlanService.getByPatient(patientId);
              return res.data?.results || res.data || [];
            }
            const res = await treatmentPlanService.getActivePlans();
            return res.data?.results || res.data || [];
          }),
          safeCall(async () => {
            if (patientId) {
              const res = await patientService.get(patientId);
              return res.data || null;
            }
            return null;
          }, null),
        ]);

      setUpcomingAppointments(appts);
      setRecentPrescriptions(prescriptions);
      setRecentLabResults(labs);
      setRecentInvoices(invoices);
      setAllergies(Array.isArray(allergyData) ? allergyData : []);
      setActiveTreatmentPlans(Array.isArray(treatments) ? treatments : []);
      setPatientInfo(patient);
    } catch (err) {
      setError('Failed to load some dashboard data. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getStatusBadgeClass = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'SCHEDULED':
      case 'ACTIVE':
        return 'bg-primary';
      case 'COMPLETED':
      case 'PAID':
        return 'bg-success';
      case 'CANCELLED':
      case 'OVERDUE':
        return 'bg-danger';
      case 'PENDING':
      case 'IN_PROGRESS':
      case 'PROCESSING':
        return 'bg-warning text-dark';
      case 'PARTIALLY_PAID':
        return 'bg-info text-dark';
      default:
        return 'bg-secondary';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    if (amount == null) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDownloadPrescriptionPdf = async (id, e) => {
    e.stopPropagation();
    try {
      const response = await prescriptionService.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prescription_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download prescription PDF.');
    }
  };

  const handleDownloadLabPdf = async (id, e) => {
    e.stopPropagation();
    try {
      const response = await labService.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lab_report_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download lab report PDF.');
    }
  };

  const handleDownloadInvoicePdf = async (id, e) => {
    e.stopPropagation();
    try {
      const response = await billingService.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download invoice PDF.');
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4 mb-5">
      {/* Welcome Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">
            <i className="fas fa-heartbeat text-danger me-2"></i>
            Welcome, {user?.first_name || user?.username || 'Patient'}
          </h2>
          <p className="text-muted mb-0">
            <i className="fas fa-calendar-day me-1"></i>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <button
          className="btn btn-outline-primary"
          onClick={fetchDashboardData}
          title="Refresh dashboard"
        >
          <i className="fas fa-sync-alt me-2"></i>Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* Quick Action Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <Link to="/appointments/add" className="card shadow-sm text-decoration-none h-100 border-0">
            <div className="card-body text-center py-4">
              <div
                className="rounded-circle bg-primary bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3"
                style={{ width: 64, height: 64 }}
              >
                <i className="fas fa-calendar-plus fa-2x text-primary"></i>
              </div>
              <h5 className="text-dark">Book Appointment</h5>
              <p className="text-muted mb-0 small">
                Schedule a new appointment with a doctor
              </p>
            </div>
          </Link>
        </div>
        <div className="col-md-4">
          <Link to="/patients" className="card shadow-sm text-decoration-none h-100 border-0">
            <div className="card-body text-center py-4">
              <div
                className="rounded-circle bg-success bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3"
                style={{ width: 64, height: 64 }}
              >
                <i className="fas fa-notes-medical fa-2x text-success"></i>
              </div>
              <h5 className="text-dark">View Medical Records</h5>
              <p className="text-muted mb-0 small">
                Access your complete medical history and records
              </p>
            </div>
          </Link>
        </div>
        <div className="col-md-4">
          <Link to="/profile" className="card shadow-sm text-decoration-none h-100 border-0">
            <div className="card-body text-center py-4">
              <div
                className="rounded-circle bg-info bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3"
                style={{ width: 64, height: 64 }}
              >
                <i className="fas fa-user-circle fa-2x text-info"></i>
              </div>
              <h5 className="text-dark">My Profile</h5>
              <p className="text-muted mb-0 small">
                View your profile, records, vitals, and billing
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Health Summary (col-4) + Upcoming Appointments (col-8) */}
      <div className="row g-4 mb-4">
        <div className="col-lg-4">
          <div className="card shadow-sm h-100 border-0">
            <div className="card-header bg-white border-bottom">
              <h5 className="mb-0">
                <i className="fas fa-heart me-2 text-danger"></i>
                Health Summary
              </h5>
            </div>
            <div className="card-body">
              {/* Blood Group */}
              <div className="mb-3">
                <label className="text-muted small d-block mb-1">Blood Group</label>
                <span className="badge bg-danger fs-6 px-3 py-2">
                  <i className="fas fa-tint me-1"></i>
                  {patientInfo?.blood_group || user?.blood_group || 'Not recorded'}
                </span>
              </div>

              {/* Active Allergies */}
              <div className="mb-3">
                <label className="text-muted small d-block mb-2">Active Allergies</label>
                {allergies.length === 0 ? (
                  <p className="text-muted small mb-0">
                    <i className="fas fa-check-circle text-success me-1"></i>
                    No known allergies
                  </p>
                ) : (
                  <div className="d-flex flex-wrap gap-1">
                    {allergies.map((allergy) => (
                      <span
                        key={allergy.id}
                        className={`badge ${
                          allergy.severity === 'SEVERE' || allergy.severity === 'HIGH'
                            ? 'bg-danger'
                            : allergy.severity === 'MODERATE'
                            ? 'bg-warning text-dark'
                            : 'bg-info text-dark'
                        }`}
                      >
                        <i className="fas fa-allergies me-1"></i>
                        {allergy.allergen || allergy.name || 'Unknown'}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <hr />

              <Link
                to="/patients"
                className="btn btn-outline-primary btn-sm w-100"
              >
                <i className="fas fa-file-medical me-2"></i>
                View Full Medical History
              </Link>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm h-100 border-0">
            <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="fas fa-calendar-alt me-2 text-primary"></i>
                Upcoming Appointments
              </h5>
              <Link to="/appointments" className="btn btn-sm btn-outline-primary">
                View All
              </Link>
            </div>
            <div className="card-body p-0">
              {upcomingAppointments.length === 0 ? (
                <div className="p-4 text-center text-muted">
                  <i className="fas fa-calendar-times fa-3x mb-3 d-block text-secondary"></i>
                  <p className="mb-2">No upcoming appointments scheduled.</p>
                  <Link to="/appointments/add" className="btn btn-primary">
                    <i className="fas fa-plus me-2"></i>Book Now
                  </Link>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {upcomingAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="list-group-item list-group-item-action"
                      onClick={() => navigate(`/appointments/${appt.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">
                            <i className="fas fa-user-md me-2 text-primary"></i>
                            Dr.{' '}
                            {appt.doctor_name ||
                              `${appt.doctor?.first_name || ''} ${appt.doctor?.last_name || ''}`.trim()}
                          </h6>
                          {(appt.specialization || appt.doctor?.specialization) && (
                            <small className="text-muted d-block mb-1">
                              <i className="fas fa-stethoscope me-1"></i>
                              {appt.specialization || appt.doctor?.specialization}
                            </small>
                          )}
                          <small className="text-muted">
                            <i className="fas fa-calendar me-1"></i>
                            {formatDate(appt.appointment_date)}
                            <i className="fas fa-clock ms-2 me-1"></i>
                            {appt.appointment_time}
                          </small>
                        </div>
                        <span className={`badge ${getStatusBadgeClass(appt.status)}`}>
                          {appt.status_display || appt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Prescriptions (col-6) + Recent Lab Results (col-6) */}
      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="card shadow-sm h-100 border-0">
            <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="fas fa-prescription-bottle-alt me-2 text-success"></i>
                Recent Prescriptions
              </h5>
              <Link to="/prescriptions" className="btn btn-sm btn-outline-primary">
                View All
              </Link>
            </div>
            <div className="card-body p-0">
              {recentPrescriptions.length === 0 ? (
                <div className="p-4 text-center text-muted">
                  <i className="fas fa-prescription fa-2x mb-2 d-block text-secondary"></i>
                  <p className="mb-0 small">No prescriptions found.</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {recentPrescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      className="list-group-item list-group-item-action"
                      onClick={() => navigate(`/prescriptions/${rx.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1 small fw-bold">
                            <i className="fas fa-user-md me-1 text-muted"></i>
                            Dr. {rx.doctor_name || 'Doctor'}
                          </h6>
                          <small className="text-muted d-block">
                            {rx.diagnosis || rx.medication || 'Prescription'}
                          </small>
                          <small className="text-muted">
                            <i className="fas fa-calendar me-1"></i>
                            {formatDate(rx.created_at || rx.date)}
                          </small>
                        </div>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={(e) => handleDownloadPrescriptionPdf(rx.id, e)}
                          title="Download PDF"
                        >
                          <i className="fas fa-file-pdf"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card shadow-sm h-100 border-0">
            <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="fas fa-flask me-2 text-info"></i>
                Recent Lab Results
              </h5>
              <Link to="/lab" className="btn btn-sm btn-outline-primary">
                View All
              </Link>
            </div>
            <div className="card-body p-0">
              {recentLabResults.length === 0 ? (
                <div className="p-4 text-center text-muted">
                  <i className="fas fa-vial fa-2x mb-2 d-block text-secondary"></i>
                  <p className="mb-0 small">No lab results found.</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {recentLabResults.map((lab) => (
                    <div
                      key={lab.id}
                      className="list-group-item list-group-item-action"
                      onClick={() => navigate(`/lab/${lab.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1 small fw-bold">
                            <i className="fas fa-microscope me-1 text-muted"></i>
                            {lab.test_name || lab.test?.name || 'Lab Test'}
                          </h6>
                          <small className="text-muted">
                            <i className="fas fa-calendar me-1"></i>
                            {formatDate(lab.created_at || lab.order_date)}
                          </small>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className={`badge ${getStatusBadgeClass(lab.status)}`}>
                            {lab.status_display || lab.status}
                          </span>
                          {(lab.status === 'COMPLETED' || lab.status === 'REPORTED') && (
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={(e) => handleDownloadLabPdf(lab.id, e)}
                              title="Download Report"
                            >
                              <i className="fas fa-file-pdf"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Treatment Plans */}
      {activeTreatmentPlans.length > 0 && (
        <div className="row g-4 mb-4">
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="fas fa-clipboard-list me-2 text-warning"></i>
                  Active Treatment Plans
                </h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Plan</th>
                        <th>Doctor</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTreatmentPlans.map((plan) => (
                        <tr
                          key={plan.id}
                          onClick={() => navigate(`/treatment-plans/${plan.id}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <i className="fas fa-notes-medical me-2 text-muted"></i>
                            {plan.title || plan.name || plan.diagnosis || 'Treatment Plan'}
                          </td>
                          <td>
                            Dr.{' '}
                            {plan.doctor_name ||
                              `${plan.doctor?.first_name || ''} ${plan.doctor?.last_name || ''}`.trim() ||
                              'N/A'}
                          </td>
                          <td>{formatDate(plan.start_date || plan.created_at)}</td>
                          <td>{formatDate(plan.end_date) || 'Ongoing'}</td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(plan.status)}`}>
                              {plan.status_display || plan.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing Summary */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="fas fa-file-invoice-dollar me-2 text-success"></i>
                Billing Summary
              </h5>
              <Link to="/billing" className="btn btn-sm btn-outline-primary">
                View All Invoices
              </Link>
            </div>
            <div className="card-body p-0">
              {recentInvoices.length === 0 ? (
                <div className="p-4 text-center text-muted">
                  <i className="fas fa-receipt fa-2x mb-2 d-block text-secondary"></i>
                  <p className="mb-0 small">No recent invoices found.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Invoice #</th>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentInvoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="fw-bold">
                            #{invoice.invoice_number || invoice.id}
                          </td>
                          <td>{formatDate(invoice.created_at || invoice.date || invoice.invoice_date)}</td>
                          <td>{invoice.description || invoice.notes || 'Medical services'}</td>
                          <td className="fw-bold">
                            {formatCurrency(invoice.total_amount || invoice.amount)}
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(invoice.status)}`}>
                              {invoice.status_display || invoice.status}
                            </span>
                          </td>
                          <td className="text-center">
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={(e) => handleDownloadInvoicePdf(invoice.id, e)}
                              title="Download Invoice PDF"
                            >
                              <i className="fas fa-download me-1"></i>PDF
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
      </div>
    </div>
  );
};

export default PatientDashboard;
