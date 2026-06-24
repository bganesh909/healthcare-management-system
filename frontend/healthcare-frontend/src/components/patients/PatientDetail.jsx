import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  patientService, appointmentService, prescriptionService,
  labService, vitalsService, allergyService, billingService,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
const fmtTime = (t) => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h, 10); return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; };
const calcAge = (dob) => { if (!dob) return null; const t = new Date(); const b = new Date(dob); return t.getFullYear() - b.getFullYear() - ((t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) ? 1 : 0); };

const GENDER_COLOR = { M: '#3498db', F: '#e91e63', O: '#7f8c8d' };
const downloadBlob = (blob, filename) => { const u = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(u); };

const PatientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isStaff, isDoctor } = useAuth();
  const canManage = isAdmin || isStaff || isDoctor;

  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, aRes, rxRes, lRes, vRes, alRes, bRes] = await Promise.allSettled([
          patientService.get(id),
          appointmentService.getAll({ patient: id }),
          prescriptionService.getByPatient(id),
          labService.getOrdersByPatient(id),
          vitalsService.getHistory(id),
          allergyService.getByPatient(id),
          billingService.getByPatient(id),
        ]);
        if (pRes.status === 'fulfilled') setPatient(pRes.value.data);
        else { setError('Patient not found'); setLoading(false); return; }

        if (aRes.status === 'fulfilled') setAppointments(aRes.value.data || []);
        if (rxRes.status === 'fulfilled') { const d = rxRes.value.data?.results || rxRes.value.data || []; setPrescriptions(Array.isArray(d) ? d : []); }
        if (lRes.status === 'fulfilled') { const d = lRes.value.data?.results || lRes.value.data || []; setLabOrders(Array.isArray(d) ? d : []); }
        if (vRes.status === 'fulfilled') { const d = vRes.value.data?.results || vRes.value.data || []; setVitals(Array.isArray(d) ? d : []); }
        if (alRes.status === 'fulfilled') { const d = alRes.value.data?.results || alRes.value.data || []; setAllergies(Array.isArray(d) ? d : []); }
        if (bRes.status === 'fulfilled') { const d = bRes.value.data?.results || bRes.value.data || []; setInvoices(Array.isArray(d) ? d : []); }
      } catch { setError('Error loading patient'); }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this patient?')) {
      try { await patientService.delete(id); navigate('/patients'); } catch { setError('Error deleting patient'); }
    }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  if (error) return <div className="container mt-4"><div className="alert alert-danger">{error}</div></div>;
  if (!patient) return <div className="container mt-4"><div className="alert alert-warning">Patient not found</div></div>;

  const gColor = GENDER_COLOR[patient.gender] || '#7f8c8d';
  const initials = `${(patient.first_name || 'P')[0]}${(patient.last_name || '')[0] || ''}`.toUpperCase();
  const age = calcAge(patient.date_of_birth);
  const completedAppts = appointments.filter(a => a.status === 'COMPLETED').length;
  const upcomingAppts = appointments.filter(a => new Date(a.appointment_date) >= new Date(new Date().toDateString()) && a.status !== 'CANCELLED').length;
  const pendingLabs = labOrders.filter(l => l.status && !['COMPLETED', 'Completed'].includes(l.status)).length;

  const tabs = [
    { id: 'info', label: 'Personal Info', icon: 'fa-user' },
    { id: 'appointments', label: `Appointments (${appointments.length})`, icon: 'fa-calendar-alt' },
    { id: 'prescriptions', label: `Prescriptions (${prescriptions.length})`, icon: 'fa-prescription' },
    { id: 'lab', label: `Lab Reports (${labOrders.length})`, icon: 'fa-flask' },
    { id: 'vitals', label: `Vitals (${vitals.length})`, icon: 'fa-heartbeat' },
    { id: 'billing', label: `Billing (${invoices.length})`, icon: 'fa-file-invoice-dollar' },
  ];

  return (
    <div className="mb-5">
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${gColor}dd, ${gColor}88)`, padding: '2.5rem 0 4rem', color: '#fff' }}>
        <div className="container">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, border: '3px solid rgba(255,255,255,0.4)', flexShrink: 0 }}>{initials}</div>
            <div style={{ flex: 1 }}>
              <h2 className="mb-1" style={{ fontWeight: 700 }}>{patient.first_name} {patient.last_name}</h2>
              <div className="d-flex flex-wrap align-items-center gap-2" style={{ fontSize: '0.92rem', opacity: 0.9 }}>
                <span><i className="fas fa-venus-mars me-1"></i>{patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}</span>
                {age != null && <><span className="mx-1">|</span><span><i className="fas fa-birthday-cake me-1"></i>{age} years old</span></>}
                {patient.blood_group && <><span className="mx-1">|</span><span><i className="fas fa-tint me-1"></i>{patient.blood_group}</span></>}
                <span className="mx-1">|</span><span><i className="fas fa-phone me-1"></i>{patient.phone_number}</span>
              </div>
              {allergies.length > 0 && (
                <div className="mt-2 d-flex flex-wrap gap-1">
                  <i className="fas fa-exclamation-triangle me-1" style={{ opacity: 0.8 }}></i>
                  {allergies.map((a, i) => (
                    <span key={i} style={{ background: 'rgba(255,255,255,0.2)', padding: '0.15rem 0.5rem', borderRadius: 12, fontSize: '0.78rem' }}>
                      {a.allergen || a.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <Link to={`/appointments/add?patient=${patient.id}`} className="btn btn-light btn-sm" style={{ borderRadius: 8 }}>
                <i className="fas fa-calendar-plus me-1"></i>Book Appointment
              </Link>
              <Link to={`/patients/${patient.id}/documents`} className="btn btn-outline-light btn-sm" style={{ borderRadius: 8 }}>
                <i className="fas fa-file-upload me-1"></i>Documents
              </Link>
              {canManage && (
                <>
                  <Link to={`/patients/edit/${patient.id}`} className="btn btn-outline-light btn-sm" style={{ borderRadius: 8 }}><i className="fas fa-edit me-1"></i>Edit</Link>
                  <button onClick={handleDelete} className="btn btn-outline-light btn-sm" style={{ borderRadius: 8 }}><i className="fas fa-trash me-1"></i>Delete</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="container" style={{ marginTop: '-2.5rem', position: 'relative', zIndex: 2 }}>
        <div className="row g-3 mb-4">
          {[
            { label: 'Total Visits', value: appointments.length, icon: 'fa-calendar-check', color: '#3498db' },
            { label: 'Completed', value: completedAppts, icon: 'fa-check-circle', color: '#27ae60' },
            { label: 'Upcoming', value: upcomingAppts, icon: 'fa-clock', color: '#e67e22' },
            { label: 'Prescriptions', value: prescriptions.length, icon: 'fa-prescription', color: '#8e44ad' },
            { label: 'Pending Labs', value: pendingLabs, icon: 'fa-flask', color: '#e74c3c' },
            { label: 'Invoices', value: invoices.length, icon: 'fa-file-invoice', color: '#16a085' },
          ].map((s, i) => (
            <div className="col" key={i}>
              <div className="card shadow-sm text-center py-3" style={{ borderRadius: 12, border: 'none' }}>
                <div><i className={`fas ${s.icon}`} style={{ fontSize: '1.3rem', color: s.color }}></i></div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#2c3e50' }}>{s.value}</div>
                <div style={{ fontSize: '0.73rem', color: '#7f8c8d' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <ul className="nav nav-pills mb-4 gap-2 flex-nowrap" style={{ overflowX: 'auto' }}>
          {tabs.map(tab => (
            <li className="nav-item" key={tab.id}>
              <button className={`nav-link ${activeTab === tab.id ? 'active' : ''}`} style={{ borderRadius: 8, fontSize: '0.85rem', whiteSpace: 'nowrap' }} onClick={() => setActiveTab(tab.id)}>
                <i className={`fas ${tab.icon} me-1`}></i>{tab.label}
              </button>
            </li>
          ))}
        </ul>

        {/* TAB: Info */}
        {activeTab === 'info' && (
          <div className="row g-4">
            <div className="col-lg-6">
              <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
                <div className="card-body">
                  <h5 style={{ fontWeight: 700, color: '#1a5276' }}><i className="fas fa-id-card me-2"></i>Personal Details</h5>
                  <div className="row g-3 mt-1">
                    {[
                      { label: 'Full Name', value: `${patient.first_name} ${patient.last_name}` },
                      { label: 'Date of Birth', value: fmt(patient.date_of_birth) },
                      { label: 'Gender', value: patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other' },
                      { label: 'Blood Group', value: patient.blood_group || 'Not specified' },
                      { label: 'Email', value: patient.email },
                      { label: 'Phone', value: patient.phone_number },
                    ].map((item, i) => (
                      <div className="col-sm-6" key={i}>
                        <div style={{ fontSize: '0.73rem', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
                        <div style={{ fontWeight: 600, color: '#2c3e50' }}>{item.value}</div>
                      </div>
                    ))}
                    <div className="col-12">
                      <div style={{ fontSize: '0.73rem', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: 0.5 }}>Address</div>
                      <div style={{ fontWeight: 500, color: '#2c3e50' }}>{patient.address || 'Not provided'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }}>
                <div className="card-body">
                  <h5 style={{ fontWeight: 700, color: '#1a5276' }}><i className="fas fa-heartbeat me-2"></i>Medical Information</h5>
                  <div className="mb-3">
                    <div style={{ fontSize: '0.73rem', color: '#7f8c8d', textTransform: 'uppercase' }}>Allergies</div>
                    {allergies.length > 0 ? (
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {allergies.map((a, i) => (
                          <span key={i} className="badge" style={{ background: '#fff3cd', color: '#856404', border: '1px solid #ffc107' }}>
                            <i className="fas fa-exclamation-triangle me-1"></i>{a.allergen || a.name}{a.severity && ` (${a.severity})`}
                          </span>
                        ))}
                      </div>
                    ) : <div style={{ color: '#27ae60' }}><i className="fas fa-check-circle me-1"></i>No known allergies</div>}
                  </div>
                  <div className="mb-3">
                    <div style={{ fontSize: '0.73rem', color: '#7f8c8d', textTransform: 'uppercase' }}>Medical History</div>
                    <div style={{ fontSize: '0.9rem' }}>{patient.medical_history || 'No history recorded'}</div>
                  </div>
                </div>
              </div>
              <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
                <div className="card-body">
                  <h5 style={{ fontWeight: 700, color: '#1a5276' }}><i className="fas fa-phone-alt me-2"></i>Emergency Contact</h5>
                  <div className="row g-2">
                    <div className="col-6"><div style={{ fontSize: '0.73rem', color: '#7f8c8d', textTransform: 'uppercase' }}>Name</div><div style={{ fontWeight: 600 }}>{patient.emergency_contact_name || 'Not provided'}</div></div>
                    <div className="col-6"><div style={{ fontSize: '0.73rem', color: '#7f8c8d', textTransform: 'uppercase' }}>Phone</div><div style={{ fontWeight: 600 }}>{patient.emergency_contact_number || 'Not provided'}</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Appointments */}
        {activeTab === 'appointments' && (
          <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
            <div className="card-header bg-white d-flex justify-content-between align-items-center" style={{ borderRadius: '12px 12px 0 0' }}>
              <h6 className="mb-0" style={{ fontWeight: 700, color: '#1a5276' }}>Appointment History</h6>
              <Link to={`/appointments/add?patient=${patient.id}`} className="btn btn-primary btn-sm" style={{ borderRadius: 8 }}><i className="fas fa-plus me-1"></i>Book New</Link>
            </div>
            <div className="card-body p-0">
              {appointments.length === 0 ? <div className="text-center py-4 text-muted">No appointments found</div> : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#7f8c8d', background: '#fafbfc' }}>
                      <tr><th>Date</th><th>Time</th><th>Doctor</th><th>Reason</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {appointments.map(a => (
                        <tr key={a.id} onClick={() => navigate(`/appointments/${a.id}`)} style={{ cursor: 'pointer' }}>
                          <td style={{ fontWeight: 600 }}>{fmt(a.appointment_date)}</td>
                          <td>{fmtTime(a.appointment_time)}</td>
                          <td>{a.doctor_name || `Doctor #${a.doctor}`}</td>
                          <td className="text-muted" style={{ fontSize: '0.85rem' }}>{a.reason || '-'}</td>
                          <td><span className={`badge bg-${a.status === 'COMPLETED' ? 'success' : a.status === 'CANCELLED' ? 'danger' : a.status === 'NO_SHOW' ? 'warning' : 'primary'}`}>{a.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Prescriptions */}
        {activeTab === 'prescriptions' && (
          <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
            <div className="card-body p-0">
              {prescriptions.length === 0 ? <div className="text-center py-4 text-muted">No prescriptions found</div> : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#7f8c8d', background: '#fafbfc' }}>
                      <tr><th>ID</th><th>Date</th><th>Doctor</th><th>Diagnosis</th><th>Follow-up</th><th>PDF</th></tr>
                    </thead>
                    <tbody>
                      {prescriptions.map(rx => (
                        <tr key={rx.id}>
                          <td><Link to={`/prescriptions/${rx.id}`} style={{ fontWeight: 600 }}>#{rx.id}</Link></td>
                          <td>{fmt(rx.created_at)}</td>
                          <td>{rx.doctor_name || `Doctor #${rx.doctor}`}</td>
                          <td style={{ fontSize: '0.85rem' }}>{rx.diagnosis || '-'}</td>
                          <td>{rx.follow_up_date ? fmt(rx.follow_up_date) : '-'}</td>
                          <td>
                            <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: 6 }}
                              onClick={async () => { try { const r = await prescriptionService.downloadPdf(rx.id); downloadBlob(r.data, `rx_${rx.id}.pdf`); } catch { alert('Download failed'); } }}>
                              <i className="fas fa-file-pdf"></i>
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
        )}

        {/* TAB: Lab Reports */}
        {activeTab === 'lab' && (
          <div>
            {labOrders.length === 0 ? <div className="text-center py-4 text-muted"><i className="fas fa-flask fa-2x mb-2 d-block"></i>No lab reports</div> :
              labOrders.map(order => {
                const results = order.results || order.test_results || order.items || [];
                return (
                  <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }} key={order.id}>
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <span style={{ fontWeight: 700 }}>Order #{order.order_number || order.id}</span>
                          <div style={{ fontSize: '0.82rem', color: '#7f8c8d' }}>{fmt(order.created_at || order.ordered_date)} {order.doctor_name && <>&bull; Dr. {order.doctor_name}</>}</div>
                        </div>
                        <div className="d-flex gap-2 align-items-center">
                          <span className={`badge bg-${order.status === 'COMPLETED' || order.status === 'Completed' ? 'success' : 'warning'}`}>{order.status}</span>
                          {(order.status === 'COMPLETED' || order.status === 'Completed') && (
                            <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: 6 }}
                              onClick={async () => { try { const r = await labService.downloadPdf(order.id); downloadBlob(r.data, `lab_${order.id}.pdf`); } catch { alert('Download failed'); } }}>
                              <i className="fas fa-file-pdf"></i>
                            </button>
                          )}
                        </div>
                      </div>
                      {results.length > 0 && (
                        <div className="table-responsive">
                          <table className="table table-sm mb-0" style={{ fontSize: '0.85rem' }}>
                            <thead><tr><th>Test</th><th>Value</th><th>Unit</th><th>Range</th><th>Status</th></tr></thead>
                            <tbody>
                              {results.map((r, i) => (
                                <tr key={i}>
                                  <td>{r.test_name || r.name}</td>
                                  <td className={r.is_abnormal ? 'text-danger fw-bold' : ''}>{r.value || r.result || '-'}</td>
                                  <td>{r.unit || '-'}</td>
                                  <td>{r.normal_range || '-'}</td>
                                  <td>{r.is_abnormal ? <span className="text-danger fw-bold">Abnormal</span> : <span className="text-success">Normal</span>}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* TAB: Vitals */}
        {activeTab === 'vitals' && (
          <div>
            {vitals.length === 0 ? <div className="text-center py-4 text-muted"><i className="fas fa-heartbeat fa-2x mb-2 d-block"></i>No vitals recorded</div> : (
              <>
                {/* Latest Vitals Grid */}
                {(() => {
                  const latest = vitals[0];
                  const items = [
                    { icon: 'fa-thermometer-half', label: 'Temp', value: latest.temperature ? `${latest.temperature}\u00B0F` : '-', color: '#e74c3c' },
                    { icon: 'fa-heartbeat', label: 'BP', value: latest.blood_pressure || (latest.systolic_bp ? `${latest.systolic_bp}/${latest.diastolic_bp}` : '-'), color: '#e91e63' },
                    { icon: 'fa-heart', label: 'Pulse', value: latest.pulse_rate ? `${latest.pulse_rate} bpm` : '-', color: '#9b59b6' },
                    { icon: 'fa-lungs', label: 'O2', value: latest.oxygen_saturation ? `${latest.oxygen_saturation}%` : '-', color: '#3498db' },
                    { icon: 'fa-weight', label: 'Weight', value: latest.weight ? `${latest.weight} kg` : '-', color: '#27ae60' },
                    { icon: 'fa-calculator', label: 'BMI', value: latest.bmi || '-', color: '#e67e22' },
                  ];
                  return (
                    <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }}>
                      <div className="card-body">
                        <h6 style={{ fontWeight: 700, color: '#1a5276' }}>Latest Vitals <span className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 400 }}>({fmt(latest.recorded_at || latest.created_at)})</span></h6>
                        <div className="row g-2">
                          {items.map((v, i) => (
                            <div className="col-4 col-md-2 text-center" key={i}>
                              <div className="py-2 px-1" style={{ background: '#f8f9fa', borderRadius: 10 }}>
                                <div><i className={`fas ${v.icon}`} style={{ color: v.color }}></i></div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c3e50' }}>{v.value}</div>
                                <div style={{ fontSize: '0.7rem', color: '#7f8c8d' }}>{v.label}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {/* History Table */}
                <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                        <thead style={{ background: '#fafbfc' }}><tr><th>Date</th><th>Temp</th><th>BP</th><th>Pulse</th><th>O2</th><th>Weight</th><th>Sugar</th></tr></thead>
                        <tbody>
                          {vitals.slice(0, 15).map((v, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600 }}>{fmt(v.recorded_at || v.created_at)}</td>
                              <td>{v.temperature ? `${v.temperature}\u00B0` : '-'}</td>
                              <td>{v.blood_pressure || (v.systolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : '-')}</td>
                              <td>{v.pulse_rate || '-'}</td>
                              <td>{v.oxygen_saturation ? `${v.oxygen_saturation}%` : '-'}</td>
                              <td>{v.weight ? `${v.weight} kg` : '-'}</td>
                              <td>{v.blood_sugar || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB: Billing */}
        {activeTab === 'billing' && (
          <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
            <div className="card-body p-0">
              {invoices.length === 0 ? <div className="text-center py-4 text-muted">No invoices found</div> : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#7f8c8d', background: '#fafbfc' }}>
                      <tr><th>Invoice #</th><th>Date</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {invoices.map(inv => (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: 600 }}>{inv.invoice_number || `INV-${inv.id}`}</td>
                          <td>{fmt(inv.created_at)}</td>
                          <td style={{ fontWeight: 600 }}>&#8377;{parseFloat(inv.total_amount || 0).toLocaleString('en-IN')}</td>
                          <td className="text-success">&#8377;{parseFloat(inv.paid_amount || 0).toLocaleString('en-IN')}</td>
                          <td className="text-danger">&#8377;{(parseFloat(inv.total_amount || 0) - parseFloat(inv.paid_amount || 0)).toLocaleString('en-IN')}</td>
                          <td><span className={`badge bg-${inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'danger' : 'warning'}`}>{inv.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Back */}
        <div className="mt-4">
          <Link to="/patients" className="btn btn-outline-secondary" style={{ borderRadius: 8 }}><i className="fas fa-arrow-left me-1"></i>Back to Patients</Link>
        </div>
      </div>
    </div>
  );
};

export default PatientDetail;
