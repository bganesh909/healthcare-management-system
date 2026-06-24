import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { appointmentService, patientService, doctorService } from '../../services/api';

const AppointmentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    patient: searchParams.get('patient') || '',
    doctor: searchParams.get('doctor') || '',
    appointment_date: '',
    appointment_time: '',
    reason: '',
    status: 'SCHEDULED',
    notes: '',
  });
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, doctorsRes] = await Promise.all([
          patientService.getAll({ page_size: 100 }),
          doctorService.getAll({ page_size: 100 }),
        ]);
        setPatients(patientsRes.data);
        setDoctors(doctorsRes.data);

        if (isEditMode) {
          const apptRes = await appointmentService.get(id);
          const appt = apptRes.data;
          setFormData({
            patient: typeof appt.patient === 'object' ? appt.patient.id : appt.patient,
            doctor: typeof appt.doctor === 'object' ? appt.doctor.id : appt.doctor,
            appointment_date: appt.appointment_date,
            appointment_time: appt.appointment_time,
            reason: appt.reason || '',
            status: appt.status,
            notes: appt.notes || '',
          });
        }
      } catch {
        setError('Error loading data');
      }
      setLoading(false);
    };
    fetchData();
  }, [id, isEditMode]);

  // Fetch available slots when doctor + date change
  useEffect(() => {
    if (!formData.doctor || !formData.appointment_date || isEditMode) return;
    const fetchSlots = async () => {
      setSlotsLoading(true);
      try {
        const res = await appointmentService.getAvailableSlots(formData.doctor, formData.appointment_date);
        setAvailableSlots(res.data);
      } catch {
        setAvailableSlots(null);
      }
      setSlotsLoading(false);
    };
    fetchSlots();
  }, [formData.doctor, formData.appointment_date, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSlotSelect = (time) => {
    setFormData(prev => ({ ...prev, appointment_time: time }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (isEditMode) {
        await appointmentService.update(id, formData);
      } else {
        await appointmentService.create(formData);
      }
      navigate('/appointments');
    } catch (err) {
      const errData = err.response?.data;
      if (errData) {
        const messages = Object.entries(errData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('. ');
        setError(messages);
      } else {
        setError('Error saving appointment');
      }
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  const selectedDoctor = doctors.find(d => String(d.id) === String(formData.doctor));

  return (
    <div className="container mt-4 mb-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm" style={{ borderRadius: 14, border: 'none' }}>
            <div className="card-header bg-white py-3" style={{ borderRadius: '14px 14px 0 0', borderBottom: '2px solid #f0f0f0' }}>
              <h4 className="mb-0" style={{ fontWeight: 700, color: '#1a5276' }}>
                <i className={`fas ${isEditMode ? 'fa-edit' : 'fa-calendar-plus'} me-2`}></i>
                {isEditMode ? 'Edit Appointment' : 'Schedule New Appointment'}
              </h4>
            </div>
            <div className="card-body p-4">
              {error && <div className="alert alert-danger py-2" style={{ fontSize: '0.88rem' }}>{error}</div>}

              <form onSubmit={handleSubmit}>
                {/* Patient & Doctor */}
                <div className="row mb-4">
                  <div className="col-md-6 mb-3 mb-md-0">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                      <i className="fas fa-user-injured me-1 text-muted"></i>Patient *
                    </label>
                    <select className="form-select" name="patient" value={formData.patient} onChange={handleChange} required>
                      <option value="">Select Patient</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.phone_number})</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                      <i className="fas fa-user-md me-1 text-muted"></i>Doctor *
                    </label>
                    <select className="form-select" name="doctor" value={formData.doctor} onChange={handleChange} required>
                      <option value="">Select Doctor</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>
                          Dr. {d.first_name} {d.last_name} ({d.specialization_display || d.specialization})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selected Doctor Info */}
                {selectedDoctor && (
                  <div className="mb-4 p-3" style={{ background: '#f0f7ff', borderRadius: 10, border: '1px solid #d6e9f8' }}>
                    <div className="d-flex align-items-center gap-2">
                      <i className="fas fa-user-md text-primary"></i>
                      <strong>Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</strong>
                      <span className="badge bg-primary bg-opacity-10 text-primary">{selectedDoctor.specialization_display}</span>
                    </div>
                    <div className="mt-1" style={{ fontSize: '0.82rem', color: '#555' }}>
                      <i className="fas fa-rupee-sign me-1"></i>Fee: &#8377;{parseFloat(selectedDoctor.consultation_fee).toLocaleString('en-IN')}
                      {selectedDoctor.available_days && <span className="ms-3"><i className="fas fa-calendar-week me-1"></i>{selectedDoctor.available_days}</span>}
                    </div>
                  </div>
                )}

                {/* Date & Time */}
                <div className="row mb-4">
                  <div className="col-md-6 mb-3 mb-md-0">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                      <i className="fas fa-calendar me-1 text-muted"></i>Date *
                    </label>
                    <input type="date" className="form-control" name="appointment_date" value={formData.appointment_date}
                      min={new Date().toISOString().split('T')[0]} onChange={handleChange} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                      <i className="fas fa-clock me-1 text-muted"></i>Time *
                    </label>
                    <input type="time" className="form-control" name="appointment_time" value={formData.appointment_time} onChange={handleChange} required />
                  </div>
                </div>

                {/* Available Slots */}
                {!isEditMode && formData.doctor && formData.appointment_date && (
                  <div className="mb-4">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                      <i className="fas fa-th me-1 text-muted"></i>Available Slots
                    </label>
                    {slotsLoading ? (
                      <div className="text-center py-2"><span className="spinner-border spinner-border-sm me-2"></span>Checking availability...</div>
                    ) : availableSlots?.message ? (
                      <div className="alert alert-warning py-2" style={{ fontSize: '0.85rem' }}><i className="fas fa-exclamation-triangle me-1"></i>{availableSlots.message}</div>
                    ) : availableSlots?.slots?.length > 0 ? (
                      <div className="d-flex flex-wrap gap-2">
                        {availableSlots.slots.map((slot, i) => (
                          <button key={i} type="button"
                            className={`btn btn-sm ${formData.appointment_time === slot.time ? 'btn-primary' : 'btn-outline-primary'}`}
                            style={{ borderRadius: 8, fontSize: '0.82rem', minWidth: 80 }}
                            onClick={() => handleSlotSelect(slot.time)}>
                            {slot.time}
                            <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>{slot.available_spots} left</div>
                          </button>
                        ))}
                      </div>
                    ) : availableSlots ? (
                      <div className="text-muted" style={{ fontSize: '0.85rem' }}><i className="fas fa-info-circle me-1"></i>No slots available for this date. You can still enter a custom time above.</div>
                    ) : null}
                  </div>
                )}

                {/* Reason */}
                <div className="mb-4">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                    <i className="fas fa-comment-medical me-1 text-muted"></i>Reason for Visit *
                  </label>
                  <textarea className="form-control" name="reason" rows="3" value={formData.reason} onChange={handleChange} required
                    placeholder="Describe the reason for this appointment..." />
                </div>

                {/* Status (edit only) */}
                {isEditMode && (
                  <div className="mb-4">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                      <i className="fas fa-flag me-1 text-muted"></i>Status
                    </label>
                    <select className="form-select" name="status" value={formData.status} onChange={handleChange}>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="NO_SHOW">No Show</option>
                    </select>
                  </div>
                )}

                {/* Notes */}
                <div className="mb-4">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                    <i className="fas fa-sticky-note me-1 text-muted"></i>Notes
                  </label>
                  <textarea className="form-control" name="notes" rows="2" value={formData.notes} onChange={handleChange}
                    placeholder="Additional notes (optional)..." />
                </div>

                {/* Actions */}
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary px-4" style={{ borderRadius: 8 }} disabled={submitting}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> :
                      <><i className={`fas ${isEditMode ? 'fa-save' : 'fa-calendar-check'} me-1`}></i>{isEditMode ? 'Update' : 'Schedule Appointment'}</>}
                  </button>
                  <button type="button" className="btn btn-outline-secondary" style={{ borderRadius: 8 }} onClick={() => navigate('/appointments')}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentForm;
