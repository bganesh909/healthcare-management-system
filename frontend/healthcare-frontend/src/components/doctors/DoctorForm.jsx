import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doctorService } from '../../services/api';
const DoctorForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    specialization: '',
    license_number: '',
    phone_number: '',
    email: '',
    qualification: '',
    experience_years: '',
    bio: '',
    consultation_fee: '',
    available_days: '',
    available_hours_start: '',
    available_hours_end: ''
  });
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (isEditMode) {
      const fetchDoctor = async () => {
        try {
          const response = await doctorService.get(id);
          setFormData(response.data);
          setLoading(false);
        } catch (err) {
          setError('Error fetching doctor data');
          setLoading(false);
          console.error(err);
        }
      };
      fetchDoctor();
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
      const data = {
        ...formData,
        consultation_fee: parseFloat(formData.consultation_fee),
        experience_years: parseInt(formData.experience_years, 10)
      };
      if (isEditMode) {
        await doctorService.update(id, data);
      } else {
        await doctorService.create(data);
      }
      navigate('/doctors');
    } catch (err) {
      setError('Error saving doctor data');
      setSubmitting(false);
      console.error(err);
    }
  };
  if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;
  return (
    <div className="container mt-4">
      <h2>{isEditMode ? 'Edit Doctor' : 'Add New Doctor'}</h2>
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
            <label htmlFor="specialization" className="form-label">Specialization *</label>
            <select
              className="form-select"
              id="specialization"
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              required
            >
              <option value="">Select Specialization</option>
              <option value="CARDIOLOGY">Cardiology</option>
              <option value="DERMATOLOGY">Dermatology</option>
              <option value="ENDOCRINOLOGY">Endocrinology</option>
              <option value="GASTROENTEROLOGY">Gastroenterology</option>
              <option value="NEUROLOGY">Neurology</option>
              <option value="ONCOLOGY">Oncology</option>
              <option value="PEDIATRICS">Pediatrics</option>
              <option value="PSYCHIATRY">Psychiatry</option>
              <option value="ORTHOPEDICS">Orthopedics</option>
              <option value="GYNECOLOGY">Gynecology</option>
              <option value="GENERAL">General Medicine</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="col-md-6">
            <label htmlFor="license_number" className="form-label">License Number *</label>
            <input
              type="text"
              className="form-control"
              id="license_number"
              name="license_number"
              value={formData.license_number}
              onChange={handleChange}
              required
            />
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
        <div className="row mb-3">
          <div className="col-md-6">
            <label htmlFor="qualification" className="form-label">Qualification *</label>
            <input
              type="text"
              className="form-control"
              id="qualification"
              name="qualification"
              value={formData.qualification}
              onChange={handleChange}
              required
              placeholder="e.g., MBBS, MD, MS"
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="experience_years" className="form-label">Years of Experience *</label>
            <input
              type="number"
              min="0"
              className="form-control"
              id="experience_years"
              name="experience_years"
              value={formData.experience_years}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className="mb-3">
          <label htmlFor="bio" className="form-label">Bio</label>
          <textarea
            className="form-control"
            id="bio"
            name="bio"
            value={formData.bio || ''}
            onChange={handleChange}
            rows="3"
          ></textarea>
        </div>
        <div className="mb-3">
          <label htmlFor="consultation_fee" className="form-label">Consultation Fee (USD) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="form-control"
            id="consultation_fee"
            name="consultation_fee"
            value={formData.consultation_fee}
            onChange={handleChange}
            required
          />
        </div>
        <div className="row mb-3">
          <div className="col-md-4">
            <label htmlFor="available_days" className="form-label">Available Days *</label>
            <input
              type="text"
              className="form-control"
              id="available_days"
              name="available_days"
              value={formData.available_days}
              onChange={handleChange}
              required
              placeholder="e.g., Monday, Wednesday, Friday"
            />
          </div>
          <div className="col-md-4">
            <label htmlFor="available_hours_start" className="form-label">Hours Start *</label>
            <input
              type="time"
              className="form-control"
              id="available_hours_start"
              name="available_hours_start"
              value={formData.available_hours_start}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-4">
            <label htmlFor="available_hours_end" className="form-label">Hours End *</label>
            <input
              type="time"
              className="form-control"
              id="available_hours_end"
              name="available_hours_end"
              value={formData.available_hours_end}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className="d-flex gap-2 mt-4">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Doctor'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/doctors')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
export default DoctorForm;
