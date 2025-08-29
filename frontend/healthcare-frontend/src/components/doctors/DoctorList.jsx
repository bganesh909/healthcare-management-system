import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doctorService } from '../../services/api';
const DoctorList = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await doctorService.getAll();
        setDoctors(response.data);
        setLoading(false);
      } catch (err) {
        setError('Error fetching doctors');
        setLoading(false);
        console.error(err);
      }
    };
    fetchDoctors();
  }, []);
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this doctor?')) {
      try {
        await doctorService.delete(id);
        setDoctors(doctors.filter(doctor => doctor.id !== id));
      } catch (err) {
        setError('Error deleting doctor');
        console.error(err);
      }
    }
  };
  if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Doctors</h2>
        <Link to="/doctors/add" className="btn btn-primary">
          Add Doctor
        </Link>
      </div>
      {doctors.length === 0 ? (
        <div className="alert alert-info">No doctors found</div>
      ) : (
        <div className="row row-cols-1 row-cols-md-3 g-4">
          {doctors.map((doctor) => (
            <div key={doctor.id} className="col">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="card-title">Dr. {doctor.first_name} {doctor.last_name}</h5>
                </div>
                <div className="card-body">
                  <h6 className="card-subtitle mb-2 text-muted">{doctor.specialization_display}</h6>
                  <p className="card-text">Experience: {doctor.experience_years} years</p>
                  <p className="card-text">Consultation Fee: ${doctor.consultation_fee}</p>
                </div>
                <div className="card-footer">
                  <div className="d-flex justify-content-between">
                    <Link to={`/doctors/${doctor.id}`} className="btn btn-sm btn-info">
                      View Details
                    </Link>
                    <div>
                      <Link to={`/doctors/edit/${doctor.id}`} className="btn btn-sm btn-warning me-2">
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(doctor.id)}
                        className="btn btn-sm btn-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default DoctorList;
