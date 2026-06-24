import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { prescriptionService, authService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const PrescriptionList = () => {
  const { user, isAdmin, isDoctor, isStaff, isPatient } = useAuth();
  const canCreate = isAdmin || isDoctor;
  const canDelete = isAdmin || isDoctor;
  const canFilter = isAdmin || isDoctor || isStaff;

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      // Patient: only show their own prescriptions
      if (isPatient) {
        let patientId = user?.patient_profile;
        if (!patientId) {
          try {
            const profileRes = await authService.getProfile();
            patientId = profileRes.data?.patient_profile;
          } catch { /* empty */ }
        }
        if (patientId) {
          const resp = await prescriptionService.getByPatient(patientId);
          const data = resp.data?.results || resp.data || [];
          setPrescriptions(Array.isArray(data) ? data : []);
          setPagination({ next: null, previous: null, count: Array.isArray(data) ? data.length : 0 });
        } else {
          setPrescriptions([]);
        }
      } else {
        // Admin/Doctor/Staff: show all with filters
        const params = { page };
        if (search) params.search = search;
        const response = await prescriptionService.getAll(params);
        setPrescriptions(response.data);
        setPagination({ next: response.next, previous: response.previous, count: response.count });
      }
    } catch {
      setError('Error fetching prescriptions');
    }
    setLoading(false);
  }, [page, search, isPatient, user]);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this prescription?')) {
      try {
        await prescriptionService.delete(id);
        setPrescriptions(prescriptions.filter(p => p.id !== id));
      } catch { setError('Error deleting prescription'); }
    }
  };

  // Extract names from nested objects or flat fields
  const getPatientName = (rx) => {
    if (rx.patient_name) return rx.patient_name;
    if (typeof rx.patient === 'object' && rx.patient) return rx.patient.name || `${rx.patient.first_name || ''} ${rx.patient.last_name || ''}`.trim();
    return `Patient #${rx.patient}`;
  };

  const getDoctorName = (rx) => {
    if (rx.doctor_name) return rx.doctor_name;
    if (typeof rx.doctor === 'object' && rx.doctor) return rx.doctor.name || `Dr. ${rx.doctor.first_name || ''} ${rx.doctor.last_name || ''}`.trim();
    return `Doctor #${rx.doctor}`;
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  return (
    <div className="container mt-4 mb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1" style={{ fontWeight: 700, color: '#1a5276' }}>
            <i className="fas fa-prescription me-2"></i>{isPatient ? 'My Prescriptions' : 'Prescriptions'}
          </h2>
          <p className="text-muted mb-0">{pagination.count} {isPatient ? 'prescription(s)' : 'total prescriptions'}</p>
        </div>
        {canCreate && (
          <Link to="/prescriptions/add" className="btn btn-primary" style={{ borderRadius: 8 }}>
            <i className="fas fa-plus me-1"></i> New Prescription
          </Link>
        )}
      </div>

      {/* Search - only for admin/doctor/staff */}
      {canFilter && (
        <div className="card shadow-sm mb-4" style={{ borderRadius: 12, border: 'none' }}>
          <div className="card-body py-3">
            <div className="row g-3">
              <div className="col-md-9">
                <div className="input-group">
                  <span className="input-group-text bg-white"><i className="fas fa-search text-muted"></i></span>
                  <input type="text" className="form-control border-start-0" placeholder="Search by diagnosis, medicine..."
                    value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                </div>
              </div>
              <div className="col-md-3">
                <button className="btn btn-outline-secondary w-100" onClick={() => { setSearch(''); setPage(1); }} style={{ borderRadius: 8 }}>
                  <i className="fas fa-times me-1"></i>Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : prescriptions.length === 0 ? (
        <div className="text-center py-5">
          <i className="fas fa-prescription fa-3x text-muted mb-3 d-block"></i>
          <h5 className="text-muted">{isPatient ? 'No prescriptions yet' : 'No prescriptions found'}</h5>
        </div>
      ) : (
        <>
          <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none', overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#7f8c8d', background: '#fafbfc' }}>
                  <tr>
                    <th style={{ paddingLeft: '1rem' }}>ID</th>
                    {!isPatient && <th>Patient</th>}
                    <th>Doctor</th>
                    <th>Diagnosis</th>
                    <th>Date</th>
                    <th>Follow-up</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map((rx) => (
                    <tr key={rx.id}>
                      <td style={{ paddingLeft: '1rem', fontWeight: 600 }}>#{rx.id}</td>
                      {!isPatient && <td>{getPatientName(rx)}</td>}
                      <td>{getDoctorName(rx)}</td>
                      <td>
                        <span style={{ fontSize: '0.88rem' }}>
                          {(rx.diagnosis || '-').length > 40 ? rx.diagnosis.slice(0, 40) + '...' : (rx.diagnosis || '-')}
                        </span>
                      </td>
                      <td>{fmt(rx.created_at || rx.date_prescribed)}</td>
                      <td>{rx.follow_up_date ? fmt(rx.follow_up_date) : '-'}</td>
                      <td className="text-center">
                        <div className="d-flex gap-1 justify-content-center">
                          <Link to={`/prescriptions/${rx.id}`} className="btn btn-sm btn-outline-primary" style={{ borderRadius: 6 }}>
                            <i className="fas fa-eye me-1"></i>View
                          </Link>
                          {canDelete && (
                            <button onClick={() => handleDelete(rx.id)} className="btn btn-sm btn-outline-danger" style={{ borderRadius: 6 }}>
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {(pagination.previous || pagination.next) && (
            <nav className="mt-4">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${!pagination.previous ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => p - 1)}>Previous</button>
                </li>
                <li className="page-item disabled">
                  <span className="page-link">Page {page}</span>
                </li>
                <li className={`page-item ${!pagination.next ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => p + 1)}>Next</button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  );
};

export default PrescriptionList;
