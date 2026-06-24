import React, { useState, useEffect, useCallback } from 'react';
import { clinicalNoteService, patientService, doctorService } from '../../services/api';

const NOTE_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'SOAP', label: 'SOAP Note' },
  { value: 'PROGRESS', label: 'Progress Note' },
  { value: 'ADMISSION', label: 'Admission Note' },
  { value: 'DISCHARGE', label: 'Discharge Note' },
  { value: 'CONSULTATION', label: 'Consultation Note' },
  { value: 'PROCEDURE', label: 'Procedure Note' },
  { value: 'OTHER', label: 'Other' },
];

const NOTE_TYPE_BADGES = {
  SOAP: 'bg-primary',
  PROGRESS: 'bg-info',
  ADMISSION: 'bg-success',
  DISCHARGE: 'bg-warning text-dark',
  CONSULTATION: 'bg-secondary',
  PROCEDURE: 'bg-dark',
  OTHER: 'bg-light text-dark',
};

const ClinicalNotes = () => {
  const [notes, setNotes] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });
  const [filterPatient, setFilterPatient] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterType, setFilterType] = useState('');
  const [expandedNote, setExpandedNote] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    patient: '',
    doctor: '',
    note_type: 'PROGRESS',
    content: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (filterPatient) params.patient = filterPatient;
      if (filterDoctor) params.doctor = filterDoctor;
      if (filterType) params.note_type = filterType;
      const response = await clinicalNoteService.getAll(params);
      setNotes(response.data || []);
      setPagination({ next: response.next, previous: response.previous, count: response.count });
      setLoading(false);
    } catch (err) {
      setError('Error fetching clinical notes');
      setLoading(false);
    }
  }, [page, filterPatient, filterDoctor, filterType]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [patRes, docRes] = await Promise.all([
          patientService.getAll({ page_size: 100 }),
          doctorService.getAll({ page_size: 100 }),
        ]);
        setPatients(patRes.data || []);
        setDoctors(docRes.data || []);
      } catch {
        // Non-critical
      }
    };
    loadDropdowns();
  }, []);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...formData };
      // Build content from SOAP fields if type is SOAP
      if (payload.note_type === 'SOAP') {
        payload.content = `S: ${payload.subjective}\nO: ${payload.objective}\nA: ${payload.assessment}\nP: ${payload.plan}`;
      }
      // Remove SOAP helper fields
      delete payload.subjective;
      delete payload.objective;
      delete payload.assessment;
      delete payload.plan;
      // Remove empty optional fields
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') delete payload[key];
      });
      await clinicalNoteService.create(payload);
      setShowForm(false);
      setFormData({
        patient: '', doctor: '', note_type: 'PROGRESS', content: '',
        subjective: '', objective: '', assessment: '', plan: '',
      });
      fetchNotes();
      setSubmitting(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error creating clinical note');
      setSubmitting(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedNote(expandedNote === id ? null : id);
  };

  const clearFilters = () => {
    setFilterPatient('');
    setFilterDoctor('');
    setFilterType('');
    setPage(1);
  };

  const parseSoapContent = (content) => {
    if (!content) return null;
    const sections = {};
    const lines = content.split('\n');
    let currentKey = null;
    for (const line of lines) {
      if (line.startsWith('S:')) { currentKey = 'Subjective'; sections[currentKey] = line.substring(2).trim(); }
      else if (line.startsWith('O:')) { currentKey = 'Objective'; sections[currentKey] = line.substring(2).trim(); }
      else if (line.startsWith('A:')) { currentKey = 'Assessment'; sections[currentKey] = line.substring(2).trim(); }
      else if (line.startsWith('P:')) { currentKey = 'Plan'; sections[currentKey] = line.substring(2).trim(); }
      else if (currentKey) { sections[currentKey] += '\n' + line; }
    }
    return Object.keys(sections).length > 0 ? sections : null;
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-notes-medical me-2"></i>Clinical Notes</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <i className="fas fa-plus me-2"></i>Add Note
        </button>
      </div>

      {/* Filters */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <select className="form-select" value={filterPatient} onChange={(e) => { setFilterPatient(e.target.value); setPage(1); }}>
                <option value="">All Patients</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={filterDoctor} onChange={(e) => { setFilterDoctor(e.target.value); setPage(1); }}>
                <option value="">All Doctors</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
                {NOTE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
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
      ) : notes.length === 0 ? (
        <div className="alert alert-info">No clinical notes found</div>
      ) : (
        <>
          {notes.map((note) => {
            const isExpanded = expandedNote === note.id;
            const soapSections = note.note_type === 'SOAP' ? parseSoapContent(note.content) : null;

            return (
              <div key={note.id} className="card shadow-sm mb-3">
                <div
                  className="card-header d-flex justify-content-between align-items-center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleExpand(note.id)}
                >
                  <div className="d-flex align-items-center">
                    <span className={`badge ${NOTE_TYPE_BADGES[note.note_type] || 'bg-secondary'} me-3`}>
                      {note.note_type_display || note.note_type}
                    </span>
                    <div>
                      <strong>{note.doctor_name || (note.doctor ? `Dr. ${note.doctor.first_name} ${note.doctor.last_name}` : 'Unknown Doctor')}</strong>
                      <span className="text-muted ms-2">
                        <i className="fas fa-user me-1"></i>
                        {note.patient_name || (note.patient ? `${note.patient.first_name} ${note.patient.last_name}` : 'Unknown Patient')}
                      </span>
                    </div>
                  </div>
                  <div className="d-flex align-items-center">
                    <small className="text-muted me-3">
                      <i className="fas fa-calendar me-1"></i>
                      {note.created_at ? new Date(note.created_at).toLocaleDateString() : note.date || '--'}
                    </small>
                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                  </div>
                </div>

                {!isExpanded && (
                  <div className="card-body py-2">
                    <p className="mb-0 text-muted text-truncate">
                      {note.content ? note.content.substring(0, 150) + (note.content.length > 150 ? '...' : '') : 'No content'}
                    </p>
                  </div>
                )}

                {isExpanded && (
                  <div className="card-body">
                    {soapSections ? (
                      <div className="row g-3">
                        {Object.entries(soapSections).map(([section, text]) => (
                          <div key={section} className="col-md-6">
                            <div className="card bg-light">
                              <div className="card-body">
                                <h6 className="card-title text-primary">{section}</h6>
                                <p className="card-text mb-0" style={{ whiteSpace: 'pre-wrap' }}>{text}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{note.content || 'No content'}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

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

      {/* Add Note Modal */}
      {showForm && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-plus-circle me-2"></i>Add Clinical Note
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowForm(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Patient *</label>
                      <select className="form-select" name="patient" value={formData.patient} onChange={handleFormChange} required>
                        <option value="">-- Select Patient --</option>
                        {patients.map(p => (
                          <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Doctor *</label>
                      <select className="form-select" name="doctor" value={formData.doctor} onChange={handleFormChange} required>
                        <option value="">-- Select Doctor --</option>
                        {doctors.map(d => (
                          <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Note Type *</label>
                      <select className="form-select" name="note_type" value={formData.note_type} onChange={handleFormChange} required>
                        {NOTE_TYPES.filter(t => t.value).map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    {formData.note_type === 'SOAP' ? (
                      <>
                        <div className="col-md-6">
                          <label className="form-label">Subjective</label>
                          <textarea className="form-control" name="subjective" rows="3" value={formData.subjective} onChange={handleFormChange} placeholder="Patient complaints, history..."></textarea>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Objective</label>
                          <textarea className="form-control" name="objective" rows="3" value={formData.objective} onChange={handleFormChange} placeholder="Physical exam findings, vitals..."></textarea>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Assessment</label>
                          <textarea className="form-control" name="assessment" rows="3" value={formData.assessment} onChange={handleFormChange} placeholder="Diagnosis, differential..."></textarea>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Plan</label>
                          <textarea className="form-control" name="plan" rows="3" value={formData.plan} onChange={handleFormChange} placeholder="Treatment plan, follow-up..."></textarea>
                        </div>
                      </>
                    ) : (
                      <div className="col-md-12">
                        <label className="form-label">Content *</label>
                        <textarea className="form-control" name="content" rows="6" value={formData.content} onChange={handleFormChange} placeholder="Enter note content..." required={formData.note_type !== 'SOAP'}></textarea>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                    ) : (
                      <><i className="fas fa-save me-2"></i>Save Note</>
                    )}
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

export default ClinicalNotes;
