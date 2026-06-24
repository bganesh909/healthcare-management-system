import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { radiologyService } from '../../services/api';

const STATUS_BADGES = {
  ORDERED: 'bg-info',
  SCHEDULED: 'bg-primary',
  IN_PROGRESS: 'bg-warning text-dark',
  COMPLETED: 'bg-success',
  CANCELLED: 'bg-danger',
};

const PRIORITY_BADGES = {
  ROUTINE: 'bg-info',
  URGENT: 'bg-warning text-dark',
  STAT: 'bg-danger',
};

const ImagingOrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [imagingTypes, setImagingTypes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    patient: '',
    doctor: '',
    imaging_type: '',
    body_part: '',
    priority: 'ROUTINE',
    clinical_indication: '',
    notes: '',
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (filterType) params.imaging_type = filterType;
      const response = await radiologyService.getOrders(params);
      setOrders(response.data || []);
      setPagination({ next: response.next, previous: response.previous, count: response.count });
      setLoading(false);
    } catch (err) {
      setError('Error fetching imaging orders');
      setLoading(false);
    }
  }, [page, filterStatus, filterPriority, filterType]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const loadTypes = async () => {
      try {
        const res = await radiologyService.getImagingTypes({ page_size: 100 });
        setImagingTypes(res.data || []);
      } catch {
        // Non-critical
      }
    };
    loadTypes();
  }, []);

  const clearFilters = () => {
    setFilterStatus('');
    setFilterPriority('');
    setFilterType('');
    setPage(1);
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...formData };
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') delete payload[key];
      });
      await radiologyService.createOrder(payload);
      setShowForm(false);
      setFormData({
        patient: '', doctor: '', imaging_type: '', body_part: '',
        priority: 'ROUTINE', clinical_indication: '', notes: '',
      });
      fetchOrders();
      setSubmitting(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error creating imaging order');
      setSubmitting(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-x-ray me-2"></i>Imaging Orders</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <i className="fas fa-plus me-2"></i>New Order
        </button>
      </div>

      {/* Filters */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <select className="form-select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
                <option value="">All Statuses</option>
                <option value="ORDERED">Ordered</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}>
                <option value="">All Priorities</option>
                <option value="ROUTINE">Routine</option>
                <option value="URGENT">Urgent</option>
                <option value="STAT">STAT</option>
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
                <option value="">All Imaging Types</option>
                {imagingTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <button className="btn btn-outline-secondary w-100" onClick={clearFilters}>
                <i className="fas fa-times me-1"></i>Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {loading ? (
        <div className="text-center mt-5"><div className="spinner-border"></div></div>
      ) : orders.length === 0 ? (
        <div className="alert alert-info">No imaging orders found</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="table-primary">
                <tr>
                  <th>Order #</th>
                  <th>Patient</th>
                  <th>Imaging Type</th>
                  <th>Body Part</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td><strong>{order.order_number || order.id}</strong></td>
                    <td>{order.patient_name || (order.patient ? `${order.patient.first_name} ${order.patient.last_name}` : '--')}</td>
                    <td>
                      <i className="fas fa-x-ray me-1 text-muted"></i>
                      {order.imaging_type_name || (order.imaging_type && order.imaging_type.name) || '--'}
                    </td>
                    <td>{order.body_part || '--'}</td>
                    <td>
                      <span className={`badge ${PRIORITY_BADGES[order.priority] || 'bg-secondary'}`}>
                        {order.priority_display || order.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGES[order.status] || 'bg-secondary'}`}>
                        {order.status_display || order.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{order.created_at ? new Date(order.created_at).toLocaleDateString() : order.order_date || '--'}</td>
                    <td>
                      <Link to={`/radiology/orders/${order.id}`} className="btn btn-sm btn-info me-1" title="View Details">
                        <i className="fas fa-eye"></i>
                      </Link>
                      {order.status === 'COMPLETED' && order.report && (
                        <Link to={`/radiology/orders/${order.id}`} className="btn btn-sm btn-success" title="View Report">
                          <i className="fas fa-file-medical"></i>
                        </Link>
                      )}
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

      {/* New Order Modal */}
      {showForm && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="fas fa-plus-circle me-2"></i>New Imaging Order</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowForm(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Patient ID *</label>
                      <input type="number" className="form-control" name="patient" value={formData.patient} onChange={handleFormChange} required placeholder="Patient ID" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Doctor ID *</label>
                      <input type="number" className="form-control" name="doctor" value={formData.doctor} onChange={handleFormChange} required placeholder="Doctor ID" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Imaging Type *</label>
                      <select className="form-select" name="imaging_type" value={formData.imaging_type} onChange={handleFormChange} required>
                        <option value="">-- Select Type --</option>
                        {imagingTypes.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Body Part *</label>
                      <input type="text" className="form-control" name="body_part" value={formData.body_part} onChange={handleFormChange} required placeholder="e.g. Chest, Knee" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Priority</label>
                      <select className="form-select" name="priority" value={formData.priority} onChange={handleFormChange}>
                        <option value="ROUTINE">Routine</option>
                        <option value="URGENT">Urgent</option>
                        <option value="STAT">STAT</option>
                      </select>
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Clinical Indication</label>
                      <textarea className="form-control" name="clinical_indication" rows="3" value={formData.clinical_indication} onChange={handleFormChange} placeholder="Reason for imaging..."></textarea>
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Notes</label>
                      <textarea className="form-control" name="notes" rows="2" value={formData.notes} onChange={handleFormChange} placeholder="Additional notes..."></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</> : <><i className="fas fa-save me-2"></i>Create Order</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagingOrderList;
