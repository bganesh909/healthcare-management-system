import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { prescriptionService } from '../../services/api';

const PrescriptionDetail = () => {
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPrescription = async () => {
      try {
        const response = await prescriptionService.get(id);
        setPrescription(response.data);
        setLoading(false);
      } catch (err) {
        setError('Error fetching prescription details');
        setLoading(false);
        console.error(err);
      }
    };
    fetchPrescription();
  }, [id]);

  const handleDownloadPdf = async () => {
    try {
      const response = await prescriptionService.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prescription_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download PDF');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this prescription?')) {
      try {
        await prescriptionService.delete(id);
        navigate('/prescriptions');
      } catch (err) {
        setError('Error deleting prescription');
        console.error(err);
      }
    }
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;
  if (error) return <div className="container mt-4"><div className="alert alert-danger">{error}</div></div>;
  if (!prescription) return <div className="container mt-4"><div className="alert alert-warning">Prescription not found</div></div>;

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h3><i className="fas fa-prescription me-2"></i>Prescription Details</h3>
          <div>
            <button className="btn btn-danger me-2" onClick={handleDownloadPdf}>
              <i className="fas fa-file-pdf me-2"></i>Download PDF
            </button>
            <Link to={`/prescriptions/edit/${prescription.id}`} className="btn btn-warning me-2">
              <i className="fas fa-edit me-1"></i>Edit
            </Link>
            <button onClick={handleDelete} className="btn btn-danger">
              <i className="fas fa-trash me-1"></i>Delete
            </button>
          </div>
        </div>
        <div className="card-body">
          {/* Prescription Info */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="card-title">Patient Information</h5>
                </div>
                <div className="card-body">
                  <p><strong>Name:</strong> {
                    prescription.patient_name ||
                    `${prescription.patient?.first_name || ''} ${prescription.patient?.last_name || ''}`
                  }</p>
                  {prescription.patient?.email && (
                    <p><strong>Email:</strong> {prescription.patient.email}</p>
                  )}
                  {prescription.patient?.phone_number && (
                    <p><strong>Phone:</strong> {prescription.patient.phone_number}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="card-title">Doctor Information</h5>
                </div>
                <div className="card-body">
                  <p><strong>Name:</strong> Dr. {
                    prescription.doctor_name ||
                    `${prescription.doctor?.first_name || ''} ${prescription.doctor?.last_name || ''}`
                  }</p>
                  {prescription.doctor?.specialization_display && (
                    <p><strong>Specialization:</strong> {prescription.doctor.specialization_display}</p>
                  )}
                  {prescription.doctor?.email && (
                    <p><strong>Email:</strong> {prescription.doctor.email}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Diagnosis and Notes */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title">Prescription Information</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <p><strong>Date:</strong> {prescription.date_prescribed || prescription.created_at?.split('T')[0]}</p>
                  <p><strong>Follow-up Date:</strong> {prescription.follow_up_date || 'Not scheduled'}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Diagnosis:</strong></p>
                  <p>{prescription.diagnosis || 'N/A'}</p>
                </div>
              </div>
              {prescription.notes && (
                <div className="mt-3">
                  <p><strong>Notes:</strong></p>
                  <p>{prescription.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Prescription Items (Medicines) */}
          <div className="card">
            <div className="card-header">
              <h5 className="card-title"><i className="fas fa-pills me-2"></i>Medicines</h5>
            </div>
            <div className="card-body">
              {prescription.items && prescription.items.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-striped table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Medicine Name</th>
                        <th>Dosage</th>
                        <th>Frequency</th>
                        <th>Duration</th>
                        <th>Instructions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescription.items.map((item, index) => (
                        <tr key={item.id || index}>
                          <td>{item.medicine_name}</td>
                          <td>{item.dosage}</td>
                          <td>{item.frequency}</td>
                          <td>{item.duration}</td>
                          <td>{item.instructions || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="alert alert-info mb-0">No medicines listed</div>
              )}
            </div>
          </div>
        </div>
        <div className="card-footer">
          <Link to="/prescriptions" className="btn btn-secondary">
            <i className="fas fa-arrow-left me-1"></i>Back to Prescriptions
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionDetail;
