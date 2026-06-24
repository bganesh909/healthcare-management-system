import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { operationTheaterService } from '../../services/api';

const SurgeryDetail = () => {
  const { id } = useParams();
  const [surgery, setSurgery] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [postOpNote, setPostOpNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSurgeryDetails = async () => {
      setLoading(true);
      try {
        const response = await operationTheaterService.getSurgery(id);
        const surgeryData = response.data;
        setSurgery(surgeryData);

        // Fetch pre-op checklist if available
        if (surgeryData.pre_op_checklist_id || surgeryData.pre_op_checklist) {
          try {
            const checklistId = surgeryData.pre_op_checklist_id || surgeryData.pre_op_checklist;
            const clRes = await operationTheaterService.getPreOpChecklist(checklistId);
            setChecklist(clRes.data);
          } catch (e) {
            // Checklist may not exist yet
          }
        }

        // Fetch post-op note if available
        if (surgeryData.post_op_note_id || surgeryData.post_op_note) {
          try {
            const noteId = surgeryData.post_op_note_id || surgeryData.post_op_note;
            const noteRes = await operationTheaterService.getPostOpNote(noteId);
            setPostOpNote(noteRes.data);
          } catch (e) {
            // Post-op note may not exist yet
          }
        }

        setLoading(false);
      } catch (err) {
        setError('Error fetching surgery details');
        setLoading(false);
      }
    };
    fetchSurgeryDetails();
  }, [id]);

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

  const checklistItems = [
    { key: 'patient_identity_verified', label: 'Patient Identity Verified' },
    { key: 'consent_form_signed', label: 'Consent Form Signed' },
    { key: 'site_marked', label: 'Surgical Site Marked' },
    { key: 'allergies_checked', label: 'Allergies Checked' },
    { key: 'blood_type_confirmed', label: 'Blood Type Confirmed' },
    { key: 'npo_status_confirmed', label: 'NPO Status Confirmed' },
    { key: 'pre_op_labs_reviewed', label: 'Pre-Op Labs Reviewed' },
    { key: 'imaging_reviewed', label: 'Imaging Reviewed' },
    { key: 'anesthesia_assessment_done', label: 'Anesthesia Assessment Done' },
    { key: 'iv_access_established', label: 'IV Access Established' },
    { key: 'antibiotics_given', label: 'Prophylactic Antibiotics Given' },
    { key: 'equipment_checked', label: 'Equipment Checked' },
  ];

  const statusTimeline = [
    { status: 'SCHEDULED', icon: 'fa-calendar-check', label: 'Scheduled' },
    { status: 'IN_PROGRESS', icon: 'fa-play-circle', label: 'In Progress' },
    { status: 'COMPLETED', icon: 'fa-check-circle', label: 'Completed' },
  ];

  const getTimelineClass = (stepStatus) => {
    if (!surgery) return '';
    const statusOrder = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];
    const currentIdx = statusOrder.indexOf(surgery.status);
    const stepIdx = statusOrder.indexOf(stepStatus);
    if (surgery.status === 'CANCELLED' || surgery.status === 'POSTPONED') {
      return stepIdx === 0 ? 'text-success' : 'text-muted';
    }
    return stepIdx <= currentIdx ? 'text-success' : 'text-muted';
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
        <Link to="/ot/surgeries" className="btn btn-secondary">Back to Surgeries</Link>
      </div>
    );
  }

  if (!surgery) return null;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-procedures me-2"></i>Surgery Details</h2>
        <Link to="/ot/surgeries" className="btn btn-outline-secondary">
          <i className="fas fa-arrow-left me-1"></i> Back to List
        </Link>
      </div>

      {/* Status Timeline */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-around text-center">
            {statusTimeline.map((step, idx) => (
              <div key={step.status} className="d-flex align-items-center">
                <div className={getTimelineClass(step.status)}>
                  <i className={`fas ${step.icon} fa-2x`}></i>
                  <div className="mt-1 small fw-bold">{step.label}</div>
                </div>
                {idx < statusTimeline.length - 1 && (
                  <div className="mx-3 text-muted">
                    <i className="fas fa-arrow-right"></i>
                  </div>
                )}
              </div>
            ))}
            {(surgery.status === 'CANCELLED' || surgery.status === 'POSTPONED') && (
              <div className="d-flex align-items-center">
                <div className="mx-3 text-muted"><i className="fas fa-arrow-right"></i></div>
                <div className="text-danger">
                  <i className={`fas ${surgery.status === 'CANCELLED' ? 'fa-times-circle' : 'fa-clock'} fa-2x`}></i>
                  <div className="mt-1 small fw-bold">{surgery.status === 'CANCELLED' ? 'Cancelled' : 'Postponed'}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Surgery Info */}
      <div className="row">
        <div className="col-md-8">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0"><i className="fas fa-info-circle me-2"></i>Surgery Information</h5>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Surgery #:</strong> {surgery.surgery_number || surgery.id}
                </div>
                <div className="col-md-6">
                  <strong>Status:</strong>{' '}
                  <span className={`badge ${getStatusBadgeClass(surgery.status)}`}>
                    {surgery.status_display || surgery.status}
                  </span>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Type:</strong>{' '}
                  <span className={`badge ${getTypeBadgeClass(surgery.surgery_type)}`}>
                    {surgery.surgery_type_display || surgery.surgery_type}
                  </span>
                </div>
                <div className="col-md-6">
                  <strong>Scheduled Date:</strong> {surgery.scheduled_date ? new Date(surgery.scheduled_date).toLocaleString() : '-'}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Patient:</strong> {surgery.patient_name || `${surgery.patient?.first_name || ''} ${surgery.patient?.last_name || ''}`}
                </div>
                <div className="col-md-6">
                  <strong>Surgeon:</strong> Dr. {surgery.surgeon_name || `${surgery.surgeon?.first_name || ''} ${surgery.surgeon?.last_name || ''}`}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Operation Theater:</strong> {surgery.operation_theater_name || surgery.operation_theater?.name || '-'}
                </div>
                <div className="col-md-6">
                  <strong>Anesthesia Type:</strong> {surgery.anesthesia_type_display || surgery.anesthesia_type || '-'}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Estimated Duration:</strong> {surgery.estimated_duration ? `${surgery.estimated_duration} mins` : '-'}
                </div>
                <div className="col-md-6">
                  <strong>Actual Duration:</strong> {surgery.actual_duration ? `${surgery.actual_duration} mins` : '-'}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Blood Loss:</strong> {surgery.blood_loss ? `${surgery.blood_loss} ml` : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Diagnosis & Procedure */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0"><i className="fas fa-stethoscope me-2"></i>Diagnosis & Procedure</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <strong>Procedure:</strong>
                <p className="mt-1">{surgery.procedure_name || surgery.procedure || '-'}</p>
              </div>
              <div className="mb-3">
                <strong>Pre-Op Diagnosis:</strong>
                <p className="mt-1">{surgery.pre_op_diagnosis || '-'}</p>
              </div>
              <div className="mb-3">
                <strong>Post-Op Diagnosis:</strong>
                <p className="mt-1">{surgery.post_op_diagnosis || '-'}</p>
              </div>
              <div className="mb-3">
                <strong>Procedure Notes:</strong>
                <p className="mt-1">{surgery.procedure_notes || '-'}</p>
              </div>
              <div className="mb-3">
                <strong>Complications:</strong>
                <p className="mt-1">{surgery.complications || 'None reported'}</p>
              </div>
            </div>
          </div>

          {/* Surgical Team */}
          {surgery.surgical_team && surgery.surgical_team.length > 0 && (
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-secondary text-white">
                <h5 className="mb-0"><i className="fas fa-users me-2"></i>Surgical Team</h5>
              </div>
              <div className="card-body">
                <table className="table table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>Role</th>
                      <th>Member</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surgery.surgical_team.map((member, idx) => (
                      <tr key={idx}>
                        <td>{member.role_display || member.role}</td>
                        <td>{member.member_name || member.name || `${member.first_name || ''} ${member.last_name || ''}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-md-4">
          {/* Pre-Op Checklist */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-warning text-dark">
              <h5 className="mb-0"><i className="fas fa-clipboard-check me-2"></i>Pre-Op Checklist</h5>
            </div>
            <div className="card-body">
              {checklist ? (
                <ul className="list-unstyled mb-0">
                  {checklistItems.map((item) => (
                    <li key={item.key} className="d-flex align-items-center mb-2">
                      {checklist[item.key] ? (
                        <i className="fas fa-check-circle text-success me-2"></i>
                      ) : (
                        <i className="fas fa-times-circle text-danger me-2"></i>
                      )}
                      <span className={checklist[item.key] ? '' : 'text-muted'}>{item.label}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mb-0">No checklist available</p>
              )}
            </div>
          </div>

          {/* Post-Op Note */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0"><i className="fas fa-notes-medical me-2"></i>Post-Op Note</h5>
            </div>
            <div className="card-body">
              {postOpNote ? (
                <>
                  <div className="mb-3">
                    <strong>Recovery Status:</strong>
                    <p className="mt-1">{postOpNote.recovery_status_display || postOpNote.recovery_status || '-'}</p>
                  </div>
                  <div className="mb-3">
                    <strong>Pain Level:</strong>
                    <div className="progress mt-1" style={{ height: '20px' }}>
                      <div
                        className={`progress-bar ${
                          (postOpNote.pain_level || 0) <= 3 ? 'bg-success' :
                          (postOpNote.pain_level || 0) <= 6 ? 'bg-warning' : 'bg-danger'
                        }`}
                        role="progressbar"
                        style={{ width: `${((postOpNote.pain_level || 0) / 10) * 100}%` }}
                      >
                        {postOpNote.pain_level || 0}/10
                      </div>
                    </div>
                  </div>
                  {postOpNote.vitals && (
                    <div className="mb-3">
                      <strong>Vitals:</strong>
                      <ul className="list-unstyled mt-1 ms-2">
                        {postOpNote.vitals.blood_pressure && <li><i className="fas fa-heartbeat text-danger me-1"></i> BP: {postOpNote.vitals.blood_pressure}</li>}
                        {postOpNote.vitals.heart_rate && <li><i className="fas fa-heart text-danger me-1"></i> HR: {postOpNote.vitals.heart_rate} bpm</li>}
                        {postOpNote.vitals.temperature && <li><i className="fas fa-thermometer-half text-warning me-1"></i> Temp: {postOpNote.vitals.temperature}&deg;</li>}
                        {postOpNote.vitals.oxygen_saturation && <li><i className="fas fa-lungs text-info me-1"></i> SpO2: {postOpNote.vitals.oxygen_saturation}%</li>}
                      </ul>
                    </div>
                  )}
                  <div className="mb-0">
                    <strong>Instructions:</strong>
                    <p className="mt-1 mb-0">{postOpNote.instructions || '-'}</p>
                  </div>
                </>
              ) : (
                <p className="text-muted mb-0">No post-op note available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurgeryDetail;
