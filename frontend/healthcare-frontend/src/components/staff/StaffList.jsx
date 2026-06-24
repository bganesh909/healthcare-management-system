import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { staffService, departmentService } from '../../services/api';

const ROLES = [
  { value: '', label: 'All Roles' },
  { value: 'NURSE', label: 'Nurse' },
  { value: 'TECHNICIAN', label: 'Technician' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
  { value: 'LAB_TECHNICIAN', label: 'Lab Technician' },
  { value: 'RADIOLOGIST', label: 'Radiologist' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
  { value: 'HOUSEKEEPING', label: 'Housekeeping' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'OTHER', label: 'Other' },
];

const ROLE_BADGES = {
  NURSE: 'bg-primary',
  TECHNICIAN: 'bg-purple',
  RECEPTIONIST: 'bg-success',
  PHARMACIST: 'bg-info',
  LAB_TECHNICIAN: 'bg-warning text-dark',
  RADIOLOGIST: 'bg-dark',
  ADMIN: 'bg-danger',
  ACCOUNTANT: 'bg-secondary',
  HOUSEKEEPING: 'bg-light text-dark',
  SECURITY: 'bg-dark',
  OTHER: 'bg-secondary',
};

const StaffList = () => {
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    first_name: '',
    last_name: '',
    role: 'NURSE',
    department: '',
    phone: '',
    email: '',
    shift: 'DAY',
  });

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      if (filterDepartment) params.department = filterDepartment;
      const response = await staffService.getAll(params);
      setStaff(response.data || []);
      setPagination({ next: response.next, previous: response.previous, count: response.count });
      setLoading(false);
    } catch (err) {
      setError('Error fetching staff members');
      setLoading(false);
    }
  }, [page, search, filterRole, filterDepartment]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const res = await departmentService.getAll({ page_size: 100 });
        setDepartments(res.data || []);
      } catch {
        // Non-critical
      }
    };
    loadDepartments();
  }, []);

  const clearFilters = () => {
    setSearch('');
    setFilterRole('');
    setFilterDepartment('');
    setPage(1);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await staffService.delete(id);
        setStaff(staff.filter(s => s.id !== id));
      } catch {
        setError('Error deleting staff member');
      }
    }
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...formData };
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') delete payload[key];
      });
      await staffService.create(payload);
      setShowForm(false);
      setFormData({
        employee_id: '', first_name: '', last_name: '', role: 'NURSE',
        department: '', phone: '', email: '', shift: 'DAY',
      });
      fetchStaff();
      setSubmitting(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error adding staff member');
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE': return 'bg-success';
      case 'ON_LEAVE': return 'bg-warning text-dark';
      case 'INACTIVE': return 'bg-danger';
      case 'TERMINATED': return 'bg-dark';
      default: return 'bg-secondary';
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-users-cog me-2"></i>Staff Members</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <i className="fas fa-plus me-2"></i>Add Staff
        </button>
      </div>

      {/* Filters */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text"><i className="fas fa-search"></i></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, employee ID..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={filterRole} onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}>
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={filterDepartment} onChange={(e) => { setFilterDepartment(e.target.value); setPage(1); }}>
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-outline-secondary w-100" onClick={clearFilters}>Clear</button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {loading ? (
        <div className="text-center mt-5"><div className="spinner-border"></div></div>
      ) : staff.length === 0 ? (
        <div className="alert alert-info">No staff members found</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="table-primary">
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Shift</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id}>
                    <td><strong>{member.employee_id || '--'}</strong></td>
                    <td>{member.first_name} {member.last_name}</td>
                    <td>
                      <span className={`badge ${ROLE_BADGES[member.role] || 'bg-secondary'}`}
                            style={member.role === 'TECHNICIAN' ? { backgroundColor: '#6f42c1' } : {}}>
                        {member.role_display || member.role?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{member.department_name || (member.department && member.department.name) || '--'}</td>
                    <td>
                      <i className={`fas fa-${member.shift === 'NIGHT' ? 'moon' : member.shift === 'EVENING' ? 'cloud-sun' : 'sun'} me-1`}></i>
                      {member.shift_display || member.shift || '--'}
                    </td>
                    <td>{member.phone || '--'}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(member.status)}`}>
                        {member.status_display || member.status || 'Active'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/staff/${member.id}`} className="btn btn-sm btn-info me-1" title="View">
                        <i className="fas fa-eye"></i>
                      </Link>
                      <button onClick={() => handleDelete(member.id)} className="btn btn-sm btn-danger" title="Delete">
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(pagination.previous || pagination.next) && (
            <nav className="mt-3">
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

      {/* Add Staff Modal */}
      {showForm && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="fas fa-user-plus me-2"></i>Add Staff Member</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowForm(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Employee ID</label>
                      <input type="text" className="form-control" name="employee_id" value={formData.employee_id} onChange={handleFormChange} placeholder="e.g. EMP-001" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">First Name *</label>
                      <input type="text" className="form-control" name="first_name" value={formData.first_name} onChange={handleFormChange} required />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Last Name *</label>
                      <input type="text" className="form-control" name="last_name" value={formData.last_name} onChange={handleFormChange} required />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Role *</label>
                      <select className="form-select" name="role" value={formData.role} onChange={handleFormChange} required>
                        {ROLES.filter(r => r.value).map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Department</label>
                      <select className="form-select" name="department" value={formData.department} onChange={handleFormChange}>
                        <option value="">-- Select Department --</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Shift</label>
                      <select className="form-select" name="shift" value={formData.shift} onChange={handleFormChange}>
                        <option value="DAY">Day</option>
                        <option value="EVENING">Evening</option>
                        <option value="NIGHT">Night</option>
                        <option value="ROTATING">Rotating</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone</label>
                      <input type="text" className="form-control" name="phone" value={formData.phone} onChange={handleFormChange} placeholder="+1-XXX-XXX-XXXX" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input type="email" className="form-control" name="email" value={formData.email} onChange={handleFormChange} placeholder="staff@hospital.com" />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                    ) : (
                      <><i className="fas fa-save me-2"></i>Save</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;
