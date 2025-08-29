import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { appointmentService } from '../../services/api';
const AppointmentDetail = () => {
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const response = await appointmentService.get(id);
        setAppointment(response.data);
        setLoading(false);
      } catch (err) {
        setError('Error fetching appointment details');
        setLoading(false);
        console.error(err);
      }
    };
    fetchAppointment();
  }, [id]);
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        await appointmentService.delete(id);
        navigate('/appointments');
      } catch (err) {
        setError('Error deleting appointment');
        console.error(err);
      }
    }
  };
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-primary';
      case 'COMPLETED':
        return 'bg-success';
      case 'CANCELLED':
        return 'bg-danger';
      case 'NO_SHOW':
        return 'bg-warning';
      default:
        return 'bg-secondary';
    }
  };
  if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!appointment) return <div className="alert alert-warning">Appointment not found</div>;
  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h3>Appointment Details</h3>
          <div>
            <Link to={`/appointments/edit/${appointment.id}`} className="btn btn-warning me-2">Edit</Link>
            <button onClick={handleDelete} className="btn btn-danger">Delete</button>
          </div>
        </div>
        <div className="card-body">
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="card-title">Patient Information</h5>
                </div>
                <div className="card-body">
                  <p><strong>Name:</strong> {appointment.patient.first_name} {appointment.patient.last_name}</p>
                  <p><strong>Email:</strong> {appointment.patient.email}</p>
                  <p><strong>Phone:</strong> {appointment.patient.phone_number}</p>
                  <Link to={`/patients/${appointment.patient.id}`} className="btn btn-sm btn-outline-primary">
                    View Patient Details
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="card-title">Doctor Information</h5>
                </div>
                <div className="card-body">
                  <p><strong>Name:</strong> Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}</p>
                  <p><strong>Specialization:</strong> {appointment.doctor.specialization_display}</p>
                  <p><strong>Email:</strong> {appointment.doctor.email}</p>
                  <Link to={`/doctors/${appointment.doctor.id}`} className="btn btn-sm btn-outline-primary">
                    View Doctor Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h5 className="card-title">Appointment Details</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <p><strong>Date:</strong> {appointment.appointment_date}</p>
                  <p><strong>Time:</strong> {appointment.appointment_time}</p>
                  <p>
                    <strong>Status:</strong> 
                    <span className={`badge ms-2 ${getStatusBadgeClass(appointment.status)}`}>
                      {appointment.status_display}
                    </span>
                  </p>
                </div>
                <div className="col-md-6">
                  <p><strong>Reason for Visit:</strong> {appointment.reason}</p>
                  <p><strong>Notes:</strong> {appointment.notes || 'No notes available'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="card-footer">
          <Link to="/appointments" className="btn btn-secondary">Back to Appointments</Link>
        </div>
      </div>
    </div>
  );
};
export default AppointmentDetail;
