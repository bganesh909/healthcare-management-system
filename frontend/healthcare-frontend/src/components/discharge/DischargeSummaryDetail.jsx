import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { dischargeService } from '../../services/api';

const DischargeSummaryDetail = () => {
  const { id } = useParams();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const response = await dischargeService.getSummary(id);
        setSummary(response.data);
        setLoading(false);
      } catch (err) {
        setError('Error fetching discharge summary');
        setLoading(false);
      }
    };
    fetchSummary();
  }, [id]);

  const handleDownloadPdf = async () => {
    try {
      const response = await dischargeService.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `discharge_summary_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download PDF');
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Are you sure you want to approve this discharge summary?')) return;
    setApproving(true);
    try {
      const response = await dischargeService.approveSummary(id);
      setSummary(response.data);
      setApproving(false);
    } catch (err) {
      setError('Error approving discharge summary');
      setApproving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadgeClass = (s) => {
    switch (s) {
      case 'DRAFT': return 'bg-warning text-dark';
      case 'COMPLETED': return 'bg-info';
      case 'APPROVED': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center mt-5"><div className="spinner-border"></div></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">{error}</div>
        <Link to="/discharge/summaries" className="btn btn-secondary">Back to List</Link>
      </div>
    );
  }

  if (!summary) return null;

  const medications = summary.medications || summary.discharge_medications || [];
  const followUps = summary.follow_up_appointments || summary.follow_ups || [];

  return (
    <div className="container mt-4">
      {/* Action Bar - hidden on print */}
      <div className="d-flex justify-content-between align-items-center mb-4 d-print-none">
        <Link to="/discharge/summaries" className="btn btn-outline-secondary">
          <i className="fas fa-arrow-left me-1"></i> Back to List
        </Link>
        <div>
          {(summary.status === 'DRAFT' || summary.status === 'COMPLETED') && (
            <button
              className="btn btn-success me-2"
              onClick={handleApprove}
              disabled={approving}
            >
              {approving ? (
                <><span className="spinner-border spinner-border-sm me-1"></span> Approving...</>
              ) : (
                <><i className="fas fa-check-circle me-1"></i> Approve</>
              )}
            </button>
          )}
          <button className="btn btn-danger me-2" onClick={handleDownloadPdf}>
            <i className="fas fa-file-pdf me-2"></i>Download PDF
          </button>
          <button className="btn btn-outline-primary" onClick={handlePrint}>
            <i className="fas fa-print me-1"></i> Print
          </button>
        </div>
      </div>

      {/* Printable Document */}
      <div className="card shadow-sm">
        {/* Hospital Header */}
        <div className="card-header bg-primary text-white text-center py-4">
          <h3 className="mb-1"><i className="fas fa-hospital me-2 d-print-none"></i>Healthcare Hospital</h3>
          <p className="mb-0">Discharge Summary</p>
        </div>

        <div className="card-body p-4">
          {/* Summary Info Bar */}
          <div className="row mb-4 pb-3" style={{ borderBottom: '2px solid #dee2e6' }}>
            <div className="col-md-4">
              <strong>Summary #:</strong> {summary.summary_number || `DS-${summary.id}`}
            </div>
            <div className="col-md-4">
              <strong>Admission Date:</strong> {summary.admission_date ? new Date(summary.admission_date).toLocaleDateString() : '-'}
            </div>
            <div className="col-md-4 text-md-end">
              <strong>Status:</strong>{' '}
              <span className={`badge ${getStatusBadgeClass(summary.status)}`}>
                {summary.status_display || summary.status}
              </span>
            </div>
          </div>
          <div className="row mb-4 pb-3" style={{ borderBottom: '2px solid #dee2e6' }}>
            <div className="col-md-4">
              <strong>Discharge Date:</strong> {summary.discharge_date ? new Date(summary.discharge_date).toLocaleDateString() : '-'}
            </div>
            <div className="col-md-4">
              <strong>Discharge Type:</strong> {summary.discharge_type_display || summary.discharge_type || '-'}
            </div>
            <div className="col-md-4 text-md-end">
              <strong>Attending Doctor:</strong> Dr. {summary.doctor_name || `${summary.doctor?.first_name || ''} ${summary.doctor?.last_name || ''}`}
            </div>
          </div>

          {/* Patient Details */}
          <div className="mb-4">
            <h5 className="text-primary border-bottom pb-2">
              <i className="fas fa-user me-2 d-print-none"></i>Patient Details
            </h5>
            <div className="row">
              <div className="col-md-6">
                <p><strong>Name:</strong> {summary.patient_name || `${summary.patient?.first_name || ''} ${summary.patient?.last_name || ''}`}</p>
                <p><strong>Age/Gender:</strong> {summary.patient?.age || '-'} / {summary.patient?.gender || '-'}</p>
              </div>
              <div className="col-md-6">
                <p><strong>Patient ID:</strong> {summary.patient?.patient_id || summary.patient?.id || '-'}</p>
                <p><strong>Contact:</strong> {summary.patient?.phone || summary.patient?.contact_number || '-'}</p>
              </div>
            </div>
          </div>

          {/* Diagnosis */}
          <div className="mb-4">
            <h5 className="text-primary border-bottom pb-2">
              <i className="fas fa-stethoscope me-2 d-print-none"></i>Diagnosis
            </h5>
            <div className="row">
              <div className="col-md-6">
                <p><strong>Admission Diagnosis:</strong></p>
                <p>{summary.admission_diagnosis || '-'}</p>
              </div>
              <div className="col-md-6">
                <p><strong>Discharge Diagnosis:</strong></p>
                <p>{summary.discharge_diagnosis || '-'}</p>
              </div>
            </div>
          </div>

          {/* Treatment Summary */}
          <div className="mb-4">
            <h5 className="text-primary border-bottom pb-2">
              <i className="fas fa-notes-medical me-2 d-print-none"></i>Treatment Summary
            </h5>
            <p>{summary.treatment_summary || '-'}</p>
          </div>

          {/* Procedures */}
          {summary.procedures && (
            <div className="mb-4">
              <h5 className="text-primary border-bottom pb-2">
                <i className="fas fa-procedures me-2 d-print-none"></i>Procedures Performed
              </h5>
              <p>{summary.procedures}</p>
            </div>
          )}

          {/* Medications on Discharge */}
          <div className="mb-4">
            <h5 className="text-primary border-bottom pb-2">
              <i className="fas fa-pills me-2 d-print-none"></i>Medications on Discharge
            </h5>
            {medications.length === 0 ? (
              <p className="text-muted">No medications prescribed</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-sm">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Medication</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Duration</th>
                      <th>Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medications.map((med, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{med.medication_name || med.name || med.medicine || '-'}</td>
                        <td>{med.dosage || '-'}</td>
                        <td>{med.frequency || '-'}</td>
                        <td>{med.duration || '-'}</td>
                        <td>{med.instructions || med.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mb-4">
            <h5 className="text-primary border-bottom pb-2">
              <i className="fas fa-clipboard-list me-2 d-print-none"></i>Instructions
            </h5>
            <div className="row">
              <div className="col-md-6 mb-3">
                <div className="card bg-light">
                  <div className="card-body">
                    <h6><i className="fas fa-utensils me-1 text-success"></i> Dietary Instructions</h6>
                    <p className="mb-0">{summary.dietary_instructions || '-'}</p>
                  </div>
                </div>
              </div>
              <div className="col-md-6 mb-3">
                <div className="card bg-light">
                  <div className="card-body">
                    <h6><i className="fas fa-running me-1 text-info"></i> Activity Instructions</h6>
                    <p className="mb-0">{summary.activity_instructions || '-'}</p>
                  </div>
                </div>
              </div>
              <div className="col-md-6 mb-3">
                <div className="card bg-light">
                  <div className="card-body">
                    <h6><i className="fas fa-calendar-check me-1 text-primary"></i> Follow-up Instructions</h6>
                    <p className="mb-0">{summary.follow_up_instructions || '-'}</p>
                  </div>
                </div>
              </div>
              <div className="col-md-6 mb-3">
                <div className="card bg-light">
                  <div className="card-body">
                    <h6><i className="fas fa-exclamation-triangle me-1 text-danger"></i> Emergency Instructions</h6>
                    <p className="mb-0">{summary.emergency_instructions || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Follow-up Appointments */}
          <div className="mb-4">
            <h5 className="text-primary border-bottom pb-2">
              <i className="fas fa-calendar-alt me-2 d-print-none"></i>Follow-up Appointments
            </h5>
            {followUps.length === 0 ? (
              <p className="text-muted">No follow-up appointments scheduled</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-sm">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Doctor</th>
                      <th>Department</th>
                      <th>Purpose</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {followUps.map((fu, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{fu.follow_up_date ? new Date(fu.follow_up_date).toLocaleDateString() : fu.date || '-'}</td>
                        <td>Dr. {fu.doctor_name || `${fu.doctor?.first_name || ''} ${fu.doctor?.last_name || ''}` || '-'}</td>
                        <td>{fu.department_name || fu.department || '-'}</td>
                        <td>{fu.purpose || fu.reason || '-'}</td>
                        <td>
                          <span className={`badge ${fu.status === 'COMPLETED' ? 'bg-success' : fu.status === 'SCHEDULED' ? 'bg-primary' : 'bg-secondary'}`}>
                            {fu.status || 'Scheduled'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Signature Area */}
          <div className="row mt-5 pt-4" style={{ borderTop: '2px solid #dee2e6' }}>
            <div className="col-md-6">
              <div className="text-center">
                <div style={{ borderBottom: '1px solid #000', width: '200px', margin: '0 auto 5px' }}></div>
                <strong>Attending Physician</strong>
                <br />
                <small>Dr. {summary.doctor_name || `${summary.doctor?.first_name || ''} ${summary.doctor?.last_name || ''}`}</small>
              </div>
            </div>
            <div className="col-md-6">
              <div className="text-center">
                <div style={{ borderBottom: '1px solid #000', width: '200px', margin: '0 auto 5px' }}></div>
                <strong>Patient/Guardian Signature</strong>
              </div>
            </div>
          </div>

          {/* Approved stamp */}
          {summary.status === 'APPROVED' && (
            <div className="text-center mt-4">
              <span className="badge bg-success" style={{ fontSize: '1.2rem', padding: '10px 30px' }}>
                <i className="fas fa-check-circle me-2"></i>APPROVED
              </span>
              {summary.approved_at && (
                <div className="text-muted mt-1">
                  <small>Approved on {new Date(summary.approved_at).toLocaleString()}</small>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .d-print-none { display: none !important; }
          .card { border: none !important; box-shadow: none !important; }
          .container { max-width: 100% !important; }
          body { font-size: 12pt; }
        }
      `}</style>
    </div>
  );
};

export default DischargeSummaryDetail;
