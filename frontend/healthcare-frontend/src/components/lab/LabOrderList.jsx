import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { labService } from '../../services/api';

const STATUS_BADGES = {
  ORDERED: 'bg-info',
  SAMPLE_COLLECTED: 'bg-primary',
  IN_PROGRESS: 'bg-warning',
  COMPLETED: 'bg-success',
  CANCELLED: 'bg-danger',
};

const PRIORITY_BADGES = {
  ROUTINE: 'bg-secondary',
  URGENT: 'bg-warning',
  STAT: 'bg-danger',
};

const LabOrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      if (status) params.status = status;
      if (priority) params.priority = priority;
      const response = await labService.getOrders(params);
      setOrders(response.data);
      setPagination({ next: response.next, previous: response.previous, count: response.count });
      setLoading(false);
    } catch (err) {
      setError('Error fetching lab orders');
      setLoading(false);
    }
  }, [page, search, status, priority]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setPage(1);
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Lab Orders</h2>
        <Link to="/lab/add" className="btn btn-primary">
          New Lab Order
        </Link>
      </div>

      {/* Filters */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text"><i className="fas fa-search"></i></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by patient name..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="ORDERED">Ordered</option>
                <option value="SAMPLE_COLLECTED">Sample Collected</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={priority}
                onChange={(e) => { setPriority(e.target.value); setPage(1); }}
              >
                <option value="">All Priorities</option>
                <option value="ROUTINE">Routine</option>
                <option value="URGENT">Urgent</option>
                <option value="STAT">STAT</option>
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-outline-secondary w-100" onClick={clearFilters}>
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center mt-5"><div className="spinner-border"></div></div>
      ) : orders.length === 0 ? (
        <div className="alert alert-info">No lab orders found</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="table-primary">
                <tr>
                  <th>Order #</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.order_number || order.id}</td>
                    <td>{order.patient_name || (order.patient ? `${order.patient.first_name} ${order.patient.last_name}` : 'N/A')}</td>
                    <td>{order.doctor_name || (order.doctor ? `Dr. ${order.doctor.first_name} ${order.doctor.last_name}` : 'N/A')}</td>
                    <td>{order.created_at ? new Date(order.created_at).toLocaleDateString() : order.order_date || 'N/A'}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGES[order.status] || 'bg-secondary'}`}>
                        {order.status_display || order.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${PRIORITY_BADGES[order.priority] || 'bg-secondary'}`}>
                        {order.priority_display || order.priority}
                      </span>
                    </td>
                    <td>₹{parseFloat(order.total_amount || 0).toFixed(2)}</td>
                    <td>
                      <Link to={`/lab/${order.id}`} className="btn btn-sm btn-info me-1">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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

export default LabOrderList;
