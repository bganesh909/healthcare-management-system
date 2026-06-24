import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';

const ResetPassword = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const result = await authService.resetPassword(uid, token, newPassword, confirmPassword);
    setLoading(false);

    if (result.success) {
      setSuccess(result.message);
      setTimeout(() => navigate('/login'), 3000);
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
                <i className="fas fa-lock-open text-primary" style={{ fontSize: '2.5rem' }}></i>
                <h3 className="mt-2">Reset Password</h3>
                <p className="text-muted">Enter your new password</p>
              </div>
              {error && <div className="alert alert-danger">{error}</div>}
              {success && (
                <div className="alert alert-success">
                  {success}
                  <br />
                  <small>Redirecting to login page...</small>
                </div>
              )}
              {!success && (
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">New Password</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="fas fa-lock"></i></span>
                      <input
                        type="password"
                        className="form-control"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Confirm New Password</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="fas fa-lock"></i></span>
                      <input
                        type="password"
                        className="form-control"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary w-100 btn-rounded" disabled={loading}>
                    {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              )}
              <div className="text-center mt-3">
                <p className="mb-0">
                  <Link to="/login">Back to Sign In</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
