import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { departmentService } from '../../services/api';

const DepartmentList = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      const response = await departmentService.getAll(params);
      setDepartments(response.data);
      setPagination({ next: response.next, previous: response.previous, count: response.count });
      setLoading(false);
    } catch (err) {
      setError('Error fetching departments');
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Departments</h2>
        <Link to="/departments/add" className="btn btn-primary">
          Add Department
        </Link>
      </div>

      {/* Search */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <form onSubmit={handleSearch}>
            <div className="row g-3">
              <div className="col-md-10">
                <div className="input-group">
                  <span className="input-group-text"><i className="fas fa-search"></i></span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by department name..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>
              </div>
              <div className="col-md-2">
                <button type="button" className="btn btn-outline-secondary w-100" onClick={() => { setSearch(''); setPage(1); }}>
                  Clear
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center mt-5"><div className="spinner-border"></div></div>
      ) : departments.length === 0 ? (
        <div className="alert alert-info">No departments found</div>
      ) : (
        <>
          <div className="row row-cols-1 row-cols-md-3 g-4">
            {departments.map((dept) => (
              <div key={dept.id} className="col">
                <div className="card h-100">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">{dept.name}</h5>
                    <span className={`badge ${dept.is_active ? 'bg-success' : 'bg-secondary'}`}>
                      {dept.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="card-body">
                    <p className="card-text"><strong>Code:</strong> {dept.code}</p>
                    <p className="card-text">
                      <strong>Head Doctor:</strong>{' '}
                      {dept.head_doctor_name || (dept.head_doctor ? `Dr. ${dept.head_doctor.first_name} ${dept.head_doctor.last_name}` : 'Not assigned')}
                    </p>
                    <p className="card-text"><strong>Floor:</strong> {dept.floor || 'N/A'}</p>
                  </div>
                  <div className="card-footer">
                    <div className="d-flex justify-content-between">
                      <Link to={`/departments/${dept.id}`} className="btn btn-sm btn-info">
                        View Details
                      </Link>
                      <Link to={`/departments/${dept.id}/wards`} className="btn btn-sm btn-outline-primary">
                        View Wards
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {(pagination.previous || pagination.next) && (
            <nav className="mt-4">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${!pagination.previous ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => p - 1)}>Previous</button>
                </li>
                <li className="page-item disabled">
                  <span className="page-link">Page {page} ({pagination.count} total)</span>
                </li>
                <li className={`page-item ${!pagination.next ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => p + 1)}>Next</button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  );
};

export default DepartmentList;
