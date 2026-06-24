import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
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

const SEVERITY_BADGES = {
  NORMAL: 'bg-success',
  MILD: 'bg-info',
  MODERATE: 'bg-warning text-dark',
  SEVERE: 'bg-danger',
  CRITICAL: 'bg-danger',
};

const STATUS_STEPS = ['ORDERED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];

const ImagingOrderDetail = () => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate(); // eslint-disable-line no-unused-vars

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await radiologyService.getOrder(id);
        setOrder(response.data);
        setLoading(false);
      } catch (err) {
        setError('Error fetching imaging order details');
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const handleUpdateStatus = async (newStatus) => {
    if (!window.confirm(`Update status to "${newStatus.replace(/_/g, ' ')}"?`)) return;
    setUpdating(true);
    try {
      await radiologyService.updateOrder(id, { status: newStatus });
      const response = await radiologyService.getOrder(id);
      setOrder(response.data);
      setUpdating(false);
    } catch (err) {
      setError('Error updating order status');
      setUpdating(false);
    }
  };

  const getNextStatus = (currentStatus) => {
    const idx = STATUS_STEPS.indexOf(currentStatus);
    if (idx >= 0 && idx < STATUS_STEPS.length - 1) return STATUS_STEPS[idx + 1];
    return null;
  };

  const getStepStatus = (step, currentStatus) => {
    const currentIdx = STATUS_STEPS.indexOf(currentStatus);
    const stepIdx = STATUS_STEPS.indexOf(step);
    if (currentStatus === 'CANCELLED') return 'cancelled';
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'active';
    return 'pending';
  };

  if (loading) return <div className="container mt-4"><div className="text-center mt-5"><div className="spinner-border"></div></div></div>;
  if (error && !order) return <div className="container mt-4"><div className="alert alert-danger">{error}</div></div>;
  if (!order) return <div className="container mt-4"><div className="alert alert-warning">Imaging order not found</div></div>;

  const nextStatus = getNextStatus(order.status);
  const report = order.report || order.imaging_report || null;

  return (
    <div className="container mt-4">
      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Header */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h3 className="mb-0">
            <i className="fas fa-x-ray me-2"></i>
            Imaging Order #{order.order_number || order.id}
          </h3>
          <div>
            {nextStatus && order.status !== 'CANCELLED' && (
              <button
                className="btn btn-light me-2"
                onClick={() => handleUpdateStatus(nextStatus)}
                disabled={updating}
              >
                {updating ? 'Updating...' : `Advance to ${nextStatus.replace(/_/g, ' ')}`}
              </button>
            )}
            {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
              <button
                className="btn btn-danger"
                onClick={() => handleUpdateStatus('CANCELLED')}
                disabled={updating}
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>

        <div className="card-body">
          {/* Status Timeline */}
          <div className="mb-4">
            <div className="d-flex justify-content-between position-relative">
              <div className="position-absolute" style={{ top: '20px', left: '10%', right: '10%', height: '3px', backgroundColor: '#dee2e6', zIndex: 0 }}></div>
              {STATUS_STEPS.map((step, idx) => {
                const stepStatus = getStepStatus(step, order.status);
                return (
                  <div key={step} className="text-center position-relative" style={{ zIndex: 1, flex: 1 }}>
                    <div
                      className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-2 ${
                        stepStatus === 'completed' ? 'bg-success text-white' :
                        stepStatus === 'active' ? 'bg-primary text-white' :
                        stepStatus === 'cancelled' ? 'bg-danger text-white' :
                        'bg-light text-muted border'
                      }`}
                      style={{ width: '40px', height: '40px' }}
                    >
                      {stepStatus === 'completed' ? (
                        <i className="fas fa-check"></i>
                      ) : stepStatus === 'cancelled' ? (
                        <i className="fas fa-times"></i>
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    <div>
                      <small className={stepStatus === 'active' ? 'fw-bold' : 'text-muted'}>
                        {step.replace(/_/g, ' ')}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
            {order.status === 'CANCELLED' && (
              <div className="text-center mt-2">
                <span className="badge bg-danger"><i className="fas fa-ban me-1"></i>Order Cancelled</span>
              </div>
            )}
          </div>

          {/* Order Details */}
          <div className="row">
            <div className="col-md-6">
              <h5 className="mb-3"><i className="fas fa-info-circle me-2"></i>Order Information</h5>
              <table className="table table-borderless">
                <tbody>
                  <tr>
                    <td className="fw-bold" style={{ width: '40%' }}>Imaging Type:</td>
                    <td>{order.imaging_type_name || (order.imaging_type && order.imaging_type.name) || '--'}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Body Part:</td>
                    <td>{order.body_part || '--'}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Priority:</td>
                    <td>
                      <span className={`badge ${PRIORITY_BADGES[order.priority] || 'bg-secondary'}`}>
                        {order.priority_display || order.priority}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Status:</td>
                    <td>
                      <span className={`badge ${STATUS_BADGES[order.status] || 'bg-secondary'}`}>
                        {order.status_display || order.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Order Date:</td>
                    <td>{order.created_at ? new Date(order.created_at).toLocaleString() : order.order_date || '--'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="col-md-6">
              <h5 className="mb-3"><i className="fas fa-users me-2"></i>People</h5>
              <table className="table table-borderless">
                <tbody>
                  <tr>
                    <td className="fw-bold" style={{ width: '40%' }}>Patient:</td>
                    <td>
                      <i className="fas fa-user me-1 text-muted"></i>
                      {order.patient_name || (order.patient ? `${order.patient.first_name} ${order.patient.last_name}` : '--')}
                    </td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Ordering Doctor:</td>
                    <td>
                      <i className="fas fa-user-md me-1 text-muted"></i>
                      {order.doctor_name || (order.doctor ? `Dr. ${order.doctor.first_name} ${order.doctor.last_name}` : '--')}
                    </td>
                  </tr>
                  {order.radiologist_name && (
                    <tr>
                      <td className="fw-bold">Radiologist:</td>
                      <td>
                        <i className="fas fa-user-md me-1 text-muted"></i>
                        {order.radiologist_name}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Clinical Indication */}
          {order.clinical_indication && (
            <div className="mt-3">
              <h5><i className="fas fa-stethoscope me-2"></i>Clinical Indication</h5>
              <div className="card bg-light">
                <div className="card-body">
                  <p className="mb-0">{order.clinical_indication}</p>
                </div>
              </div>
            </div>
          )}

          {order.notes && (
            <div className="mt-3">
              <h5><i className="fas fa-sticky-note me-2"></i>Notes</h5>
              <p>{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Report Section */}
      {report && (
        <div className="card shadow-sm mb-4">
          <div className="card-header bg-success text-white">
            <h5 className="mb-0"><i className="fas fa-file-medical me-2"></i>Imaging Report</h5>
          </div>
          <div className="card-body">
            <div className="row mb-3">
              <div className="col-md-6">
                <p><strong>Reported By:</strong> {report.radiologist_name || report.reported_by || '--'}</p>
                <p><strong>Report Date:</strong> {report.created_at ? new Date(report.created_at).toLocaleString() : report.report_date || '--'}</p>
              </div>
              <div className="col-md-6">
                {report.severity && (
                  <p>
                    <strong>Severity:</strong>{' '}
                    <span className={`badge ${SEVERITY_BADGES[report.severity] || 'bg-secondary'}`}>
                      {report.severity_display || report.severity}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {report.findings && (
              <div className="mb-3">
                <h6 className="text-primary"><i className="fas fa-search me-1"></i>Findings</h6>
                <div className="card bg-light">
                  <div className="card-body">
                    <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{report.findings}</p>
                  </div>
                </div>
              </div>
            )}

            {report.impression && (
              <div className="mb-3">
                <h6 className="text-primary"><i className="fas fa-clipboard-check me-1"></i>Impression</h6>
                <div className="card bg-light">
                  <div className="card-body">
                    <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{report.impression}</p>
                  </div>
                </div>
              </div>
            )}

            {report.recommendation && (
              <div className="mb-3">
                <h6 className="text-primary"><i className="fas fa-lightbulb me-1"></i>Recommendation</h6>
                <div className="card bg-light">
                  <div className="card-body">
                    <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{report.recommendation}</p>
                  </div>
                </div>
              </div>
            )}

            {report.file && (
              <a href={report.file} className="btn btn-outline-success" target="_blank" rel="noopener noreferrer">
                <i className="fas fa-download me-2"></i>Download Report
              </a>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 mb-4">
        <Link to="/radiology/orders" className="btn btn-secondary">
          <i className="fas fa-arrow-left me-2"></i>Back to Orders
        </Link>
      </div>
    </div>
  );
};

export default ImagingOrderDetail;
