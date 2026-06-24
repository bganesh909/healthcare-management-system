import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { departmentService, wardService } from '../../services/api';

const DepartmentDetail = () => {
  const [department, setDepartment] = useState(null);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptResponse, wardsResponse] = await Promise.all([
          departmentService.get(id),
          wardService.getAll({ department: id }),
        ]);
        setDepartment(deptResponse.data);
        setWards(wardsResponse.data);
        setLoading(false);
      } catch (err) {
        setError('Error fetching department details');
        setLoading(false);
        console.error(err);
      }
    };
    fetchData();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        await departmentService.delete(id);
        navigate('/departments');
      } catch (err) {
        setError('Error deleting department');
        console.error(err);
      }
    }
  };

  const getTotalBeds = () => wards.reduce((sum, w) => sum + (w.total_beds || 0), 0);
  const getAvailableBeds = () => wards.reduce((sum, w) => sum + (w.available_beds || 0), 0);
  const getOccupiedBeds = () => getTotalBeds() - getAvailableBeds();

  if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!department) return <div className="alert alert-warning">Department not found</div>;

  return (
    <div className="container mt-4">
      <div className="card mb-4">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h3 className="mb-0">{department.name}</h3>
          <div>
            <Link to={`/departments/edit/${department.id}`} className="btn btn-warning me-2">Edit</Link>
            <button onClick={handleDelete} className="btn btn-danger">Delete</button>
          </div>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h5>Department Information</h5>
              <p><strong>Code:</strong> {department.code}</p>
              <p><strong>Description:</strong> {department.description || 'No description available'}</p>
              <p>
                <strong>Head Doctor:</strong>{' '}
                {department.head_doctor_name || (department.head_doctor ? `Dr. ${department.head_doctor.first_name} ${department.head_doctor.last_name}` : 'Not assigned')}
              </p>
              <p><strong>Status:</strong>{' '}
                <span className={`badge ${department.is_active ? 'bg-success' : 'bg-secondary'}`}>
                  {department.is_active ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
            <div className="col-md-6">
              <h5>Contact Information</h5>
              <p><strong>Phone:</strong> {department.phone || 'N/A'}</p>
              <p><strong>Email:</strong> {department.email || 'N/A'}</p>
              <p><strong>Floor:</strong> {department.floor || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bed Status Overview */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card text-center border-primary">
            <div className="card-body">
              <h5 className="card-title text-primary">Total Beds</h5>
              <h2>{getTotalBeds()}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-center border-success">
            <div className="card-body">
              <h5 className="card-title text-success">Available</h5>
              <h2>{getAvailableBeds()}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-center border-danger">
            <div className="card-body">
              <h5 className="card-title text-danger">Occupied</h5>
              <h2>{getOccupiedBeds()}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Wards Table */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Wards</h5>
          <Link to={`/departments/${id}/beds`} className="btn btn-sm btn-outline-primary">
            Manage Beds
          </Link>
        </div>
        <div className="card-body">
          {wards.length === 0 ? (
            <div className="alert alert-info mb-0">No wards found for this department</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-primary">
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Floor</th>
                    <th>Total Beds</th>
                    <th>Available Beds</th>
                  </tr>
                </thead>
                <tbody>
                  {wards.map((ward) => (
                    <tr key={ward.id}>
                      <td>{ward.name}</td>
                      <td>{ward.ward_type_display || ward.ward_type || 'N/A'}</td>
                      <td>{ward.floor || 'N/A'}</td>
                      <td>{ward.total_beds || 0}</td>
                      <td>
                        <span className={`badge ${(ward.available_beds || 0) > 0 ? 'bg-success' : 'bg-danger'}`}>
                          {ward.available_beds || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <Link to="/departments" className="btn btn-secondary">Back to Departments</Link>
      </div>
    </div>
  );
};

export default DepartmentDetail;
