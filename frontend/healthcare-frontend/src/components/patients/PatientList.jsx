import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { patientService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const GENDER_ICON = { M: 'fa-mars', F: 'fa-venus', O: 'fa-genderless' };
const GENDER_COLOR = { M: '#3498db', F: '#e91e63', O: '#7f8c8d' };
const BLOOD_COLOR = { 'A+': '#e74c3c', 'A-': '#c0392b', 'B+': '#2980b9', 'B-': '#2471a3', 'AB+': '#8e44ad', 'AB-': '#7d3c98', 'O+': '#27ae60', 'O-': '#1e8449' };

const PatientList = () => {
  const { isAdmin, isStaff, isDoctor } = useAuth();
  const canManage = isAdmin || isStaff || isDoctor;

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ gender: '', blood_group: '' });

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, search: searchQuery, ...filters };
      // Remove empty params
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const response = await patientService.getAll(params);
      setPatients(response.data);
      setPagination({ count: response.count, next: response.next, previous: response.previous });
    } catch {
      setError('Error fetching patients');
    }
    setLoading(false);
  }, [currentPage, searchQuery, filters]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setCurrentPage(1);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this patient?')) {
      try { await patientService.delete(id); fetchPatients(); } catch { setError('Error deleting patient'); }
    }
  };

  const totalPages = Math.ceil(pagination.count / 10);

  return (
    <div className="container mt-4 mb-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1" style={{ fontWeight: 700, color: '#1a5276' }}>
            <i className="fas fa-user-injured me-2"></i>Patients
          </h2>
          <p className="text-muted mb-0">{pagination.count} registered patients</p>
        </div>
        {canManage && (
          <Link to="/patients/add" className="btn btn-primary" style={{ borderRadius: 8 }}>
            <i className="fas fa-plus me-1"></i> Add Patient
          </Link>
        )}
      </div>

      {/* Search & Filters */}
      <div className="card shadow-sm mb-4" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-body py-3">
          <form onSubmit={handleSearch}>
            <div className="row g-3">
              <div className="col-md-5">
                <div className="input-group">
                  <span className="input-group-text bg-white"><i className="fas fa-search text-muted"></i></span>
                  <input type="text" className="form-control border-start-0" placeholder="Search by name, email, phone..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  <button className="btn btn-primary" type="submit">Search</button>
                </div>
              </div>
              <div className="col-md-3">
                <select className="form-select" name="gender" value={filters.gender} onChange={handleFilterChange}>
                  <option value="">All Genders</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
              <div className="col-md-3">
                <select className="form-select" name="blood_group" value={filters.blood_group} onChange={handleFilterChange}>
                  <option value="">All Blood Groups</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div className="col-md-1">
                <button type="button" className="btn btn-outline-secondary w-100" title="Clear filters"
                  onClick={() => { setSearchQuery(''); setFilters({ gender: '', blood_group: '' }); setCurrentPage(1); }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading && patients.length === 0 ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : patients.length === 0 ? (
        <div className="text-center py-5">
          <i className="fas fa-users-slash fa-3x text-muted mb-3 d-block"></i>
          <h5 className="text-muted">No patients found</h5>
          <p className="text-muted">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
            {patients.map((p) => {
              const initials = `${(p.first_name || 'P')[0]}${(p.last_name || '')[0] || ''}`.toUpperCase();
              const gColor = GENDER_COLOR[p.gender] || '#7f8c8d';
              const bColor = BLOOD_COLOR[p.blood_group] || '#95a5a6';
              return (
                <div key={p.id} className="col">
                  <div className="card shadow-sm h-100" style={{ borderRadius: 12, border: 'none', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                    <div style={{ height: 4, background: gColor }}></div>
                    <div className="card-body p-3">
                      <div className="d-flex align-items-center gap-3 mb-3">
                        {/* Avatar */}
                        <div style={{
                          width: 52, height: 52, borderRadius: '50%', background: `${gColor}15`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.1rem', fontWeight: 700, color: gColor, flexShrink: 0,
                          border: `2px solid ${gColor}30`,
                        }}>{initials}</div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h6 className="mb-0" style={{ fontWeight: 700, color: '#2c3e50' }}>
                            {p.first_name} {p.last_name}
                          </h6>
                          <div className="d-flex align-items-center gap-2 mt-1" style={{ fontSize: '0.8rem' }}>
                            <span style={{ color: gColor }}>
                              <i className={`fas ${GENDER_ICON[p.gender] || 'fa-user'} me-1`}></i>
                              {p.gender_display || (p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other')}
                            </span>
                            {p.age != null && <span className="text-muted">&bull; {p.age} yrs</span>}
                            {p.blood_group && (
                              <span className="px-2 py-0" style={{ background: `${bColor}15`, color: bColor, borderRadius: 4, fontWeight: 700, fontSize: '0.78rem' }}>
                                <i className="fas fa-tint me-1"></i>{p.blood_group}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="mb-3" style={{ fontSize: '0.82rem', color: '#555' }}>
                        <div className="mb-1"><i className="fas fa-phone text-muted me-2" style={{ width: 14 }}></i>{p.phone_number}</div>
                        <div className="mb-1 text-truncate"><i className="fas fa-envelope text-muted me-2" style={{ width: 14 }}></i>{p.email}</div>
                        {p.address && <div className="text-truncate"><i className="fas fa-map-marker-alt text-muted me-2" style={{ width: 14 }}></i>{p.address}</div>}
                      </div>

                      {/* Actions */}
                      <div className="d-flex gap-2">
                        <Link to={`/patients/${p.id}`} className="btn btn-outline-primary btn-sm flex-fill" style={{ borderRadius: 8 }}>
                          <i className="fas fa-eye me-1"></i>View
                        </Link>
                        <Link to={`/appointments/add?patient=${p.id}`} className="btn btn-primary btn-sm flex-fill" style={{ borderRadius: 8 }}>
                          <i className="fas fa-calendar-plus me-1"></i>Book
                        </Link>
                      </div>
                      {canManage && (
                        <div className="d-flex gap-2 mt-2">
                          <Link to={`/patients/edit/${p.id}`} className="btn btn-outline-warning btn-sm flex-fill" style={{ borderRadius: 8, fontSize: '0.78rem' }}>
                            <i className="fas fa-edit me-1"></i>Edit
                          </Link>
                          <button onClick={() => handleDelete(p.id)} className="btn btn-outline-danger btn-sm flex-fill" style={{ borderRadius: 8, fontSize: '0.78rem' }}>
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
          {totalPages > 1 && (
            <nav className="mt-4">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${!pagination.previous ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(p => p - 1)}>
                    <i className="fas fa-chevron-left me-1"></i>Previous
                  </button>
                </li>
                <li className="page-item disabled">
                  <span className="page-link">Page {currentPage} of {totalPages}</span>
                </li>
                <li className={`page-item ${!pagination.next ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(p => p + 1)}>
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

export default PatientList;
