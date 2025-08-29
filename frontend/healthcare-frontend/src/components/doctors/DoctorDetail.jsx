import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { doctorService } from '../../services/api';
const DoctorDetail = () => {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const response = await doctorService.get(id);
        setDoctor(response.data);
        setLoading(false);
      } catch (err) {
        setError('Error fetching doctor details');
        setLoading(false);
        console.error(err);
      }
    };
    fetchDoctor();
  }, [id]);
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this doctor?')) {
      try {
        await doctorService.delete(id);
        navigate('/doctors');
      } catch (err) {
        setError('Error deleting doctor');
        console.error(err);
      }
    }
  };
  if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!doctor) return <div className="alert alert-warning">Doctor not found</div>;
  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h3>Dr. {doctor.first_name} {doctor.last_name}</h3>
          <div>
            <Link to={`/doctors/edit/${doctor.id}`} className="btn btn-warning me-2">Edit</Link>
            <button onClick={handleDelete} className="btn btn-danger">Delete</button>
          </div>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h5 className="card-title">Professional Information</h5>
              <p><strong>Specialization:</strong> {doctor.get_specialization_display || doctor.specialization}</p>
              <p><strong>License Number:</strong> {doctor.license_number}</p>
              <p><strong>Qualification:</strong> {doctor.qualification}</p>
              <p><strong>Experience:</strong> {doctor.experience_years} years</p>
              <p><strong>Consultation Fee:</strong> ${doctor.consultation_fee}</p>
            </div>
            <div className="col-md-6">
              <h5 className="card-title">Contact Information</h5>
              <p><strong>Email:</strong> {doctor.email}</p>
              <p><strong>Phone:</strong> {doctor.phone_number}</p>
              <div>
                <strong>Bio:</strong>
                <p className="mt-2">{doctor.bio || 'No bio information available'}</p>
              </div>
            </div>
          </div>
          <div className="row mt-4">
            <div className="col-12">
              <h5 className="card-title">Availability</h5>
              <p><strong>Days:</strong> {doctor.available_days}</p>
              <p><strong>Hours:</strong> {doctor.available_hours_start} - {doctor.available_hours_end}</p>
            </div>
          </div>
        </div>
        <div className="card-footer">
          <Link to="/doctors" className="btn btn-secondary">Back to Doctors</Link>
        </div>
      </div>
    </div>
  );
};
export default DoctorDetail;
