import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { appointmentService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
const fmtTime = (t) => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h, 10); return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; };
const fmtDateTime = (dt) => dt ? new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

const STATUS_CONFIG = {
  SCHEDULED: { bg: '#3498db', icon: 'fa-clock', label: 'Scheduled' },
  COMPLETED: { bg: '#27ae60', icon: 'fa-check-circle', label: 'Completed' },
  CANCELLED: { bg: '#e74c3c', icon: 'fa-times-circle', label: 'Cancelled' },
  NO_SHOW: { bg: '#e67e22', icon: 'fa-user-slash', label: 'No Show' },
};

const AppointmentDetail = () => {
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isStaff, isDoctor } = useAuth();
  const canManage = isAdmin || isStaff || isDoctor;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await appointmentService.get(id);
        setAppt(res.data);
      } catch { setError('Error fetching appointment'); }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try { await appointmentService.checkIn(id); const res = await appointmentService.get(id); setAppt(res.data); } catch { setError('Check-in failed'); }
    setActionLoading(false);
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try { await appointmentService.checkOut(id); const res = await appointmentService.get(id); setAppt(res.data); } catch { setError('Check-out failed'); }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this appointment?')) {
      try { await appointmentService.delete(id); navigate('/appointments'); } catch { setError('Error deleting'); }
    }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  if (error && !appt) return <div className="container mt-4"><div className="alert alert-danger">{error}</div></div>;
  if (!appt) return <div className="container mt-4"><div className="alert alert-warning">Appointment not found</div></div>;

  const sc = STATUS_CONFIG[appt.status] || STATUS_CONFIG.SCHEDULED;
  // Patient/doctor can be nested objects (detail serializer) or IDs (write serializer)
  const patient = typeof appt.patient === 'object' ? appt.patient : null;
  const doctor = typeof appt.doctor === 'object' ? appt.doctor : null;
  const patientName = patient ? `${patient.first_name} ${patient.last_name}` : (appt.patient_name || `Patient #${appt.patient}`);
  const doctorName = doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : (appt.doctor_name || `Doctor #${appt.doctor}`);
  const patientId = patient?.id || appt.patient;
  const doctorId = doctor?.id || appt.doctor;

  const canCheckIn = appt.status === 'SCHEDULED' && !appt.check_in_time;
  const canCheckOut = appt.check_in_time && !appt.check_out_time && appt.status !== 'COMPLETED';

  // Timeline steps
  const timeline = [
    { label: 'Booked', icon: 'fa-calendar-plus', time: fmtDateTime(appt.created_at), done: true, color: '#3498db' },
    { label: 'Checked In', icon: 'fa-sign-in-alt', time: appt.check_in_time ? fmtDateTime(appt.check_in_time) : null, done: !!appt.check_in_time, color: '#e67e22' },
    { label: 'Completed', icon: 'fa-check-circle', time: appt.check_out_time ? fmtDateTime(appt.check_out_time) : null, done: appt.status === 'COMPLETED', color: '#27ae60' },
  ];

  return (
    <div className="mb-5">
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${sc.bg}dd, ${sc.bg}99)`, padding: '2rem 0 3.5rem', color: '#fff' }}>
        <div className="container">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.3rem 0.8rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600 }}>
                  <i className={`fas ${sc.icon} me-1`}></i>{sc.label}
                </span>
                {appt.is_walk_in && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.3rem 0.6rem', borderRadius: 8, fontSize: '0.78rem' }}>Walk-in</span>}
                {appt.token_number && <span style={{ background: 'rgba(255,255,255,0.25)', padding: '0.3rem 0.6rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700 }}>Token #{appt.token_number}</span>}
              </div>
              <h3 style={{ fontWeight: 700 }}>Appointment #{appt.id}</h3>
              <div style={{ fontSize: '1rem', opacity: 0.9 }}>
                <i className="fas fa-calendar me-1"></i>{fmt(appt.appointment_date)}
                <span className="mx-2">|</span>
                <i className="fas fa-clock me-1"></i>{fmtTime(appt.appointment_time)}
              </div>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              {canManage && canCheckIn && (
                <button className="btn btn-light btn-sm" style={{ borderRadius: 8 }} disabled={actionLoading} onClick={handleCheckIn}>
                  {actionLoading ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="fas fa-sign-in-alt me-1"></i>}Check In
                </button>
              )}
              {canManage && canCheckOut && (
                <button className="btn btn-light btn-sm" style={{ borderRadius: 8 }} disabled={actionLoading} onClick={handleCheckOut}>
                  {actionLoading ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="fas fa-sign-out-alt me-1"></i>}Check Out
                </button>
              )}
              <Link to={`/appointments/edit/${appt.id}`} className="btn btn-outline-light btn-sm" style={{ borderRadius: 8 }}><i className="fas fa-edit me-1"></i>Edit</Link>
              {canManage && <button className="btn btn-outline-light btn-sm" style={{ borderRadius: 8 }} onClick={handleDelete}><i className="fas fa-trash me-1"></i>Delete</button>}
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: '-2rem', position: 'relative', zIndex: 2 }}>
        {error && <div className="alert alert-danger mt-3">{error}</div>}

        {/* Timeline */}
        <div className="card shadow-sm mb-4" style={{ borderRadius: 12, border: 'none' }}>
          <div className="card-body py-3">
            <div className="d-flex justify-content-between align-items-center" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: 3, background: '#e9ecef', zIndex: 0 }}></div>
              {timeline.map((step, i) => (
                <div key={i} className="text-center" style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                  <div className="mx-auto mb-1" style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: step.done ? step.color : '#e9ecef',
                    color: step.done ? '#fff' : '#adb5bd',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', transition: 'all 0.3s',
                  }}>
                    <i className={`fas ${step.icon}`}></i>
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: step.done ? '#2c3e50' : '#adb5bd' }}>{step.label}</div>
                  {step.time && <div style={{ fontSize: '0.72rem', color: '#7f8c8d' }}>{step.time}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Patient & Doctor Cards */}
        <div className="row g-4 mb-4">
          <div className="col-md-6">
            <div className="card shadow-sm h-100" style={{ borderRadius: 12, border: 'none' }}>
              <div className="card-body">
                <h6 style={{ fontWeight: 700, color: '#1a5276' }}><i className="fas fa-user-injured me-2"></i>Patient</h6>
                <div className="d-flex align-items-center gap-3 mt-3">
                  <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#ebf5fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, color: '#3498db' }}>
                    {patientName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{patientName}</div>
                    {patient?.email && <div style={{ fontSize: '0.82rem', color: '#7f8c8d' }}><i className="fas fa-envelope me-1"></i>{patient.email}</div>}
                    {patient?.phone_number && <div style={{ fontSize: '0.82rem', color: '#7f8c8d' }}><i className="fas fa-phone me-1"></i>{patient.phone_number}</div>}
                  </div>
                </div>
                <Link to={`/patients/${patientId}`} className="btn btn-sm btn-outline-primary mt-3 w-100" style={{ borderRadius: 8 }}>
                  <i className="fas fa-external-link-alt me-1"></i>View Patient Profile
                </Link>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card shadow-sm h-100" style={{ borderRadius: 12, border: 'none' }}>
              <div className="card-body">
                <h6 style={{ fontWeight: 700, color: '#1a5276' }}><i className="fas fa-user-md me-2"></i>Doctor</h6>
                <div className="d-flex align-items-center gap-3 mt-3">
                  <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#eafaf1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, color: '#27ae60' }}>
                    {doctorName.replace('Dr. ', '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{doctorName}</div>
                    {doctor?.specialization_display && <div style={{ fontSize: '0.82rem', color: '#7f8c8d' }}><i className="fas fa-stethoscope me-1"></i>{doctor.specialization_display}</div>}
                    {doctor?.email && <div style={{ fontSize: '0.82rem', color: '#7f8c8d' }}><i className="fas fa-envelope me-1"></i>{doctor.email}</div>}
                  </div>
                </div>
                <Link to={`/doctors/${doctorId}`} className="btn btn-sm btn-outline-primary mt-3 w-100" style={{ borderRadius: 8 }}>
                  <i className="fas fa-external-link-alt me-1"></i>View Doctor Profile
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Appointment Details */}
        <div className="card shadow-sm mb-4" style={{ borderRadius: 12, border: 'none' }}>
          <div className="card-body">
            <h6 style={{ fontWeight: 700, color: '#1a5276' }}><i className="fas fa-file-medical me-2"></i>Details</h6>
            <div className="row g-3 mt-1">
              <div className="col-md-6">
                <div style={{ fontSize: '0.73rem', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: 0.5 }}>Reason for Visit</div>
                <div style={{ fontWeight: 500, color: '#2c3e50' }}>{appt.reason || 'Not specified'}</div>
              </div>
              <div className="col-md-6">
                <div style={{ fontSize: '0.73rem', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</div>
                <div style={{ fontWeight: 500, color: '#2c3e50' }}>{appt.notes || 'No notes'}</div>
              </div>
              <div className="col-md-3">
                <div style={{ fontSize: '0.73rem', color: '#7f8c8d', textTransform: 'uppercase' }}>Date</div>
                <div style={{ fontWeight: 600 }}>{fmt(appt.appointment_date)}</div>
              </div>
              <div className="col-md-3">
                <div style={{ fontSize: '0.73rem', color: '#7f8c8d', textTransform: 'uppercase' }}>Time</div>
                <div style={{ fontWeight: 600 }}>{fmtTime(appt.appointment_time)}</div>
              </div>
              <div className="col-md-3">
                <div style={{ fontSize: '0.73rem', color: '#7f8c8d', textTransform: 'uppercase' }}>Check-in</div>
                <div style={{ fontWeight: 500 }}>{appt.check_in_time ? fmtDateTime(appt.check_in_time) : <span className="text-muted">-</span>}</div>
              </div>
              <div className="col-md-3">
                <div style={{ fontSize: '0.73rem', color: '#7f8c8d', textTransform: 'uppercase' }}>Check-out</div>
                <div style={{ fontWeight: 500 }}>{appt.check_out_time ? fmtDateTime(appt.check_out_time) : <span className="text-muted">-</span>}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card shadow-sm mb-4" style={{ borderRadius: 12, border: 'none' }}>
          <div className="card-body">
            <h6 style={{ fontWeight: 700, color: '#1a5276' }}><i className="fas fa-bolt me-2"></i>Related Actions</h6>
            <div className="d-flex flex-wrap gap-2 mt-2">
              {appt.status === 'COMPLETED' && (
                <Link to={`/prescriptions/add?appointment=${appt.id}&patient=${patientId}&doctor=${doctorId}`} className="btn btn-sm btn-outline-primary" style={{ borderRadius: 8 }}>
                  <i className="fas fa-prescription me-1"></i>Write Prescription
                </Link>
              )}
              <Link to={`/prescriptions?patient=${patientId}`} className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 8 }}>
                <i className="fas fa-prescription-bottle me-1"></i>View Prescriptions
              </Link>
              <Link to={`/lab/add?patient=${patientId}&doctor=${doctorId}`} className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 8 }}>
                <i className="fas fa-flask me-1"></i>Order Lab Test
              </Link>
              <Link to={`/patients/${patientId}`} className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 8 }}>
                <i className="fas fa-notes-medical me-1"></i>Medical History
              </Link>
            </div>
          </div>
        </div>

        {/* Back */}
        <Link to="/appointments" className="btn btn-outline-secondary" style={{ borderRadius: 8 }}>
          <i className="fas fa-arrow-left me-1"></i>Back to Appointments
        </Link>
      </div>
    </div>
  );
};

export default AppointmentDetail;
