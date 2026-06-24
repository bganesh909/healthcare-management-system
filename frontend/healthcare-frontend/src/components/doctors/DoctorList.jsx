import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { doctorService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SPECIALIZATIONS = [
  { value: '', label: 'All Specializations' },
  { value: 'CARDIOLOGY', label: 'Cardiology' },
  { value: 'DERMATOLOGY', label: 'Dermatology' },
  { value: 'ENDOCRINOLOGY', label: 'Endocrinology' },
  { value: 'GASTROENTEROLOGY', label: 'Gastroenterology' },
  { value: 'NEUROLOGY', label: 'Neurology' },
  { value: 'ONCOLOGY', label: 'Oncology' },
  { value: 'PEDIATRICS', label: 'Pediatrics' },
  { value: 'PSYCHIATRY', label: 'Psychiatry' },
  { value: 'ORTHOPEDICS', label: 'Orthopedics' },
  { value: 'GYNECOLOGY', label: 'Gynecology' },
  { value: 'GENERAL', label: 'General Medicine' },
  { value: 'OTHER', label: 'Other' },
];

const SPEC_ICONS = {
  CARDIOLOGY: 'fa-heartbeat', DERMATOLOGY: 'fa-hand-sparkles', ENDOCRINOLOGY: 'fa-vial',
  GASTROENTEROLOGY: 'fa-stomach', NEUROLOGY: 'fa-brain', ONCOLOGY: 'fa-ribbon',
  PEDIATRICS: 'fa-baby', PSYCHIATRY: 'fa-head-side-medical', ORTHOPEDICS: 'fa-bone',
  GYNECOLOGY: 'fa-female', GENERAL: 'fa-stethoscope', OTHER: 'fa-user-md',
};

const SPEC_COLORS = {
  CARDIOLOGY: '#e74c3c', DERMATOLOGY: '#e67e22', ENDOCRINOLOGY: '#9b59b6',
  GASTROENTEROLOGY: '#2ecc71', NEUROLOGY: '#3498db', ONCOLOGY: '#1abc9c',
  PEDIATRICS: '#f39c12', PSYCHIATRY: '#8e44ad', ORTHOPEDICS: '#2c3e50',
  GYNECOLOGY: '#e91e63', GENERAL: '#16a085', OTHER: '#7f8c8d',
};

const Stars = ({ rating, count }) => {
  if (!rating) return <span className="text-muted" style={{ fontSize: '0.8rem' }}>No reviews yet</span>;
  return (
    <span className="d-inline-flex align-items-center gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <i key={s} className={`${rating >= s ? 'fas' : rating >= s - 0.5 ? 'fas fa-star-half-alt' : 'far'} fa-star`}
          style={{ color: rating >= s - 0.5 ? '#f39c12' : '#dee2e6', fontSize: '0.85rem' }}></i>
      ))}
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2c3e50' }}>{rating}</span>
      {count > 0 && <span style={{ fontSize: '0.78rem', color: '#7f8c8d' }}>({count})</span>}
    </span>
  );
};

const DoctorList = () => {
  const { isAdmin, isStaff } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });

  const canManage = isAdmin || isStaff;

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      if (specialization) params.specialization = specialization;
      const response = await doctorService.getAll(params);
      setDoctors(response.data);
      setPagination({ next: response.next, previous: response.previous, count: response.count });
    } catch {
      setError('Error fetching doctors');
    }
    setLoading(false);
  }, [page, search, specialization]);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this doctor?')) {
      try {
        await doctorService.delete(id);
        setDoctors(doctors.filter(d => d.id !== id));
      } catch {
        setError('Error deleting doctor');
      }
    }
  };

  return (
    <div className="container mt-4 mb-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1" style={{ fontWeight: 700, color: '#1a5276' }}>
            <i className="fas fa-user-md me-2"></i>Our Doctors
          </h2>
          <p className="text-muted mb-0">{pagination.count} specialists across {SPECIALIZATIONS.length - 1} departments</p>
        </div>
        {canManage && (
          <Link to="/doctors/add" className="btn btn-primary">
            <i className="fas fa-plus me-1"></i> Add Doctor
          </Link>
        )}
      </div>

      {/* Search & Filter */}
      <div className="card shadow-sm mb-4" style={{ borderRadius: 12 }}>
        <div className="card-body py-3">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-white"><i className="fas fa-search text-muted"></i></span>
                <input type="text" className="form-control border-start-0" placeholder="Search by name, email, specialization..."
                  value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              </div>
            </div>
            <div className="col-md-4">
              <select className="form-select" value={specialization} onChange={(e) => { setSpecialization(e.target.value); setPage(1); }}>
                {SPECIALIZATIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-outline-secondary w-100" onClick={() => { setSearch(''); setSpecialization(''); setPage(1); }}>
                <i className="fas fa-times me-1"></i>Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-5">
          <i className="fas fa-user-md-slash fa-3x text-muted mb-3 d-block"></i>
          <h5 className="text-muted">No doctors found</h5>
          <p className="text-muted">Try adjusting your search or filter</p>
        </div>
      ) : (
        <>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            {doctors.map((doc) => {
              const specColor = SPEC_COLORS[doc.specialization] || '#7f8c8d';
              const specIcon = SPEC_ICONS[doc.specialization] || 'fa-user-md';
              const initials = `${(doc.first_name || 'D')[0]}${(doc.last_name || '')[0] || ''}`.toUpperCase();
              return (
                <div key={doc.id} className="col">
                  <div className="card h-100 shadow-sm" style={{ borderRadius: 12, overflow: 'hidden', border: 'none', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                    {/* Color strip */}
                    <div style={{ height: 4, background: specColor }}></div>
                    <div className="card-body p-3">
                      <div className="d-flex align-items-start gap-3 mb-3">
                        {/* Avatar */}
                        <div style={{
                          width: 56, height: 56, borderRadius: '50%', background: `${specColor}18`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.2rem', fontWeight: 700, color: specColor, flexShrink: 0,
                          border: `2px solid ${specColor}30`
                        }}>
                          {initials}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h6 className="mb-0" style={{ fontWeight: 700, color: '#2c3e50', fontSize: '1rem' }}>
                            Dr. {doc.first_name} {doc.last_name}
                          </h6>
                          <div className="d-flex align-items-center gap-1 mt-1">
                            <i className={`fas ${specIcon}`} style={{ color: specColor, fontSize: '0.75rem' }}></i>
                            <span style={{ fontSize: '0.82rem', color: specColor, fontWeight: 600 }}>
                              {doc.specialization_display}
                            </span>
                          </div>
                          <div className="mt-1">
                            <Stars rating={doc.avg_rating} count={doc.review_count} />
                          </div>
                        </div>
                      </div>

                      {/* Info rows */}
                      <div className="d-flex flex-wrap gap-3 mb-3" style={{ fontSize: '0.82rem', color: '#555' }}>
                        <span><i className="fas fa-briefcase-medical me-1 text-muted"></i>{doc.experience_years} yrs exp</span>
                        <span><i className="fas fa-graduation-cap me-1 text-muted"></i>{doc.qualification}</span>
                      </div>
                      <div className="d-flex flex-wrap gap-3 mb-3" style={{ fontSize: '0.82rem', color: '#555' }}>
                        <span><i className="fas fa-calendar-week me-1 text-muted"></i>{doc.available_days}</span>
                        <span><i className="fas fa-clock me-1 text-muted"></i>{doc.available_hours_start?.slice(0, 5)} - {doc.available_hours_end?.slice(0, 5)}</span>
                      </div>

                      {/* Fee */}
                      <div className="d-flex align-items-center justify-content-between px-2 py-2 mb-3"
                        style={{ background: '#f8f9fa', borderRadius: 8 }}>
                        <span style={{ fontSize: '0.82rem', color: '#7f8c8d' }}>Consultation Fee</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a5276' }}>
                          &#8377;{parseFloat(doc.consultation_fee).toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="d-flex gap-2">
                        <Link to={`/doctors/${doc.id}`} className="btn btn-outline-primary btn-sm flex-fill" style={{ borderRadius: 8 }}>
                          <i className="fas fa-eye me-1"></i>View Profile
                        </Link>
                        <Link to={`/appointments/add?doctor=${doc.id}`} className="btn btn-primary btn-sm flex-fill" style={{ borderRadius: 8 }}>
                          <i className="fas fa-calendar-plus me-1"></i>Book
                        </Link>
                      </div>
                      {canManage && (
                        <div className="d-flex gap-2 mt-2">
                          <Link to={`/doctors/edit/${doc.id}`} className="btn btn-outline-warning btn-sm flex-fill" style={{ borderRadius: 8, fontSize: '0.78rem' }}>
                            <i className="fas fa-edit me-1"></i>Edit
                          </Link>
                          <button onClick={() => handleDelete(doc.id)} className="btn btn-outline-danger btn-sm flex-fill" style={{ borderRadius: 8, fontSize: '0.78rem' }}>
                            <i className="fas fa-trash me-1"></i>Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {(pagination.previous || pagination.next) && (
            <nav className="mt-4">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${!pagination.previous ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => p - 1)}>
                    <i className="fas fa-chevron-left me-1"></i>Previous
                  </button>
                </li>
                <li className="page-item disabled">
                  <span className="page-link">Page {page} of {Math.ceil(pagination.count / 10)}</span>
                </li>
                <li className={`page-item ${!pagination.next ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => p + 1)}>
                    Next<i className="fas fa-chevron-right ms-1"></i>
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  );
};

export default DoctorList;
