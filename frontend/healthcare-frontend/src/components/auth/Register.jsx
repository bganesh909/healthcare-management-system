import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    confirm_password: '',
    role: 'patient',
    phone_number: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await register(formData);
    setLoading(false);

    if (result.success) {
      navigate('/login', { state: { message: 'Registration successful! Please sign in.' } });
    } else {
      if (typeof result.error === 'object') {
        setFieldErrors(result.error);
      } else {
        setError(result.error);
      }
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow auth-card">
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <i className="fas fa-user-plus text-primary" style={{ fontSize: '2.5rem' }}></i>
                <h3 className="mt-2">Create Account</h3>
                <p className="text-muted">Join the Healthcare System</p>
              </div>
              {error && <div className="alert alert-danger">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      className={`form-control ${fieldErrors.first_name ? 'is-invalid' : ''}`}
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                    />
                    {fieldErrors.first_name && <div className="invalid-feedback">{fieldErrors.first_name}</div>}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      className={`form-control ${fieldErrors.last_name ? 'is-invalid' : ''}`}
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      required
                    />
                    {fieldErrors.last_name && <div className="invalid-feedback">{fieldErrors.last_name}</div>}
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`}
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
                </div>
                <div className="mb-3">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-control"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Role</label>
                  <select className="form-select" name="role" value={formData.role} onChange={handleChange}>
                    <option value="patient">Patient</option>
                    <option value="doctor">Doctor</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className={`form-control ${fieldErrors.password ? 'is-invalid' : ''}`}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                    {fieldErrors.password && <div className="invalid-feedback">{fieldErrors.password}</div>}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Confirm Password</label>
                    <input
                      type="password"
                      className="form-control"
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-100 btn-rounded" disabled={loading}>
                  {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
                  {loading ? 'Creating Account...' : 'Register'}
                </button>
              </form>
              <div className="text-center mt-3">
                <p className="mb-0">
                  Already have an account? <Link to="/login">Sign In</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
