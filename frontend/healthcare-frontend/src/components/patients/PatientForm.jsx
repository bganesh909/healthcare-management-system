import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patientService } from '../../services/api';
const PatientForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    phone_number: '',
    email: '',
    address: '',
    medical_history: '',
    blood_group: '',
    allergies: '',
    emergency_contact_name: '',
    emergency_contact_number: ''
  });
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (isEditMode) {
      const fetchPatient = async () => {
        try {
          const response = await patientService.get(id);
          setFormData(response.data);
          setLoading(false);
        } catch (err) {
          setError('Error fetching patient data');
          setLoading(false);
          console.error(err);
        }
      };
      fetchPatient();
    }
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
        await patientService.update(id, formData);
      } else {
        await patientService.create(formData);
      }
      navigate('/patients');
    } catch (err) {
      setError('Error saving patient data');
      setSubmitting(false);
      console.error(err);
    }
  };
  if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;
  return (
    <div className="container mt-4">
      <h2>{isEditMode ? 'Edit Patient' : 'Add New Patient'}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="row mb-3">
          <div className="col-md-6">
            <label htmlFor="first_name" className="form-label">First Name *</label>
            <input
              type="text"
              className="form-control"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="last_name" className="form-label">Last Name *</label>
            <input
              type="text"
              className="form-control"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-md-6">
            <label htmlFor="date_of_birth" className="form-label">Date of Birth *</label>
            <input
              type="date"
              className="form-control"
              id="date_of_birth"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="gender" className="form-label">Gender *</label>
            <select
              className="form-select"
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
            >
              <option value="">Select Gender</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-md-6">
            <label htmlFor="phone_number" className="form-label">Phone Number *</label>
            <input
              type="tel"
              className="form-control"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="email" className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-control"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className="mb-3">
          <label htmlFor="address" className="form-label">Address *</label>
          <textarea
            className="form-control"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
          ></textarea>
        </div>
        <div className="row mb-3">
          <div className="col-md-6">
            <label htmlFor="blood_group" className="form-label">Blood Group</label>
            <input
              type="text"
              className="form-control"
              id="blood_group"
              name="blood_group"
              value={formData.blood_group || ''}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="allergies" className="form-label">Allergies</label>
            <textarea
              className="form-control"
              id="allergies"
              name="allergies"
              value={formData.allergies || ''}
              onChange={handleChange}
            ></textarea>
          </div>
        </div>
        <div className="mb-3">
          <label htmlFor="medical_history" className="form-label">Medical History</label>
          <textarea
            className="form-control"
            id="medical_history"
            name="medical_history"
            value={formData.medical_history || ''}
            onChange={handleChange}
            rows="3"
          ></textarea>
        </div>
        <div className="row mb-3">
          <div className="col-md-6">
            <label htmlFor="emergency_contact_name" className="form-label">Emergency Contact Name</label>
            <input
              type="text"
              className="form-control"
              id="emergency_contact_name"
              name="emergency_contact_name"
              value={formData.emergency_contact_name || ''}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="emergency_contact_number" className="form-label">Emergency Contact Number</label>
            <input
              type="tel"
              className="form-control"
              id="emergency_contact_number"
              name="emergency_contact_number"
              value={formData.emergency_contact_number || ''}
              onChange={handleChange}
            />
          </div>
        </div>
        <div className="d-flex gap-2 mt-4">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Patient'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/patients')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
export default PatientForm;
