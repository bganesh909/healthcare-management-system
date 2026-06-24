import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    const result = await authService.forgotPassword(email);
    setLoading(false);
    if (result.success) {
      setSuccess(result.message);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-5">
          <div className="card shadow auth-card">
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <i className="fas fa-key text-primary" style={{ fontSize: '2.5rem' }}></i>
                <h3 className="mt-2">Forgot Password</h3>
                <p className="text-muted">Enter your email to receive a reset link</p>
              </div>
              {error && <div className="alert alert-danger">{error}</div>}
              {success && (
                <div className="alert alert-success">
                  {success}
                  <br />
                  <small className="text-muted">Check the Django server console for the reset link.</small>
                </div>
              )}
              {!success && (
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="fas fa-envelope"></i></span>
                      <input
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your registered email"
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary w-100 btn-rounded" disabled={loading}>
                    {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              )}
              <div className="text-center mt-3">
                <p className="mb-0">
                  Remember your password? <Link to="/login">Sign In</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
