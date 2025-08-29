import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { appointmentService, patientService, doctorService } from '../../services/api';
const AppointmentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const [formData, setFormData] = useState({
    patient: '',
    doctor: '',
    appointment_date: '',
    appointment_time: '',
    reason: '',
    status: 'SCHEDULED',
    notes: ''
  });
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch patients and doctors
        const [patientsResponse, doctorsResponse] = await Promise.all([
          patientService.getAll(),
          doctorService.getAll()
        ]);
        setPatients(patientsResponse.data);
        setDoctors(doctorsResponse.data);
        // If editing, fetch the appointment data
        if (isEditMode) {
          const appointmentResponse = await appointmentService.get(id);
          const appointment = appointmentResponse.data;
          setFormData({
            patient: appointment.patient.id,
            doctor: appointment.doctor.id,
            appointment_date: appointment.appointment_date,
            appointment_time: appointment.appointment_time,
            reason: appointment.reason,
            status: appointment.status,
            notes: appointment.notes || ''
          });
        }
        setLoading(false);
      } catch (err) {
        setError('Error fetching data');
        setLoading(false);
        console.error(err);
      }
    };
    fetchData();
  }, [id, isEditMode]);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditMode) {
        await appointmentService.update(id, formData);
      } else {
        await appointmentService.create(formData);
      }
      navigate('/appointments');
    } catch (err) {
      setError('Error saving appointment');
      setSubmitting(false);
      console.error(err);
    }
  };
  if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;
  return (
    <div className="container mt-4">
      <h2>{isEditMode ? 'Edit Appointment' : 'Schedule New Appointment'}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="row mb-3">
          <div className="col-md-6">
            <label htmlFor="patient" className="form-label">Patient *</label>
            <select
              className="form-select"
              id="patient"
              name="patient"
              value={formData.patient}
              onChange={handleChange}
              required
            >
              <option value="">Select Patient</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.first_name} {patient.last_name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label htmlFor="doctor" className="form-label">Doctor *</label>
            <select
              className="form-select"
              id="doctor"
              name="doctor"
              value={formData.doctor}
              onChange={handleChange}
              required
            >
              <option value="">Select Doctor</option>
              {doctors.map(doctor => (
                <option key={doctor.id} value={doctor.id}>
                  Dr. {doctor.first_name} {doctor.last_name} ({doctor.specialization_display || doctor.specialization})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-md-6">
            <label htmlFor="appointment_date" className="form-label">Appointment Date *</label>
            <input
              type="date"
              className="form-control"
              id="appointment_date"
              name="appointment_date"
              value={formData.appointment_date}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="appointment_time" className="form-label">Appointment Time *</label>
            <input
              type="time"
              className="form-control"
              id="appointment_time"
              name="appointment_time"
              value={formData.appointment_time}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className="mb-3">
          <label htmlFor="reason" className="form-label">Reason for Visit *</label>
          <textarea
            className="form-control"
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            rows="3"
            required
          ></textarea>
        </div>
        {isEditMode && (
          <div className="mb-3">
            <label htmlFor="status" className="form-label">Status</label>
            <select
              className="form-select"
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No Show</option>
            </select>
          </div>
        )}
        <div className="mb-3">
          <label htmlFor="notes" className="form-label">Notes</label>
          <textarea
            className="form-control"
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
          ></textarea>
        </div>
        <div className="d-flex gap-2 mt-4">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : isEditMode ? 'Update Appointment' : 'Schedule Appointment'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/appointments')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
export default AppointmentForm;
