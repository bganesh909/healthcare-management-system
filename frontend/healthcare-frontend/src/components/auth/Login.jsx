import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleGoogleResponse = useCallback(async (response) => {
    setError('');
    setGoogleLoading(true);
    const result = await googleLogin(response.credential);
    setGoogleLoading(false);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
  }, [googleLogin, navigate]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const loadGoogleScript = () => {
      if (document.getElementById('google-signin-script')) return;
      const script = document.createElement('script');
      script.id = 'google-signin-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
          });
          window.google.accounts.id.renderButton(
            document.getElementById('google-signin-btn'),
            {
              theme: 'outline',
              size: 'large',
              width: '100%',
              text: 'signin_with',
              shape: 'pill',
            }
          );
          setGoogleScriptLoaded(true);
        }
      };
      script.onerror = () => {
        setGoogleScriptLoaded(false);
      };
      document.body.appendChild(script);
    };

    loadGoogleScript();
  }, [handleGoogleResponse]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate('/');
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
                <i className="fas fa-heartbeat text-primary" style={{ fontSize: '2.5rem' }}></i>
                <h3 className="mt-2">Welcome Back</h3>
                <p className="text-muted">Sign in to Healthcare System</p>
              </div>
              {error && <div className="alert alert-danger">{error}</div>}

              {/* Google Sign-In */}
              <div className="mb-3">
                {googleLoading ? (
                  <button className="btn btn-outline-secondary w-100 btn-rounded" disabled>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Signing in with Google...
                  </button>
                ) : (
                  <>
                    {GOOGLE_CLIENT_ID && (
                      <div id="google-signin-btn" className="d-flex justify-content-center" style={googleScriptLoaded ? {} : { display: 'none' }}></div>
                    )}
                    {!googleScriptLoaded && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary w-100 btn-rounded d-flex align-items-center justify-content-center gap-2"
                        onClick={() => {
                          if (window.google) {
                            window.google.accounts.id.prompt();
                          } else {
                            setError('Google sign-in is unavailable. Please try again later or sign in with email.');
                          }
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                          <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                        Continue with Google
                      </button>
                    )}
                  </>
                )}
              </div>
              <div className="d-flex align-items-center mb-3">
                <hr className="flex-grow-1" />
                <span className="px-3 text-muted" style={{ fontSize: '0.85rem' }}>or sign in with email</span>
                <hr className="flex-grow-1" />
              </div>

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
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <div className="input-group">
                    <span className="input-group-text"><i className="fas fa-lock"></i></span>
                    <input
                      type="password"
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-100 btn-rounded" disabled={loading}>
                  {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
              <div className="text-center mt-3">
                <p className="mb-1">
                  <Link to="/forgot-password">Forgot Password?</Link>
                </p>
                <p className="mb-0">
                  Don't have an account? <Link to="/register">Register</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
