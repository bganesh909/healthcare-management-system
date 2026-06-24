import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { dischargeService } from '../../services/api';

const DischargeSummaryList = () => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });

  const fetchSummaries = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      if (status) params.status = status;
      const response = await dischargeService.getSummaries(params);
      setSummaries(response.data);
      setPagination({ next: response.next, previous: response.previous, count: response.count });
      setLoading(false);
    } catch (err) {
      setError('Error fetching discharge summaries');
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const getStatusBadgeClass = (s) => {
    switch (s) {
      case 'DRAFT': return 'bg-warning text-dark';
      case 'COMPLETED': return 'bg-info';
      case 'APPROVED': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  const getDischargeTypeBadge = (type) => {
    switch (type) {
      case 'NORMAL': return 'bg-success';
      case 'AGAINST_ADVICE': return 'bg-danger';
      case 'TRANSFER': return 'bg-info';
      case 'DEATH': return 'bg-dark';
      case 'ABSCONDED': return 'bg-warning text-dark';
      default: return 'bg-secondary';
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setPage(1);
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-file-medical-alt me-2"></i>Discharge Summaries</h2>
        <Link to="/discharge/add" className="btn btn-primary">
          <i className="fas fa-plus me-1"></i> New Discharge Summary
        </Link>
      </div>

      {/* Filters */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text"><i className="fas fa-search"></i></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by patient name, summary number..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="COMPLETED">Completed</option>
                <option value="APPROVED">Approved</option>
              </select>
            </div>
            <div className="col-md-3">
              <button className="btn btn-outline-secondary w-100" onClick={clearFilters}>
                <i className="fas fa-times me-1"></i> Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center mt-5"><div className="spinner-border"></div></div>
      ) : summaries.length === 0 ? (
        <div className="alert alert-info">No discharge summaries found</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="table-dark">
                <tr>
                  <th>Summary #</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Admission Date</th>
                  <th>Discharge Date</th>
                  <th>Discharge Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((summary) => (
                  <tr key={summary.id}>
                    <td><code>{summary.summary_number || `DS-${summary.id}`}</code></td>
                    <td>{summary.patient_name || `${summary.patient?.first_name || ''} ${summary.patient?.last_name || ''}`}</td>
                    <td>Dr. {summary.doctor_name || `${summary.doctor?.first_name || ''} ${summary.doctor?.last_name || ''}`}</td>
                    <td>{summary.admission_date ? new Date(summary.admission_date).toLocaleDateString() : '-'}</td>
                    <td>{summary.discharge_date ? new Date(summary.discharge_date).toLocaleDateString() : '-'}</td>
                    <td>
                      <span className={`badge ${getDischargeTypeBadge(summary.discharge_type)}`}>
                        {summary.discharge_type_display || summary.discharge_type || '-'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(summary.status)}`}>
                        {summary.status_display || summary.status}
                      </span>
                    </td>
                    <td>
                      <Link to={`/discharge/${summary.id}`} className="btn btn-sm btn-info me-1">
                        <i className="fas fa-eye"></i> View
                      </Link>
                      {summary.status !== 'APPROVED' && (
                        <Link to={`/discharge/edit/${summary.id}`} className="btn btn-sm btn-warning">
                          <i className="fas fa-edit"></i>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(pagination.previous || pagination.next) && (
            <nav className="mt-3">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${!pagination.previous ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => p - 1)}>Previous</button>
                </li>
                <li className="page-item disabled">
                  <span className="page-link">Page {page} ({pagination.count} total)</span>
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

export default DischargeSummaryList;
