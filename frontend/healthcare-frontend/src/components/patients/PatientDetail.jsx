import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { patientService } from '../../services/api';
const PatientDetail = () => {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const response = await patientService.get(id);
        setPatient(response.data);
        setLoading(false);
      } catch (err) {
        setError('Error fetching patient details');
        setLoading(false);
        console.error(err);
      }
    };
    fetchPatient();
  }, [id]);
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this patient?')) {
      try {
        await patientService.delete(id);
        navigate('/patients');
      } catch (err) {
        setError('Error deleting patient');
        console.error(err);
      }
    }
  };
  if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!patient) return <div className="alert alert-warning">Patient not found</div>;
  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h3>{patient.first_name} {patient.last_name}</h3>
          <div>
            <Link to={`/patients/edit/${patient.id}`} className="btn btn-warning me-2">Edit</Link>
            <button onClick={handleDelete} className="btn btn-danger">Delete</button>
          </div>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h5 className="card-title">Personal Information</h5>
              <p><strong>Date of Birth:</strong> {patient.date_of_birth}</p>
              <p><strong>Gender:</strong> {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}</p>
              <p><strong>Email:</strong> {patient.email}</p>
              <p><strong>Phone:</strong> {patient.phone_number}</p>
              <p><strong>Address:</strong> {patient.address}</p>
            </div>
            <div className="col-md-6">
              <h5 className="card-title">Medical Information</h5>
              <p><strong>Blood Group:</strong> {patient.blood_group || 'Not specified'}</p>
              <p><strong>Allergies:</strong> {patient.allergies || 'None'}</p>
              <div>
                <strong>Medical History:</strong>
                <p className="mt-2">{patient.medical_history || 'No medical history recorded'}</p>
              </div>
            </div>
          </div>
          <div className="row mt-3">
            <div className="col-md-6">
              <h5 className="card-title">Emergency Contact</h5>
              <p><strong>Name:</strong> {patient.emergency_contact_name || 'Not provided'}</p>
              <p><strong>Phone:</strong> {patient.emergency_contact_number || 'Not provided'}</p>
            </div>
          </div>
        </div>
        <div className="card-footer">
          <Link to="/patients" className="btn btn-secondary">Back to Patients</Link>
        </div>
      </div>
    </div>
  );
};
export default PatientDetail;
