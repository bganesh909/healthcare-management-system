import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
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

const STATUS_TRANSITIONS = {
  ORDERED: 'SAMPLE_COLLECTED',
  SAMPLE_COLLECTED: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
};

const LabOrderDetail = () => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [showResultsForm, setShowResultsForm] = useState(false);
  const [results, setResults] = useState([]);
  const { id } = useParams();

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await labService.getOrder(id);
        const orderData = response.data;
        setOrder(orderData);
        // Initialize results state from test items
        const items = orderData.test_items || orderData.items || [];
        setResults(items.map(item => ({
          id: item.id,
          test_name: item.test_name || (item.test && item.test.name) || '',
          result_value: item.result_value || '',
          is_abnormal: item.is_abnormal || false,
        })));
        setLoading(false);
      } catch (err) {
        setError('Error fetching lab order details');
        setLoading(false);
        console.error(err);
      }
    };
    fetchOrder();
  }, [id]);

  const handleDownloadPdf = async () => {
    try {
      const response = await labService.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lab_order_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download PDF');
    }
  };

  const handleUpdateStatus = async () => {
    if (!order) return;
    const nextStatus = STATUS_TRANSITIONS[order.status];
    if (!nextStatus) return;

    if (!window.confirm(`Update status to "${nextStatus.replace(/_/g, ' ')}"?`)) return;

    setUpdating(true);
    try {
      await labService.updateOrderStatus(id, { status: nextStatus });
      const response = await labService.getOrder(id);
      setOrder(response.data);
      setUpdating(false);
    } catch (err) {
      setError('Error updating order status');
      setUpdating(false);
      console.error(err);
    }
  };

  const handleResultChange = (index, field, value) => {
    setResults(prev => prev.map((r, i) => {
      if (i !== index) return r;
      return { ...r, [field]: field === 'is_abnormal' ? value : value };
    }));
  };

  const handleSubmitResults = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const resultData = results.map(r => ({
        id: r.id,
        result_value: r.result_value,
        is_abnormal: r.is_abnormal,
      }));
      await labService.addResults(id, { results: resultData });
      const response = await labService.getOrder(id);
      setOrder(response.data);
      setShowResultsForm(false);
      setUpdating(false);
    } catch (err) {
      setError('Error saving results');
      setUpdating(false);
      console.error(err);
    }
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;
  if (error && !order) return <div className="alert alert-danger">{error}</div>;
  if (!order) return <div className="alert alert-warning">Lab order not found</div>;

  const testItems = order.test_items || order.items || [];
  const nextStatus = STATUS_TRANSITIONS[order.status];

  return (
    <div className="container mt-4">
      {error && <div className="alert alert-danger alert-dismissible">
        {error}
        <button type="button" className="btn-close" onClick={() => setError(null)}></button>
      </div>}

      {/* Order Info */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h3 className="mb-0">Lab Order #{order.order_number || order.id}</h3>
          <div>
            <button className="btn btn-danger me-2" onClick={handleDownloadPdf}>
              <i className="fas fa-file-pdf me-2"></i>Download PDF
            </button>
            {nextStatus && (
              <button
                className="btn btn-light me-2"
                onClick={handleUpdateStatus}
                disabled={updating}
              >
                {updating ? 'Updating...' : `Update to ${nextStatus.replace(/_/g, ' ')}`}
              </button>
            )}
            {(order.status === 'IN_PROGRESS' || order.status === 'SAMPLE_COLLECTED') && (
              <button
                className="btn btn-warning"
                onClick={() => setShowResultsForm(!showResultsForm)}
              >
                {showResultsForm ? 'Cancel Results' : 'Add Results'}
              </button>
            )}
          </div>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <p><strong>Patient:</strong> {order.patient_name || (order.patient ? `${order.patient.first_name} ${order.patient.last_name}` : 'N/A')}</p>
              <p><strong>Doctor:</strong> {order.doctor_name || (order.doctor ? `Dr. ${order.doctor.first_name} ${order.doctor.last_name}` : 'N/A')}</p>
              <p><strong>Date:</strong> {order.created_at ? new Date(order.created_at).toLocaleString() : order.order_date || 'N/A'}</p>
            </div>
            <div className="col-md-6">
              <p>
                <strong>Status:</strong>{' '}
                <span className={`badge ${STATUS_BADGES[order.status] || 'bg-secondary'}`}>
                  {order.status_display || order.status?.replace(/_/g, ' ')}
                </span>
              </p>
              <p>
                <strong>Priority:</strong>{' '}
                <span className={`badge ${PRIORITY_BADGES[order.priority] || 'bg-secondary'}`}>
                  {order.priority_display || order.priority}
                </span>
              </p>
              <p><strong>Total:</strong> ₹{parseFloat(order.total_amount || 0).toFixed(2)}</p>
            </div>
          </div>
          {order.clinical_notes && (
            <div className="mt-3">
              <strong>Clinical Notes:</strong>
              <p className="mt-1">{order.clinical_notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Test Items Table */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Test Items</h5>
        </div>
        <div className="card-body">
          {testItems.length === 0 ? (
            <div className="alert alert-info mb-0">No test items found</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-primary">
                  <tr>
                    <th>Test Name</th>
                    <th>Code</th>
                    <th>Status</th>
                    <th>Result</th>
                    <th>Unit</th>
                    <th>Normal Range</th>
                    <th>Abnormal</th>
                  </tr>
                </thead>
                <tbody>
                  {testItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.test_name || (item.test && item.test.name) || 'N/A'}</td>
                      <td>{item.test_code || (item.test && item.test.code) || 'N/A'}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGES[item.status] || 'bg-secondary'}`}>
                          {item.status_display || item.status || 'N/A'}
                        </span>
                      </td>
                      <td>{item.result_value || '--'}</td>
                      <td>{item.unit || (item.test && item.test.unit) || 'N/A'}</td>
                      <td>{item.normal_range || (item.test && item.test.normal_range) || 'N/A'}</td>
                      <td>
                        {item.result_value ? (
                          item.is_abnormal ? (
                            <span className="badge bg-danger">Abnormal</span>
                          ) : (
                            <span className="badge bg-success">Normal</span>
                          )
                        ) : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Results Form */}
      {showResultsForm && (
        <div className="card mb-4">
          <div className="card-header bg-warning">
            <h5 className="mb-0">Add Results</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmitResults}>
              {results.map((result, index) => (
                <div key={result.id} className="row mb-3 align-items-center border-bottom pb-3">
                  <div className="col-md-3">
                    <label className="form-label fw-bold">{result.test_name}</label>
                  </div>
                  <div className="col-md-5">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter result value"
                      value={result.result_value}
                      onChange={(e) => handleResultChange(index, 'result_value', e.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`abnormal-${result.id}`}
                        checked={result.is_abnormal}
                        onChange={(e) => handleResultChange(index, 'is_abnormal', e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor={`abnormal-${result.id}`}>
                        Abnormal
                      </label>
                    </div>
                  </div>
                </div>
              ))}
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={updating}>
                  {updating ? 'Saving...' : 'Save Results'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowResultsForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Section */}
      {order.report && (
        <div className="card mb-4">
          <div className="card-header bg-success text-white">
            <h5 className="mb-0">Lab Report</h5>
          </div>
          <div className="card-body">
            <p><strong>Report Date:</strong> {order.report.created_at ? new Date(order.report.created_at).toLocaleString() : 'N/A'}</p>
            <p><strong>Prepared By:</strong> {order.report.prepared_by || 'N/A'}</p>
            {order.report.notes && <p><strong>Notes:</strong> {order.report.notes}</p>}
            {order.report.file && (
              <a href={order.report.file} className="btn btn-outline-success" target="_blank" rel="noopener noreferrer">
                <i className="fas fa-download me-2"></i>Download Report
              </a>
            )}
          </div>
        </div>
      )}

      <div className="mt-3">
        <Link to="/lab/orders" className="btn btn-secondary">Back to Lab Orders</Link>
      </div>
    </div>
  );
};

export default LabOrderDetail;
