import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { prescriptionService, patientService, doctorService, appointmentService } from '../../services/api';

const emptyItem = {
  medicine_name: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: ''
};

const PrescriptionForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    patient: '',
    doctor: '',
    appointment: '',
    diagnosis: '',
    notes: '',
    follow_up_date: '',
    items: [{ ...emptyItem }]
  });

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, doctorsRes] = await Promise.all([
          patientService.getAll(),
          doctorService.getAll()
        ]);
        setPatients(patientsRes.data);
        setDoctors(doctorsRes.data);

        if (isEditMode) {
          const response = await prescriptionService.get(id);
          const prescription = response.data;
          setFormData({
            patient: prescription.patient?.id || prescription.patient || '',
            doctor: prescription.doctor?.id || prescription.doctor || '',
            appointment: prescription.appointment?.id || prescription.appointment || '',
            diagnosis: prescription.diagnosis || '',
            notes: prescription.notes || '',
            follow_up_date: prescription.follow_up_date || '',
            items: prescription.items && prescription.items.length > 0
              ? prescription.items.map(item => ({
                  medicine_name: item.medicine_name || '',
                  dosage: item.dosage || '',
                  frequency: item.frequency || '',
                  duration: item.duration || '',
                  instructions: item.instructions || ''
                }))
              : [{ ...emptyItem }]
          });

          // Load appointments for pre-selected patient/doctor
          if (prescription.patient && prescription.doctor) {
            const patientId = prescription.patient?.id || prescription.patient;
            const doctorId = prescription.doctor?.id || prescription.doctor;
            try {
              const apptRes = await appointmentService.getAll({ patient: patientId, doctor: doctorId });
              setAppointments(apptRes.data);
            } catch (err) {
              console.error('Error loading appointments', err);
            }
          }
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

  // Fetch appointments when patient and doctor change
  useEffect(() => {
    const fetchAppointments = async () => {
      if (formData.patient && formData.doctor) {
        try {
          const response = await appointmentService.getAll({
            patient: formData.patient,
            doctor: formData.doctor
          });
          setAppointments(response.data);
        } catch (err) {
          console.error('Error fetching appointments', err);
          setAppointments([]);
        }
      } else {
        setAppointments([]);
      }
    };
    fetchAppointments();
  }, [formData.patient, formData.doctor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Reset appointment when patient or doctor changes
    if (name === 'patient' || name === 'doctor') {
      setFormData(prev => ({ ...prev, [name]: value, appointment: '' }));
    }
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [name]: value };
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const submitData = {
        patient: formData.patient,
        doctor: formData.doctor,
        diagnosis: formData.diagnosis,
        notes: formData.notes,
        follow_up_date: formData.follow_up_date || null,
        items: formData.items
      };
      if (formData.appointment) {
        submitData.appointment = formData.appointment;
      }

      if (isEditMode) {
        await prescriptionService.update(id, submitData);
      } else {
        await prescriptionService.create(submitData);
      }
      navigate('/prescriptions');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving prescription');
      setSubmitting(false);
      console.error(err);
    }
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;

  return (
    <div className="container mt-4">
      <h2>
        <i className="fas fa-prescription me-2"></i>
        {isEditMode ? 'Edit Prescription' : 'New Prescription'}
      </h2>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">General Information</h5>
          </div>
          <div className="card-body">
            <div className="row mb-3">
              <div className="col-md-4">
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
              <div className="col-md-4">
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
              <div className="col-md-4">
                <label htmlFor="appointment" className="form-label">Appointment</label>
                <select
                  className="form-select"
                  id="appointment"
                  name="appointment"
                  value={formData.appointment}
                  onChange={handleChange}
                  disabled={!formData.patient || !formData.doctor}
                >
                  <option value="">Select Appointment (optional)</option>
                  {appointments.map(appt => (
                    <option key={appt.id} value={appt.id}>
                      {appt.appointment_date} {appt.appointment_time} - {appt.status_display || appt.status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="row mb-3">
              <div className="col-md-8">
                <label htmlFor="diagnosis" className="form-label">Diagnosis *</label>
                <textarea
                  className="form-control"
                  id="diagnosis"
                  name="diagnosis"
                  value={formData.diagnosis}
                  onChange={handleChange}
                  rows="3"
                  required
                ></textarea>
              </div>
              <div className="col-md-4">
                <label htmlFor="follow_up_date" className="form-label">Follow-up Date</label>
                <input
                  type="date"
                  className="form-control"
                  id="follow_up_date"
                  name="follow_up_date"
                  value={formData.follow_up_date}
                  onChange={handleChange}
                />
              </div>
            </div>
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
          </div>
        </div>

        {/* Medicine Items */}
        <div className="card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="fas fa-pills me-2"></i>Medicines</h5>
            <button type="button" className="btn btn-sm btn-success" onClick={addItem}>
              <i className="fas fa-plus me-1"></i> Add Medicine
            </button>
          </div>
          <div className="card-body">
            {formData.items.map((item, index) => (
              <div key={index} className="border rounded p-3 mb-3 bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="mb-0">Medicine #{index + 1}</h6>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => removeItem(index)}
                    >
                      <i className="fas fa-times"></i> Remove
                    </button>
                  )}
                </div>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Medicine Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="medicine_name"
                      value={item.medicine_name}
                      onChange={(e) => handleItemChange(index, e)}
                      required
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Dosage *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="dosage"
                      value={item.dosage}
                      onChange={(e) => handleItemChange(index, e)}
                      placeholder="e.g., 500mg"
                      required
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Frequency *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="frequency"
                      value={item.frequency}
                      onChange={(e) => handleItemChange(index, e)}
                      placeholder="e.g., Twice daily"
                      required
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Duration *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="duration"
                      value={item.duration}
                      onChange={(e) => handleItemChange(index, e)}
                      placeholder="e.g., 7 days"
                      required
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Instructions</label>
                    <input
                      type="text"
                      className="form-control"
                      name="instructions"
                      value={item.instructions}
                      onChange={(e) => handleItemChange(index, e)}
                      placeholder="e.g., After meals"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="d-flex gap-2 mt-4 mb-4">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : isEditMode ? 'Update Prescription' : 'Create Prescription'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/prescriptions')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default PrescriptionForm;
