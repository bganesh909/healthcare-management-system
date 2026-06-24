import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { bloodBankService } from '../../services/api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const getStockColor = (units) => {
  if (units < 5) return 'danger';
  if (units <= 15) return 'warning';
  return 'success';
};

const getStockIcon = (units) => {
  if (units < 5) return 'fa-exclamation-triangle';
  if (units <= 15) return 'fa-exclamation-circle';
  return 'fa-check-circle';
};

const BloodBankDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stockSummary, setStockSummary] = useState({});
  const [pendingRequests, setPendingRequests] = useState([]);
  const [recentDonations, setRecentDonations] = useState([]);
  const [expiringSoon, setExpiringSoon] = useState([]);
  const [showDonorForm, setShowDonorForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [donorForm, setDonorForm] = useState({
    name: '', blood_group: 'O+', phone: '', email: '', date_of_birth: '',
  });
  const [unitForm, setUnitForm] = useState({
    blood_group: 'O+', donor: '', collection_date: '', expiry_date: '', volume_ml: '450',
  });
  const [requestForm, setRequestForm] = useState({
    patient_name: '', blood_group: 'O+', units_needed: '1', priority: 'ROUTINE', reason: '',
  });

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        bloodBankService.getStockSummary(),
        bloodBankService.getRequests({ status: 'PENDING' }),
        bloodBankService.getDonors({ page_size: 10 }),
        bloodBankService.getExpiringSoon(),
      ]);

      // Stock summary
      if (results[0].status === 'fulfilled') {
        const stockData = results[0].value.data;
        if (Array.isArray(stockData)) {
          const summary = {};
          stockData.forEach(item => { summary[item.blood_group] = item.available_units || item.count || 0; });
          setStockSummary(summary);
        } else {
          setStockSummary(stockData || {});
        }
      }

      // Pending requests
      if (results[1].status === 'fulfilled') {
        setPendingRequests(results[1].value.data || []);
      }

      // Recent donors (as proxy for donations)
      if (results[2].status === 'fulfilled') {
        setRecentDonations(results[2].value.data || []);
      }

      // Expiring soon
      if (results[3].status === 'fulfilled') {
        const expData = results[3].value.data;
        setExpiringSoon(Array.isArray(expData) ? expData : expData?.results || []);
      }

      setLoading(false);
    } catch (err) {
      setError('Error loading blood bank dashboard');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleDonorSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await bloodBankService.createDonor(donorForm);
      setShowDonorForm(false);
      setDonorForm({ name: '', blood_group: 'O+', phone: '', email: '', date_of_birth: '' });
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error registering donor');
    }
    setSubmitting(false);
  };

  const handleUnitSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await bloodBankService.createUnit(unitForm);
      setShowUnitForm(false);
      setUnitForm({ blood_group: 'O+', donor: '', collection_date: '', expiry_date: '', volume_ml: '450' });
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error adding blood unit');
    }
    setSubmitting(false);
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await bloodBankService.createRequest(requestForm);
      setShowRequestForm(false);
      setRequestForm({ patient_name: '', blood_group: 'O+', units_needed: '1', priority: 'ROUTINE', reason: '' });
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error creating request');
    }
    setSubmitting(false);
  };

  const handleApproveRequest = async (id) => {
    try {
      await bloodBankService.approveRequest(id);
      fetchDashboardData();
    } catch {
      setError('Error approving request');
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center mt-5"><div className="spinner-border"></div></div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-tint me-2"></i>Blood Bank Dashboard</h2>
        <button className="btn btn-outline-primary" onClick={fetchDashboardData}>
          <i className="fas fa-sync-alt me-2"></i>Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        <button className="btn btn-success" onClick={() => setShowDonorForm(true)}>
          <i className="fas fa-user-plus me-2"></i>Register Donor
        </button>
        <button className="btn btn-primary" onClick={() => setShowUnitForm(true)}>
          <i className="fas fa-plus-circle me-2"></i>Add Blood Unit
        </button>
        <button className="btn btn-warning" onClick={() => setShowRequestForm(true)}>
          <i className="fas fa-hand-holding-medical me-2"></i>Create Request
        </button>
      </div>

      {/* Blood Stock Overview */}
      <div className="card shadow-sm mb-4">
        <div className="card-header">
          <h5 className="mb-0"><i className="fas fa-warehouse me-2"></i>Blood Stock Overview</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            {BLOOD_GROUPS.map(group => {
              const units = stockSummary[group] || 0;
              const color = getStockColor(units);
              const icon = getStockIcon(units);
              return (
                <div key={group} className="col-lg-3 col-md-4 col-sm-6">
                  <div className={`card border-${color} h-100`}>
                    <div className="card-body text-center">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h3 className="fw-bold text-danger mb-0">{group}</h3>
                        </div>
                        <div>
                          <h2 className={`fw-bold text-${color} mb-0`}>{units}</h2>
                          <small className="text-muted">units</small>
                        </div>
                      </div>
                      <div className="mt-2">
                        <i className={`fas ${icon} text-${color} me-1`}></i>
                        <small className={`text-${color}`}>
                          {units < 5 ? 'Critical' : units <= 15 ? 'Moderate' : 'Good'}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Pending Requests */}
        <div className="col-md-7">
          <div className="card shadow-sm h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0"><i className="fas fa-clipboard-list me-2"></i>Pending Requests</h5>
              <Link to="/blood-bank/requests" className="btn btn-sm btn-outline-primary">View All</Link>
            </div>
            <div className="card-body p-0">
              {pendingRequests.length === 0 ? (
                <div className="p-3 text-muted text-center">No pending requests</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Patient</th>
                        <th>Blood Group</th>
                        <th>Units</th>
                        <th>Priority</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRequests.slice(0, 5).map((req) => (
                        <tr key={req.id}>
                          <td>{req.patient_name || '--'}</td>
                          <td><span className="badge bg-danger">{req.blood_group}</span></td>
                          <td>{req.units_needed || req.units_requested || 1}</td>
                          <td>
                            <span className={`badge ${req.priority === 'STAT' || req.priority === 'EMERGENCY' ? 'bg-danger' : req.priority === 'URGENT' ? 'bg-warning text-dark' : 'bg-info'}`}>
                              {req.priority_display || req.priority}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-sm btn-success" onClick={() => handleApproveRequest(req.id)} title="Approve">
                              <i className="fas fa-check"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="col-md-5">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-warning text-dark">
              <h5 className="mb-0"><i className="fas fa-exclamation-triangle me-2"></i>Expiring Soon</h5>
            </div>
            <div className="card-body p-0">
              {expiringSoon.length === 0 ? (
                <div className="p-3 text-muted text-center">No units expiring soon</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Unit ID</th>
                        <th>Blood Group</th>
                        <th>Expiry Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringSoon.slice(0, 8).map((unit) => (
                        <tr key={unit.id}>
                          <td>{unit.unit_number || unit.id}</td>
                          <td><span className="badge bg-danger">{unit.blood_group}</span></td>
                          <td>
                            <span className="text-danger">
                              <i className="fas fa-clock me-1"></i>
                              {unit.expiry_date ? new Date(unit.expiry_date).toLocaleDateString() : '--'}
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
        </div>
      </div>

      {/* Recent Donations */}
      <div className="card shadow-sm mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0"><i className="fas fa-hand-holding-heart me-2"></i>Recent Donors</h5>
          <Link to="/blood-bank/donors" className="btn btn-sm btn-outline-primary">View All</Link>
        </div>
        <div className="card-body p-0">
          {recentDonations.length === 0 ? (
            <div className="p-3 text-muted text-center">No recent donors</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Donor Name</th>
                    <th>Blood Group</th>
                    <th>Phone</th>
                    <th>Last Donation</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDonations.slice(0, 5).map((donor) => (
                    <tr key={donor.id}>
                      <td>{donor.name || `${donor.first_name || ''} ${donor.last_name || ''}`}</td>
                      <td><span className="badge bg-danger">{donor.blood_group}</span></td>
                      <td>{donor.phone || '--'}</td>
                      <td>{donor.last_donation_date ? new Date(donor.last_donation_date).toLocaleDateString() : '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Register Donor Modal */}
      {showDonorForm && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title"><i className="fas fa-user-plus me-2"></i>Register Donor</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDonorForm(false)}></button>
              </div>
              <form onSubmit={handleDonorSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Name *</label>
                    <input type="text" className="form-control" value={donorForm.name} onChange={(e) => setDonorForm({ ...donorForm, name: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Blood Group *</label>
                    <select className="form-select" value={donorForm.blood_group} onChange={(e) => setDonorForm({ ...donorForm, blood_group: e.target.value })} required>
                      {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Phone</label>
                    <input type="text" className="form-control" value={donorForm.phone} onChange={(e) => setDonorForm({ ...donorForm, phone: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={donorForm.email} onChange={(e) => setDonorForm({ ...donorForm, email: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-control" value={donorForm.date_of_birth} onChange={(e) => setDonorForm({ ...donorForm, date_of_birth: e.target.value })} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowDonorForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success" disabled={submitting}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="fas fa-save me-2"></i>Register</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Blood Unit Modal */}
      {showUnitForm && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="fas fa-plus-circle me-2"></i>Add Blood Unit</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowUnitForm(false)}></button>
              </div>
              <form onSubmit={handleUnitSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Blood Group *</label>
                    <select className="form-select" value={unitForm.blood_group} onChange={(e) => setUnitForm({ ...unitForm, blood_group: e.target.value })} required>
                      {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Collection Date *</label>
                    <input type="date" className="form-control" value={unitForm.collection_date} onChange={(e) => setUnitForm({ ...unitForm, collection_date: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Expiry Date *</label>
                    <input type="date" className="form-control" value={unitForm.expiry_date} onChange={(e) => setUnitForm({ ...unitForm, expiry_date: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Volume (ml)</label>
                    <input type="number" className="form-control" value={unitForm.volume_ml} onChange={(e) => setUnitForm({ ...unitForm, volume_ml: e.target.value })} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowUnitForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="fas fa-save me-2"></i>Add Unit</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Request Modal */}
      {showRequestForm && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title"><i className="fas fa-hand-holding-medical me-2"></i>Create Blood Request</h5>
                <button type="button" className="btn-close" onClick={() => setShowRequestForm(false)}></button>
              </div>
              <form onSubmit={handleRequestSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Patient Name *</label>
                    <input type="text" className="form-control" value={requestForm.patient_name} onChange={(e) => setRequestForm({ ...requestForm, patient_name: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Blood Group *</label>
                    <select className="form-select" value={requestForm.blood_group} onChange={(e) => setRequestForm({ ...requestForm, blood_group: e.target.value })} required>
                      {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Units Needed *</label>
                    <input type="number" className="form-control" min="1" value={requestForm.units_needed} onChange={(e) => setRequestForm({ ...requestForm, units_needed: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Priority *</label>
                    <select className="form-select" value={requestForm.priority} onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })} required>
                      <option value="ROUTINE">Routine</option>
                      <option value="URGENT">Urgent</option>
                      <option value="EMERGENCY">Emergency</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Reason</label>
                    <textarea className="form-control" rows="3" value={requestForm.reason} onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowRequestForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-warning" disabled={submitting}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="fas fa-save me-2"></i>Create Request</>}
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

export default BloodBankDashboard;
