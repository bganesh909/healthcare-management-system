import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { operationTheaterService } from '../../services/api';

const SurgeryList = () => {
  const [surgeries, setSurgeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });

  const fetchSurgeries = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (status) params.status = status;
      if (date) params.scheduled_date = date;
      const response = await operationTheaterService.getSurgeries(params);
      setSurgeries(response.data);
      setPagination({ next: response.next, previous: response.previous, count: response.count });
      setLoading(false);
    } catch (err) {
      setError('Error fetching surgeries');
      setLoading(false);
    }
  }, [page, status, date]);

  useEffect(() => {
    fetchSurgeries();
  }, [fetchSurgeries]);

  const getStatusBadgeClass = (s) => {
    switch (s) {
      case 'SCHEDULED': return 'bg-primary';
      case 'IN_PROGRESS': return 'bg-info';
      case 'COMPLETED': return 'bg-success';
      case 'CANCELLED': return 'bg-danger';
      case 'POSTPONED': return 'bg-warning text-dark';
      default: return 'bg-secondary';
    }
  };

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'ELECTIVE': return 'bg-info';
      case 'EMERGENCY': return 'bg-danger';
      case 'DAY_CASE': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  const clearFilters = () => {
    setStatus('');
    setDate('');
    setPage(1);
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-procedures me-2"></i>Surgeries</h2>
        <Link to="/ot/surgeries/add" className="btn btn-primary">
          <i className="fas fa-plus me-1"></i> Schedule Surgery
        </Link>
      </div>

      {/* Filters */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <select
                className="form-select"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="POSTPONED">Postponed</option>
              </select>
            </div>
            <div className="col-md-4">
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => { setDate(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-4">
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
      ) : surgeries.length === 0 ? (
        <div className="alert alert-info">No surgeries found</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="table-dark">
                <tr>
                  <th>Surgery #</th>
                  <th>Patient</th>
                  <th>Surgeon</th>
                  <th>Procedure</th>
                  <th>Scheduled Date</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>OT</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {surgeries.map((surgery) => (
                  <tr key={surgery.id}>
                    <td>{surgery.surgery_number || surgery.id}</td>
                    <td>{surgery.patient_name || `${surgery.patient?.first_name || ''} ${surgery.patient?.last_name || ''}`}</td>
                    <td>Dr. {surgery.surgeon_name || `${surgery.surgeon?.first_name || ''} ${surgery.surgeon?.last_name || ''}`}</td>
                    <td>{surgery.procedure_name || surgery.procedure || '-'}</td>
                    <td>{surgery.scheduled_date ? new Date(surgery.scheduled_date).toLocaleDateString() : '-'}</td>
                    <td>
                      <span className={`badge ${getTypeBadgeClass(surgery.surgery_type)}`}>
                        {surgery.surgery_type_display || surgery.surgery_type || '-'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(surgery.status)}`}>
                        {surgery.status_display || surgery.status}
                      </span>
                    </td>
                    <td>{surgery.operation_theater_name || surgery.operation_theater?.name || '-'}</td>
                    <td>
                      <Link to={`/ot/surgeries/${surgery.id}`} className="btn btn-sm btn-info">
                        <i className="fas fa-eye"></i> View
                      </Link>
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

export default SurgeryList;
