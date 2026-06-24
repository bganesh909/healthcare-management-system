import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  authService,
  patientService,
  appointmentService,
  prescriptionService,
  labService,
  vitalsService,
  allergyService,
  treatmentPlanService,
  dischargeService,
} from '../../services/api';

// ==================== Helpers ====================
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (timeStr) => {
  if (!timeStr) return '-';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m} ${ampm}`;
};

const getStatusBadge = (status) => {
  if (!status) return 'bg-secondary';
  const s = status.toLowerCase().replace(/_/g, ' ');
  if (s === 'completed' || s === 'approved') return 'bg-success';
  if (s === 'cancelled') return 'bg-danger';
  if (s === 'pending' || s === 'scheduled') return 'bg-warning text-dark';
  if (s === 'active' || s === 'in progress') return 'bg-primary';
  if (s === 'no show' || s === 'no_show') return 'bg-dark';
  return 'bg-info';
};

const doctorName = (name) => {
  if (!name) return '-';
  return name.startsWith('Dr') ? name : `Dr. ${name}`;
};

const isFutureDate = (dateStr) => {
  if (!dateStr) return false;
  return new Date(dateStr) >= new Date(new Date().toDateString());
};

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

// ==================== Reusable Data Grid ====================
const DataGrid = ({ columns, data, emptyIcon, emptyMessage }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-5">
        <i className={`fas ${emptyIcon || 'fa-inbox'} fa-3x text-muted mb-3 d-block opacity-50`}></i>
        <p className="text-muted mb-0">{emptyMessage || 'No data found.'}</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover table-bordered align-middle mb-0" style={{ fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f4f8' }}>
            {columns.map((col, i) => (
              <th key={i} className="fw-semibold text-nowrap py-2 px-3" style={{ color: '#495057', borderBottom: '2px solid #dee2e6', ...(col.width ? { width: col.width } : {}) }}>
                {col.icon && <i className={`fas ${col.icon} me-1 text-primary`}></i>}
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={row.id || rowIdx} style={{ transition: 'background-color 0.15s' }}>
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="py-2 px-3">
                  {col.render ? col.render(row, rowIdx) : (row[col.field] || '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ==================== Main Component ====================
const MyRecords = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('appointments');
  const [patientId, setPatientId] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [dischargeSummaries, setDischargeSummaries] = useState([]);

  const safeCall = async (fn, fallback = []) => {
    try { return await fn(); } catch { return fallback; }
  };

  const fetchAllData = useCallback(async (pId) => {
    setLoading(true);
    const [appts, rxs, labs, vit, allg, tp, ds, pInfo] = await Promise.all([
      safeCall(async () => { const res = await appointmentService.getAll({ patient: pId }); return res.data || []; }),
      safeCall(async () => { const res = await prescriptionService.getByPatient(pId); const d = res.data?.results || res.data || []; return Array.isArray(d) ? d : []; }),
      safeCall(async () => { const res = await labService.getOrdersByPatient(pId); const d = res.data?.results || res.data || []; return Array.isArray(d) ? d : []; }),
      safeCall(async () => { const res = await vitalsService.getHistory(pId); const d = res.data?.results || res.data || []; return Array.isArray(d) ? d : []; }),
      safeCall(async () => { const res = await allergyService.getByPatient(pId); const d = res.data?.results || res.data || []; return Array.isArray(d) ? d : []; }),
      safeCall(async () => { const res = await treatmentPlanService.getByPatient(pId); const d = res.data?.results || res.data || []; return Array.isArray(d) ? d : []; }),
      safeCall(async () => { const res = await dischargeService.getByPatient(pId); const d = res.data?.results || res.data || []; return Array.isArray(d) ? d : []; }),
      safeCall(async () => { const res = await patientService.get(pId); return res.data || null; }, null),
    ]);
    setAppointments(appts);
    setPrescriptions(rxs);
    setLabOrders(labs);
    setVitals(vit);
    setAllergies(allg);
    setTreatmentPlans(tp);
    setDischargeSummaries(ds);
    setPatientInfo(pInfo);
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      let pId = user?.patient_profile;
      if (!pId) {
        try {
          const profileRes = await authService.getProfile();
          pId = profileRes.data?.patient_profile;
        } catch { /* empty */ }
      }
      if (pId) {
        setPatientId(pId);
        fetchAllData(pId);
      } else {
        setError('No patient profile linked to your account. Please contact the hospital.');
        setLoading(false);
      }
    };
    init();
  }, [user, fetchAllData]);

  const tabs = [
    { id: 'appointments', label: 'Appointments', icon: 'fa-calendar-alt', count: appointments.length },
    { id: 'prescriptions', label: 'Prescriptions', icon: 'fa-prescription', count: prescriptions.length },
    { id: 'lab', label: 'Lab Reports', icon: 'fa-flask', count: labOrders.length },
    { id: 'vitals', label: 'Vitals & Health', icon: 'fa-heartbeat', count: vitals.length },
    { id: 'discharge', label: 'Discharge', icon: 'fa-file-medical-alt', count: dischargeSummaries.length },
  ];

  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-3 text-muted">Loading your medical records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-warning text-center">
          <i className="fas fa-exclamation-triangle me-2"></i>{error}
        </div>
      </div>
    );
  }

  const upcomingAppts = appointments.filter(a => isFutureDate(a.date) && a.status !== 'Cancelled');
  const pastAppts = appointments.filter(a => !isFutureDate(a.date) || a.status === 'Cancelled');

  // ==================== Column Definitions ====================
  const appointmentColumns = [
    { label: '#', icon: 'fa-hashtag', width: '50px', render: (_, i) => <span className="text-muted">{i + 1}</span> },
    { label: 'Doctor', icon: 'fa-user-md', render: (row) => <strong>{doctorName(row.doctor_name)}</strong> },
    { label: 'Department', icon: 'fa-hospital', render: (row) => row.department_name || '-' },
    { label: 'Date', icon: 'fa-calendar', render: (row) => formatDate(row.date) },
    { label: 'Time', icon: 'fa-clock', render: (row) => formatTime(row.time) },
    { label: 'Token', icon: 'fa-ticket-alt', render: (row) => row.token_number ? <span className="badge bg-info">#{row.token_number}</span> : '-' },
    { label: 'Status', icon: 'fa-info-circle', render: (row) => <span className={`badge ${getStatusBadge(row.status)}`}>{(row.status || 'Scheduled').replace(/_/g, ' ')}</span> },
  ];

  const prescriptionColumns = [
    { label: '#', width: '50px', render: (_, i) => <span className="text-muted">{i + 1}</span> },
    { label: 'Prescription ID', icon: 'fa-hashtag', render: (row) => <strong>#{row.id}</strong> },
    { label: 'Doctor', icon: 'fa-user-md', render: (row) => doctorName(row.doctor_name || row.doctor?.name) },
    { label: 'Diagnosis', icon: 'fa-stethoscope', render: (row) => row.diagnosis || '-' },
    { label: 'Date', icon: 'fa-calendar', render: (row) => formatDate(row.created_at || row.date) },
    { label: 'Medicines', icon: 'fa-pills', render: (row) => {
      const meds = row.medicines || row.items || row.prescription_items || [];
      return meds.length > 0 ? <span className="badge bg-primary">{meds.length} medicine{meds.length > 1 ? 's' : ''}</span> : '-';
    }},
    { label: 'Actions', width: '80px', render: (row) => (
      <button className="btn btn-sm btn-outline-danger" title="Download PDF" onClick={async () => {
        try { const resp = await prescriptionService.downloadPdf(row.id); downloadBlob(resp.data, `prescription_${row.id}.pdf`); }
        catch { alert('Unable to download PDF.'); }
      }}>
        <i className="fas fa-file-pdf"></i>
      </button>
    )},
  ];

  const labColumns = [
    { label: '#', width: '50px', render: (_, i) => <span className="text-muted">{i + 1}</span> },
    { label: 'Order ID', icon: 'fa-hashtag', render: (row) => <strong>#{row.order_number || row.id}</strong> },
    { label: 'Tests', icon: 'fa-vial', render: (row) => {
      const tests = row.tests || row.test_items || row.lab_tests || [];
      return tests.length > 0
        ? tests.map((t, i) => <span key={i} className="badge bg-light text-dark border me-1 mb-1">{t.test_name || t.name || t}</span>)
        : '-';
    }},
    { label: 'Date', icon: 'fa-calendar', render: (row) => formatDate(row.created_at || row.date || row.ordered_date) },
    { label: 'Status', icon: 'fa-info-circle', render: (row) => <span className={`badge ${getStatusBadge(row.status)}`}>{row.status || 'Pending'}</span> },
    { label: 'Actions', width: '80px', render: (row) => (
      (row.status === 'Completed' || row.status === 'completed') ? (
        <button className="btn btn-sm btn-outline-danger" title="Download PDF" onClick={async () => {
          try { const resp = await labService.downloadPdf(row.id); downloadBlob(resp.data, `lab_report_${row.id}.pdf`); }
          catch { alert('Unable to download report.'); }
        }}>
          <i className="fas fa-file-pdf"></i>
        </button>
      ) : <span className="text-muted">-</span>
    )},
  ];

  const vitalsColumns = [
    { label: '#', width: '50px', render: (_, i) => <span className="text-muted">{i + 1}</span> },
    { label: 'Date', icon: 'fa-calendar', render: (row) => formatDate(row.recorded_at || row.created_at || row.date) },
    { label: 'Temp (\u00B0F)', icon: 'fa-thermometer-half', render: (row) => row.temperature || '-' },
    { label: 'Blood Pressure', icon: 'fa-heartbeat', render: (row) => row.blood_pressure || (row.systolic_bp ? `${row.systolic_bp}/${row.diastolic_bp}` : '-') },
    { label: 'Pulse (bpm)', icon: 'fa-heart', render: (row) => row.pulse_rate || row.pulse || '-' },
    { label: 'O2 Sat (%)', icon: 'fa-lungs', render: (row) => row.oxygen_saturation || row.spo2 || '-' },
    { label: 'Weight (kg)', icon: 'fa-weight', render: (row) => row.weight || '-' },
    { label: 'BMI', icon: 'fa-calculator', render: (row) => row.bmi || '-' },
    { label: 'Sugar (mg/dL)', icon: 'fa-tint', render: (row) => row.blood_sugar || row.blood_glucose || '-' },
  ];

  const allergyColumns = [
    { label: '#', width: '50px', render: (_, i) => <span className="text-muted">{i + 1}</span> },
    { label: 'Allergen', icon: 'fa-allergies', render: (row) => <strong>{row.allergen || row.name || row.allergy_name}</strong> },
    { label: 'Severity', icon: 'fa-exclamation-triangle', render: (row) => {
      const sev = row.severity || '-';
      const color = sev.toLowerCase() === 'severe' ? 'bg-danger' : sev.toLowerCase() === 'moderate' ? 'bg-warning text-dark' : 'bg-info';
      return sev !== '-' ? <span className={`badge ${color}`}>{sev}</span> : '-';
    }},
    { label: 'Reaction', render: (row) => row.reaction || row.notes || '-' },
  ];

  const treatmentColumns = [
    { label: '#', width: '50px', render: (_, i) => <span className="text-muted">{i + 1}</span> },
    { label: 'Plan', icon: 'fa-clipboard-list', render: (row) => <strong>{row.title || row.plan_name || `Treatment Plan #${row.id}`}</strong> },
    { label: 'Doctor', icon: 'fa-user-md', render: (row) => row.doctor_name ? doctorName(row.doctor_name) : '-' },
    { label: 'Start Date', icon: 'fa-calendar', render: (row) => formatDate(row.start_date || row.created_at) },
    { label: 'End Date', icon: 'fa-calendar-check', render: (row) => row.end_date ? formatDate(row.end_date) : '-' },
    { label: 'Goals', icon: 'fa-bullseye', render: (row) => row.goals || '-' },
    { label: 'Status', icon: 'fa-info-circle', render: (row) => row.status ? <span className={`badge ${getStatusBadge(row.status)}`}>{row.status}</span> : '-' },
  ];

  const dischargeColumns = [
    { label: '#', width: '50px', render: (_, i) => <span className="text-muted">{i + 1}</span> },
    { label: 'Summary ID', icon: 'fa-hashtag', render: (row) => <strong>#{row.id}</strong> },
    { label: 'Admission', icon: 'fa-sign-in-alt', render: (row) => formatDate(row.admission_date) },
    { label: 'Discharge', icon: 'fa-sign-out-alt', render: (row) => formatDate(row.discharge_date) },
    { label: 'Diagnosis', icon: 'fa-stethoscope', render: (row) => row.diagnosis || '-' },
    { label: 'Follow-up', icon: 'fa-calendar-check', render: (row) => row.follow_up_date ? formatDate(row.follow_up_date) : '-' },
    { label: 'Instructions', render: (row) => {
      const text = row.instructions || row.medications_on_discharge || '-';
      return text.length > 60 ? <span title={text}>{text.substring(0, 60)}...</span> : text;
    }},
    { label: 'Actions', width: '80px', render: (row) => (
      <button className="btn btn-sm btn-outline-danger" title="Download PDF" onClick={async () => {
        try { const resp = await dischargeService.downloadPdf(row.id); downloadBlob(resp.data, `discharge_summary_${row.id}.pdf`); }
        catch { alert('Unable to download summary.'); }
      }}>
        <i className="fas fa-file-pdf"></i>
      </button>
    )},
  ];

  // ==================== Expanded Row for Prescriptions ====================
  const PrescriptionExpandedView = ({ rx }) => {
    const medicines = rx.medicines || rx.items || rx.prescription_items || [];
    if (medicines.length === 0) return null;
    return (
      <div className="card border-0 shadow-sm mt-3">
        <div className="card-header bg-light py-2 d-flex justify-content-between align-items-center">
          <span><i className="fas fa-prescription me-2 text-primary"></i><strong>Prescription #{rx.id}</strong> &mdash; {doctorName(rx.doctor_name || rx.doctor?.name)} &mdash; {formatDate(rx.created_at || rx.date)}</span>
          <button className="btn btn-sm btn-outline-danger" onClick={async () => {
            try { const resp = await prescriptionService.downloadPdf(rx.id); downloadBlob(resp.data, `prescription_${rx.id}.pdf`); }
            catch { alert('Unable to download PDF.'); }
          }}>
            <i className="fas fa-file-pdf me-1"></i>PDF
          </button>
        </div>
        {rx.diagnosis && <div className="px-3 pt-2"><span className="text-muted">Diagnosis:</span> <strong>{rx.diagnosis}</strong></div>}
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm table-striped table-bordered align-middle mb-0" style={{ fontSize: '0.85rem' }}>
              <thead style={{ backgroundColor: '#e9ecef' }}>
                <tr>
                  <th className="py-2 px-3" style={{ width: '40px' }}>#</th>
                  <th className="py-2 px-3">Medicine</th>
                  <th className="py-2 px-3">Dosage</th>
                  <th className="py-2 px-3">Frequency</th>
                  <th className="py-2 px-3">Duration</th>
                  <th className="py-2 px-3">Instructions</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((med, idx) => (
                  <tr key={idx}>
                    <td className="px-3 text-muted">{idx + 1}</td>
                    <td className="px-3 fw-semibold">{med.medicine_name || med.name || med.medicine}</td>
                    <td className="px-3">{med.dosage || '-'}</td>
                    <td className="px-3">{med.frequency || '-'}</td>
                    <td className="px-3">{med.duration ? `${med.duration} days` : '-'}</td>
                    <td className="px-3">{med.instructions || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ==================== Expanded Row for Lab Results ====================
  const LabExpandedView = ({ order }) => {
    const results = order.results || order.test_results || [];
    if (results.length === 0) return null;
    return (
      <div className="card border-0 shadow-sm mt-3">
        <div className="card-header bg-light py-2">
          <i className="fas fa-flask me-2 text-primary"></i>
          <strong>Lab Results &mdash; Order #{order.order_number || order.id}</strong>
          <span className="text-muted ms-2">({formatDate(order.created_at || order.date || order.ordered_date)})</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm table-striped table-bordered align-middle mb-0" style={{ fontSize: '0.85rem' }}>
              <thead style={{ backgroundColor: '#e9ecef' }}>
                <tr>
                  <th className="py-2 px-3" style={{ width: '40px' }}>#</th>
                  <th className="py-2 px-3">Test</th>
                  <th className="py-2 px-3">Value</th>
                  <th className="py-2 px-3">Unit</th>
                  <th className="py-2 px-3">Normal Range</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className={r.is_abnormal ? 'table-danger' : ''}>
                    <td className="px-3 text-muted">{i + 1}</td>
                    <td className="px-3 fw-semibold">{r.test_name || r.name || r.parameter}</td>
                    <td className="px-3"><strong>{r.value || r.result}</strong></td>
                    <td className="px-3">{r.unit || '-'}</td>
                    <td className="px-3">{r.normal_range || r.reference_range || '-'}</td>
                    <td className="px-3">{r.is_abnormal ? <span className="badge bg-danger">Abnormal</span> : <span className="badge bg-success">Normal</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container-fluid px-4 mt-4 mb-5">
      {/* Header Card */}
      <div className="card shadow-sm mb-4" style={{ borderLeft: '4px solid #0d6efd' }}>
        <div className="card-body py-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 50, height: 50, backgroundColor: '#0d6efd', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>
                {(patientInfo?.first_name?.[0] || user?.first_name?.[0] || 'P').toUpperCase()}
              </div>
              <div>
                <h4 className="mb-0">
                  {patientInfo ? `${patientInfo.first_name} ${patientInfo.last_name}` : user?.full_name || user?.email}
                </h4>
                <div className="d-flex gap-2 align-items-center mt-1 flex-wrap">
                  {patientInfo?.patient_id && <span className="badge bg-light text-dark border"><i className="fas fa-id-card me-1"></i>ID: {patientInfo.patient_id}</span>}
                  {patientInfo?.blood_group && <span className="badge bg-danger"><i className="fas fa-tint me-1"></i>{patientInfo.blood_group}</span>}
                  {patientInfo?.gender && <span className="badge bg-light text-dark border"><i className="fas fa-venus-mars me-1"></i>{patientInfo.gender}</span>}
                  {(patientInfo?.phone || patientInfo?.phone_number) && <span className="badge bg-light text-dark border"><i className="fas fa-phone me-1"></i>{patientInfo.phone || patientInfo.phone_number}</span>}
                </div>
              </div>
            </div>
            <div className="d-flex gap-4">
              <div className="text-center px-3" style={{ borderRight: '1px solid #dee2e6' }}>
                <div className="fw-bold text-primary fs-4">{appointments.length}</div>
                <small className="text-muted">Total Visits</small>
              </div>
              <div className="text-center px-3" style={{ borderRight: '1px solid #dee2e6' }}>
                <div className="fw-bold text-success fs-4">{upcomingAppts.length}</div>
                <small className="text-muted">Upcoming</small>
              </div>
              <div className="text-center px-3" style={{ borderRight: '1px solid #dee2e6' }}>
                <div className="fw-bold text-info fs-4">{prescriptions.length}</div>
                <small className="text-muted">Prescriptions</small>
              </div>
              <div className="text-center px-3">
                <div className="fw-bold text-warning fs-4">{labOrders.filter(l => l.status !== 'Completed' && l.status !== 'completed').length}</div>
                <small className="text-muted">Pending Labs</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills mb-4 gap-2 flex-nowrap overflow-auto pb-1">
        {tabs.map(tab => (
          <li className="nav-item" key={tab.id}>
            <button
              className={`nav-link d-flex align-items-center gap-1 text-nowrap ${activeTab === tab.id ? 'active' : 'text-dark border bg-white'}`}
              onClick={() => setActiveTab(tab.id)}
              style={activeTab === tab.id ? {} : { border: '1px solid #dee2e6' }}
            >
              <i className={`fas ${tab.icon}`}></i>
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`badge rounded-pill ms-1 ${activeTab === tab.id ? 'bg-white text-primary' : 'bg-primary text-white'}`} style={{ fontSize: '0.7rem' }}>
                  {tab.count}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* ==================== APPOINTMENTS TAB ==================== */}
      {activeTab === 'appointments' && (
        <div className="card shadow-sm">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="fas fa-calendar-alt text-primary me-2"></i>Appointment History</h5>
            <span className="text-muted">{appointments.length} record{appointments.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="card-body p-0">
            {upcomingAppts.length > 0 && (
              <div className="p-3 pb-0">
                <h6 className="text-success mb-2"><i className="fas fa-calendar-check me-1"></i>Upcoming ({upcomingAppts.length})</h6>
              </div>
            )}
            {upcomingAppts.length > 0 && <div className="px-3 pb-3"><DataGrid columns={appointmentColumns} data={upcomingAppts} /></div>}
            {pastAppts.length > 0 && (
              <div className="p-3 pb-0">
                <h6 className="text-muted mb-2"><i className="fas fa-history me-1"></i>Past Appointments ({pastAppts.length})</h6>
              </div>
            )}
            {pastAppts.length > 0 && <div className="px-3 pb-3"><DataGrid columns={appointmentColumns} data={pastAppts} /></div>}
            {appointments.length === 0 && (
              <div className="p-3">
                <DataGrid columns={appointmentColumns} data={[]} emptyIcon="fa-calendar-times" emptyMessage="No appointments found." />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== PRESCRIPTIONS TAB ==================== */}
      {activeTab === 'prescriptions' && (
        <div className="card shadow-sm">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="fas fa-prescription text-primary me-2"></i>Prescriptions</h5>
            <span className="text-muted">{prescriptions.length} record{prescriptions.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="card-body p-0">
            <div className="px-3 py-3">
              <DataGrid columns={prescriptionColumns} data={prescriptions} emptyIcon="fa-prescription" emptyMessage="No prescriptions found." />
            </div>
          </div>
          {/* Expanded medicine details */}
          {prescriptions.length > 0 && (
            <div className="card-footer bg-white border-top pt-3">
              <h6 className="text-muted mb-3"><i className="fas fa-pills me-2"></i>Medicine Details</h6>
              {prescriptions.map(rx => <PrescriptionExpandedView key={rx.id} rx={rx} />)}
            </div>
          )}
        </div>
      )}

      {/* ==================== LAB REPORTS TAB ==================== */}
      {activeTab === 'lab' && (
        <div className="card shadow-sm">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="fas fa-flask text-primary me-2"></i>Lab Reports</h5>
            <span className="text-muted">{labOrders.length} report{labOrders.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="card-body p-0">
            <div className="px-3 py-3">
              <DataGrid columns={labColumns} data={labOrders} emptyIcon="fa-flask" emptyMessage="No lab reports found." />
            </div>
          </div>
          {/* Expanded test results */}
          {labOrders.some(o => (o.results || o.test_results || []).length > 0) && (
            <div className="card-footer bg-white border-top pt-3">
              <h6 className="text-muted mb-3"><i className="fas fa-microscope me-2"></i>Detailed Test Results</h6>
              {labOrders.map(order => <LabExpandedView key={order.id} order={order} />)}
            </div>
          )}
        </div>
      )}

      {/* ==================== VITALS & HEALTH TAB ==================== */}
      {activeTab === 'vitals' && (
        <div>
          {/* Vitals Summary Cards */}
          {vitals.length > 0 && (
            <div className="row g-3 mb-4">
              {[
                { icon: 'fa-thermometer-half', label: 'Temperature', value: vitals[0].temperature ? `${vitals[0].temperature}\u00B0F` : '-', color: '#fd7e14', bg: '#fff3e6' },
                { icon: 'fa-heartbeat', label: 'Blood Pressure', value: vitals[0].blood_pressure || (vitals[0].systolic_bp ? `${vitals[0].systolic_bp}/${vitals[0].diastolic_bp}` : '-'), color: '#dc3545', bg: '#fce4e4' },
                { icon: 'fa-heart', label: 'Pulse', value: (vitals[0].pulse_rate || vitals[0].pulse) ? `${vitals[0].pulse_rate || vitals[0].pulse} bpm` : '-', color: '#0d6efd', bg: '#e7f0ff' },
                { icon: 'fa-lungs', label: 'O2 Saturation', value: (vitals[0].oxygen_saturation || vitals[0].spo2) ? `${vitals[0].oxygen_saturation || vitals[0].spo2}%` : '-', color: '#0dcaf0', bg: '#e0f7fa' },
                { icon: 'fa-weight', label: 'Weight', value: vitals[0].weight ? `${vitals[0].weight} kg` : '-', color: '#198754', bg: '#e6f4ea' },
              ].map((v, i) => (
                <div className="col-6 col-md" key={i}>
                  <div className="card border-0 h-100 shadow-sm" style={{ backgroundColor: v.bg }}>
                    <div className="card-body text-center py-3">
                      <i className={`fas ${v.icon} fa-lg mb-2 d-block`} style={{ color: v.color }}></i>
                      <div className="fw-bold fs-5" style={{ color: v.color }}>{v.value}</div>
                      <small className="text-muted">{v.label}</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Vitals History Grid */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white py-3">
              <h5 className="mb-0"><i className="fas fa-chart-line text-primary me-2"></i>Vitals History</h5>
            </div>
            <div className="card-body p-0 px-3 py-3">
              <DataGrid columns={vitalsColumns} data={vitals} emptyIcon="fa-heartbeat" emptyMessage="No vitals recorded yet." />
            </div>
          </div>

          {/* Allergies Grid */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white py-3">
              <h5 className="mb-0"><i className="fas fa-allergies text-warning me-2"></i>Allergies</h5>
            </div>
            <div className="card-body p-0 px-3 py-3">
              <DataGrid columns={allergyColumns} data={allergies} emptyIcon="fa-allergies" emptyMessage="No allergies recorded." />
            </div>
          </div>

          {/* Treatment Plans Grid */}
          <div className="card shadow-sm">
            <div className="card-header bg-white py-3">
              <h5 className="mb-0"><i className="fas fa-clipboard-list text-primary me-2"></i>Treatment Plans</h5>
            </div>
            <div className="card-body p-0 px-3 py-3">
              <DataGrid columns={treatmentColumns} data={treatmentPlans} emptyIcon="fa-clipboard-list" emptyMessage="No treatment plans found." />
            </div>
          </div>
        </div>
      )}

      {/* ==================== DISCHARGE TAB ==================== */}
      {activeTab === 'discharge' && (
        <div className="card shadow-sm">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="fas fa-file-medical-alt text-primary me-2"></i>Discharge Summaries</h5>
            <span className="text-muted">{dischargeSummaries.length} record{dischargeSummaries.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="card-body p-0 px-3 py-3">
            <DataGrid columns={dischargeColumns} data={dischargeSummaries} emptyIcon="fa-file-medical" emptyMessage="No discharge summaries found." />
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRecords;
