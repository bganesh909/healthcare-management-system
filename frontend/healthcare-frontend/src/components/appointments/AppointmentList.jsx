import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { appointmentService } from '../../services/api';
const AppointmentList = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await appointmentService.getAll();
        setAppointments(response.data);
        setLoading(false);
      } catch (err) {
        setError('Error fetching appointments');
        setLoading(false);
        console.error(err);
      }
    };
    fetchAppointments();
  }, []);
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        await appointmentService.delete(id);
        setAppointments(appointments.filter(appointment => appointment.id !== id));
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
  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Appointments</h2>
        <Link to="/appointments/add" className="btn btn-primary">
          Schedule Appointment
        </Link>
      </div>
      {appointments.length === 0 ? (
        <div className="alert alert-info">No appointments found</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-primary">
              <tr>
                <th>ID</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td>{appointment.id}</td>
                  <td>{appointment.patient.first_name} {appointment.patient.last_name}</td>
                  <td>Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}</td>
                  <td>{appointment.appointment_date}</td>
                  <td>{appointment.appointment_time}</td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(appointment.status)}`}>
                      {appointment.status_display}
                    </span>
                  </td>
                  <td>
                    <Link to={`/appointments/${appointment.id}`} className="btn btn-sm btn-info me-2">
                      View
                    </Link>
                    <Link to={`/appointments/edit/${appointment.id}`} className="btn btn-sm btn-warning me-2">
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(appointment.id)}
                      className="btn btn-sm btn-danger"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default AppointmentList;
