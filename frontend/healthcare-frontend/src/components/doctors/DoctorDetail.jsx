import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { doctorService, appointmentService, prescriptionService, reviewService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SPEC_COLORS = {
  CARDIOLOGY: '#e74c3c', DERMATOLOGY: '#e67e22', ENDOCRINOLOGY: '#9b59b6',
  GASTROENTEROLOGY: '#2ecc71', NEUROLOGY: '#3498db', ONCOLOGY: '#1abc9c',
  PEDIATRICS: '#f39c12', PSYCHIATRY: '#8e44ad', ORTHOPEDICS: '#2c3e50',
  GYNECOLOGY: '#e91e63', GENERAL: '#16a085', OTHER: '#7f8c8d',
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
};

const Stars = ({ rating, size = '1rem' }) => (
  <span className="d-inline-flex gap-1">
    {[1, 2, 3, 4, 5].map(s => (
      <i key={s} className={`${(rating || 0) >= s ? 'fas' : 'far'} fa-star`}
        style={{ color: (rating || 0) >= s ? '#f39c12' : '#dee2e6', fontSize: size }}></i>
    ))}
  </span>
);

const DoctorDetail = () => {
  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ avg: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('about');
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isStaff } = useAuth();
  const canManage = isAdmin || isStaff;

  useEffect(() => {
    const load = async () => {
      try {
        const [docRes, apptRes, rxRes, revRes] = await Promise.allSettled([
          doctorService.get(id),
          appointmentService.getAll({ doctor: id }),
          prescriptionService.getByDoctor(id),
          reviewService.getByDoctor(id),
        ]);
        if (docRes.status === 'fulfilled') setDoctor(docRes.value.data);
        else { setError('Doctor not found'); setLoading(false); return; }

        if (apptRes.status === 'fulfilled') setAppointments(apptRes.value.data || []);
        if (rxRes.status === 'fulfilled') {
          const d = rxRes.value.data?.results || rxRes.value.data || [];
          setPrescriptions(Array.isArray(d) ? d : []);
        }
        if (revRes.status === 'fulfilled') {
          const rd = revRes.value.data;
          setReviews(rd.reviews || rd.results || rd || []);
          setReviewStats({ avg: rd.avg_rating || 0, count: rd.review_count || 0 });
        }
      } catch {
        setError('Error loading doctor');
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this doctor?')) {
      try { await doctorService.delete(id); navigate('/doctors'); } catch { setError('Error deleting doctor'); }
    }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  if (error) return <div className="container mt-4"><div className="alert alert-danger">{error}</div></div>;
  if (!doctor) return <div className="container mt-4"><div className="alert alert-warning">Doctor not found</div></div>;

  const specColor = SPEC_COLORS[doctor.specialization] || '#7f8c8d';
  const initials = `${(doctor.first_name || 'D')[0]}${(doctor.last_name || '')[0] || ''}`.toUpperCase();
  const completedAppts = appointments.filter(a => a.status === 'COMPLETED').length;
  const upcomingAppts = appointments.filter(a => new Date(a.appointment_date) >= new Date(new Date().toDateString()) && a.status !== 'CANCELLED').length;

  const tabs = [
    { id: 'about', label: 'About', icon: 'fa-user' },
    { id: 'appointments', label: `Appointments (${appointments.length})`, icon: 'fa-calendar-alt' },
    { id: 'prescriptions', label: `Prescriptions (${prescriptions.length})`, icon: 'fa-prescription' },
    { id: 'reviews', label: `Reviews (${reviewStats.count})`, icon: 'fa-star' },
  ];

  return (
    <div className="mb-5">
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${specColor}dd, ${specColor}99)`, padding: '2.5rem 0 4rem', color: '#fff' }}>
        <div className="container">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div style={{
              width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', fontWeight: 700, border: '3px solid rgba(255,255,255,0.4)', flexShrink: 0,
            }}>{initials}</div>
            <div style={{ flex: 1 }}>
              <h2 className="mb-1" style={{ fontWeight: 700 }}>Dr. {doctor.first_name} {doctor.last_name}</h2>
              <div className="d-flex flex-wrap align-items-center gap-2" style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                <span><i className="fas fa-stethoscope me-1"></i>{doctor.specialization_display || doctor.specialization}</span>
                <span className="mx-1">|</span>
                <span><i className="fas fa-graduation-cap me-1"></i>{doctor.qualification}</span>
                <span className="mx-1">|</span>
                <span><i className="fas fa-briefcase-medical me-1"></i>{doctor.experience_years} yrs experience</span>
              </div>
              <div className="d-flex align-items-center gap-2 mt-2">
                <Stars rating={reviewStats.avg} />
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{reviewStats.avg || '-'}</span>
                <span style={{ opacity: 0.8, fontSize: '0.85rem' }}>({reviewStats.count} reviews)</span>
              </div>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <Link to={`/appointments/add?doctor=${doctor.id}`} className="btn btn-light btn-sm" style={{ borderRadius: 8 }}>
                <i className="fas fa-calendar-plus me-1"></i>Book Appointment
              </Link>
              {canManage && (
                <>
                  <Link to={`/doctors/edit/${doctor.id}`} className="btn btn-outline-light btn-sm" style={{ borderRadius: 8 }}>
                    <i className="fas fa-edit me-1"></i>Edit
                  </Link>
                  <button onClick={handleDelete} className="btn btn-outline-light btn-sm" style={{ borderRadius: 8 }}>
                    <i className="fas fa-trash me-1"></i>Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container" style={{ marginTop: '-2.5rem', position: 'relative', zIndex: 2 }}>
        <div className="row g-3 mb-4">
          {[
            { label: 'Total Appointments', value: appointments.length, icon: 'fa-calendar-check', color: '#3498db' },
            { label: 'Completed', value: completedAppts, icon: 'fa-check-circle', color: '#27ae60' },
            { label: 'Upcoming', value: upcomingAppts, icon: 'fa-clock', color: '#e67e22' },
            { label: 'Prescriptions', value: prescriptions.length, icon: 'fa-prescription', color: '#8e44ad' },
            { label: 'Consultation Fee', value: `₹${parseFloat(doctor.consultation_fee).toLocaleString('en-IN')}`, icon: 'fa-rupee-sign', color: '#16a085' },
          ].map((s, i) => (
            <div className="col" key={i}>
              <div className="card shadow-sm text-center py-3" style={{ borderRadius: 12, border: 'none' }}>
                <div><i className={`fas ${s.icon}`} style={{ fontSize: '1.3rem', color: s.color }}></i></div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#2c3e50' }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#7f8c8d' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <ul className="nav nav-pills mb-4 gap-2">
          {tabs.map(tab => (
            <li className="nav-item" key={tab.id}>
              <button className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                style={{ borderRadius: 8, fontSize: '0.88rem' }}
                onClick={() => setActiveTab(tab.id)}>
                <i className={`fas ${tab.icon} me-1`}></i>{tab.label}
              </button>
            </li>
          ))}
        </ul>

        {/* TAB: About */}
        {activeTab === 'about' && (
          <div className="row g-4">
            <div className="col-lg-8">
              <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
                <div className="card-body">
                  <h5 style={{ fontWeight: 700, color: '#1a5276' }}><i className="fas fa-info-circle me-2"></i>About</h5>
                  <p className="text-muted">{doctor.bio || 'No bio available for this doctor.'}</p>
                  <hr />
                  <h6 style={{ fontWeight: 700, color: '#1a5276' }}>Professional Details</h6>
                  <div className="row g-3">
                    {[
                      { label: 'Specialization', value: doctor.specialization_display || doctor.specialization },
                      { label: 'Qualification', value: doctor.qualification },
                      { label: 'License Number', value: doctor.license_number },
                      { label: 'Experience', value: `${doctor.experience_years} years` },
                    ].map((item, i) => (
                      <div className="col-sm-6" key={i}>
                        <div style={{ fontSize: '0.75rem', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
                        <div style={{ fontWeight: 600, color: '#2c3e50' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }}>
                <div className="card-body">
                  <h6 style={{ fontWeight: 700, color: '#1a5276' }}><i className="fas fa-clock me-2"></i>Availability</h6>
                  <div className="mb-2">
                    <div style={{ fontSize: '0.78rem', color: '#7f8c8d' }}>DAYS</div>
                    <div style={{ fontWeight: 600 }}>{doctor.available_days}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#7f8c8d' }}>HOURS</div>
                    <div style={{ fontWeight: 600 }}>{fmtTime(doctor.available_hours_start)} - {fmtTime(doctor.available_hours_end)}</div>
                  </div>
                </div>
              </div>
              <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }}>
                <div className="card-body">
                  <h6 style={{ fontWeight: 700, color: '#1a5276' }}><i className="fas fa-address-card me-2"></i>Contact</h6>
                  <div className="mb-2"><i className="fas fa-envelope text-muted me-2"></i>{doctor.email}</div>
                  <div><i className="fas fa-phone text-muted me-2"></i>{doctor.phone_number}</div>
                </div>
              </div>
              <Link to={`/appointments/add?doctor=${doctor.id}`} className="btn btn-primary w-100" style={{ borderRadius: 10, padding: '0.7rem' }}>
                <i className="fas fa-calendar-plus me-2"></i>Book Appointment
              </Link>
            </div>
          </div>
        )}

        {/* TAB: Appointments */}
        {activeTab === 'appointments' && (
          <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
            <div className="card-body">
              {appointments.length === 0 ? (
                <div className="text-center py-4 text-muted"><i className="fas fa-calendar-times fa-2x mb-2 d-block"></i>No appointments found</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: '#7f8c8d' }}>
                      <tr><th>Date</th><th>Time</th><th>Patient</th><th>Reason</th><th>Status</th><th>Token</th></tr>
                    </thead>
                    <tbody>
                      {appointments.map(a => {
                        const statusMap = { SCHEDULED: 'primary', COMPLETED: 'success', CANCELLED: 'danger', NO_SHOW: 'warning' };
                        return (
                          <tr key={a.id}>
                            <td style={{ fontWeight: 600 }}>{fmt(a.appointment_date)}</td>
                            <td>{fmtTime(a.appointment_time)}</td>
                            <td>{a.patient_name || `Patient #${a.patient}`}</td>
                            <td><span className="text-muted" style={{ fontSize: '0.85rem' }}>{a.reason || '-'}</span></td>
                            <td><span className={`badge bg-${statusMap[a.status] || 'secondary'}`}>{a.status}</span></td>
                            <td>{a.token_number || '-'}</td>
                          </tr>
                        );
                      })}
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
            <div className="card-body">
              {prescriptions.length === 0 ? (
                <div className="text-center py-4 text-muted"><i className="fas fa-prescription fa-2x mb-2 d-block"></i>No prescriptions found</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: '#7f8c8d' }}>
                      <tr><th>ID</th><th>Date</th><th>Patient</th><th>Diagnosis</th><th>Follow-up</th></tr>
                    </thead>
                    <tbody>
                      {prescriptions.map(rx => (
                        <tr key={rx.id}>
                          <td><Link to={`/prescriptions/${rx.id}`} style={{ fontWeight: 600 }}>#{rx.id}</Link></td>
                          <td>{fmt(rx.created_at || rx.date)}</td>
                          <td>{rx.patient_name || `Patient #${rx.patient}`}</td>
                          <td style={{ fontSize: '0.88rem' }}>{rx.diagnosis || '-'}</td>
                          <td>{rx.follow_up_date ? fmt(rx.follow_up_date) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Reviews */}
        {activeTab === 'reviews' && (
          <div>
            {/* Summary */}
            <div className="card shadow-sm mb-4" style={{ borderRadius: 12, border: 'none' }}>
              <div className="card-body">
                <div className="row align-items-center text-center">
                  <div className="col-md-4">
                    <div style={{ fontSize: '3rem', fontWeight: 700, color: '#f39c12' }}>{reviewStats.avg || '-'}</div>
                    <Stars rating={reviewStats.avg} size="1.2rem" />
                    <div className="text-muted mt-1">{reviewStats.count} {reviewStats.count === 1 ? 'review' : 'reviews'}</div>
                  </div>
                  <div className="col-md-4">
                    {[5, 4, 3, 2, 1].map(star => {
                      const cnt = reviews.filter(r => Math.round(r.rating) === star).length;
                      const pct = reviewStats.count > 0 ? (cnt / reviewStats.count) * 100 : 0;
                      return (
                        <div className="d-flex align-items-center gap-2 mb-1" key={star}>
                          <span style={{ minWidth: 16 }}>{star}</span>
                          <i className="fas fa-star text-warning" style={{ fontSize: '0.8rem' }}></i>
                          <div className="progress flex-grow-1" style={{ height: 8 }}>
                            <div className="progress-bar bg-warning" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="text-muted" style={{ minWidth: 24, fontSize: '0.8rem' }}>{cnt}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="col-md-4">
                    <Link to={`/doctors/${doctor.id}/reviews`} className="btn btn-primary">
                      <i className="fas fa-pen me-2"></i>Write a Review
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Review List */}
            {reviews.length === 0 ? (
              <div className="text-center py-4 text-muted"><i className="fas fa-comment-slash fa-2x mb-2 d-block"></i>No reviews yet</div>
            ) : reviews.map(rev => (
              <div className="card shadow-sm mb-2" style={{ borderRadius: 10, border: 'none' }} key={rev.id}>
                <div className="card-body py-3">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="d-flex gap-2 align-items-center">
                      <i className="fas fa-user-circle fa-2x text-muted"></i>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {rev.is_anonymous ? 'Anonymous' : rev.patient_name || 'Patient'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#7f8c8d' }}>{fmt(rev.created_at)}</div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-1">
                      <Stars rating={rev.rating} size="0.85rem" />
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rev.rating}/5</span>
                    </div>
                  </div>
                  {rev.comment && <p className="mb-0 mt-2" style={{ fontSize: '0.9rem' }}>{rev.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back button */}
        <div className="mt-4">
          <Link to="/doctors" className="btn btn-outline-secondary" style={{ borderRadius: 8 }}>
            <i className="fas fa-arrow-left me-1"></i>Back to Doctors
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DoctorDetail;
