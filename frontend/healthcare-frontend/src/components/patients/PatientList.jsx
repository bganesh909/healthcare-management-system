import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { patientService } from '../../services/api';
const PatientList = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    gender: '',
    blood_group: '',
  });
  useEffect(() => {
    fetchPatients();
  }, [currentPage, filters]);
  const fetchPatients = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        search: searchQuery,
        ...filters,
      };
      const response = await patientService.getAll(params);
      setPatients(response.data);
      setPagination({
        count: response.count,
        next: response.next,
        previous: response.previous,
      });
      setLoading(false);
    } catch (err) {
      setError('Error fetching patients');
      setLoading(false);
      console.error(err);
    }
  };
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this patient?')) {
      try {
        await patientService.delete(id);
        fetchPatients(); // Fetch updated list after delete
      } catch (err) {
        setError('Error deleting patient');
        console.error(err);
      }
    }
  };
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
    fetchPatients();
  };
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  if (loading && patients.length === 0) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;
  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Patients</h2>
        <Link to="/patients/add" className="btn btn-primary">
          Add Patient
        </Link>
      </div>
      {}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <form onSubmit={handleSearch}>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search patients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className="btn btn-outline-primary" type="submit">Search</button>
                </div>
              </form>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                name="gender"
                value={filters.gender}
                onChange={handleFilterChange}
              >
                <option value="">All Genders</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                name="blood_group"
                value={filters.blood_group}
                onChange={handleFilterChange}
              >
                <option value="">All Blood Groups</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {patients.length === 0 ? (
        <div className="alert alert-info">No patients found</div>
      ) : (
        <div>
          <table className="table table-striped table-hover">
            <thead className="table-primary">
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td>{patient.id}</td>
                  <td>{patient.first_name} {patient.last_name}</td>
                  <td>{patient.email}</td>
                  <td>{patient.phone_number}</td>
                  <td>
                    <Link to={`/patients/${patient.id}`} className="btn btn-sm btn-info me-2">
                      View
                    </Link>
                    <Link to={`/patients/edit/${patient.id}`} className="btn btn-sm btn-warning me-2">
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(patient.id)}
                      className="btn btn-sm btn-danger"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {}
          {pagination.count > 0 && (
            <nav aria-label="Patient list pagination">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${!pagination.previous ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.previous}
                  >
                    Previous
                  </button>
                </li>
                <li className="page-item active">
                  <span className="page-link">{currentPage}</span>
                </li>
                <li className={`page-item ${!pagination.next ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.next}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      )}
    </div>
  );
};
export default PatientList;
