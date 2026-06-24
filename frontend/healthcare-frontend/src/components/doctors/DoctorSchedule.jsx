import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService, timeSlotService, doctorLeaveService } from '../../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_COLORS = { Monday: '#3498db', Tuesday: '#27ae60', Wednesday: '#e67e22', Thursday: '#8e44ad', Friday: '#e74c3c', Saturday: '#16a085', Sunday: '#95a5a6' };

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
};

const DoctorSchedule = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [doctorId, setDoctorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('slots');

  // Time Slots
  const [slots, setSlots] = useState([]);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [slotForm, setSlotForm] = useState({ day_of_week: 'Monday', start_time: '09:00', end_time: '17:00', slot_duration: 30, max_patients: 20 });
  const [slotSaving, setSlotSaving] = useState(false);
  const [slotMsg, setSlotMsg] = useState(null);

  // Leaves
  const [leaves, setLeaves] = useState([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ start_date: '', end_date: '', reason: '' });
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [leaveMsg, setLeaveMsg] = useState(null);

  useEffect(() => { if (!isAuthenticated) navigate('/login'); }, [isAuthenticated, navigate]);

  const loadData = useCallback(async () => {
    try {
      const profileRes = await authService.getProfile();
      const dId = profileRes.data.doctor_profile;
      setDoctorId(dId);
      if (!dId) { setLoading(false); return; }

      const [slotRes, leaveRes] = await Promise.allSettled([
        timeSlotService.getAll({ doctor: dId }),
        doctorLeaveService.getAll({ doctor: dId }),
      ]);
      if (slotRes.status === 'fulfilled') setSlots(slotRes.value.data || []);
      if (leaveRes.status === 'fulfilled') setLeaves(leaveRes.value.data || []);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // -- Time Slot CRUD --
  const handleCreateSlot = async (e) => {
    e.preventDefault();
    setSlotSaving(true);
    setSlotMsg(null);
    try {
      await timeSlotService.create({ ...slotForm, doctor: doctorId });
      setSlotMsg({ type: 'success', text: 'Time slot created!' });
      setShowSlotForm(false);
      setSlotForm({ day_of_week: 'Monday', start_time: '09:00', end_time: '17:00', slot_duration: 30, max_patients: 20 });
      loadData();
    } catch (err) {
      setSlotMsg({ type: 'danger', text: err.response?.data?.detail || 'Failed to create slot.' });
    }
    setSlotSaving(false);
  };

  const handleDeleteSlot = async (id) => {
    if (!window.confirm('Delete this time slot?')) return;
    try {
      await timeSlotService.delete(id);
      setSlots(slots.filter(s => s.id !== id));
    } catch { /* empty */ }
  };

  // -- Leave CRUD --
  const handleCreateLeave = async (e) => {
    e.preventDefault();
    setLeaveSaving(true);
    setLeaveMsg(null);
    try {
      await doctorLeaveService.create({ ...leaveForm, doctor: doctorId });
      setLeaveMsg({ type: 'success', text: 'Leave request submitted!' });
      setShowLeaveForm(false);
      setLeaveForm({ start_date: '', end_date: '', reason: '' });
      loadData();
    } catch (err) {
      setLeaveMsg({ type: 'danger', text: err.response?.data?.detail || 'Failed to submit leave.' });
    }
    setLeaveSaving(false);
  };

  const handleDeleteLeave = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      await doctorLeaveService.delete(id);
      setLeaves(leaves.filter(l => l.id !== id));
    } catch { /* empty */ }
  };

  if (loading) return <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary"></div></div>;

  if (!doctorId) {
    return (
      <div className="container mt-5 text-center">
        <i className="fas fa-user-md-slash fa-3x text-muted mb-3 d-block"></i>
        <h5 className="text-muted">No doctor profile linked to your account</h5>
        <Link to="/dashboard" className="btn btn-primary mt-3">Go to Dashboard</Link>
      </div>
    );
  }

  // Group slots by day
  const slotsByDay = {};
  DAYS.forEach(d => { slotsByDay[d] = slots.filter(s => s.day_of_week === d); });

  return (
    <div style={{ background: '#f4f6f9', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(135deg, #1a5276, #2980b9)', padding: '1.5rem 0', color: '#fff' }}>
        <div className="container">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h4 className="mb-0" style={{ fontWeight: 700 }}><i className="fas fa-calendar-cog me-2"></i>Manage Schedule</h4>
              <p className="mb-0" style={{ opacity: 0.85, fontSize: '0.88rem' }}>Configure your availability and leaves</p>
            </div>
            <Link to="/doctor-dashboard" className="btn btn-outline-light btn-sm" style={{ borderRadius: 8 }}>
              <i className="fas fa-arrow-left me-1"></i>Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="container py-4">
        {/* Tab Toggle */}
        <ul className="nav nav-pills mb-4 gap-2">
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'slots' ? 'active' : ''}`} style={{ borderRadius: 8 }} onClick={() => setActiveTab('slots')}>
              <i className="fas fa-clock me-1"></i>Time Slots
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'leaves' ? 'active' : ''}`} style={{ borderRadius: 8 }} onClick={() => setActiveTab('leaves')}>
              <i className="fas fa-plane-departure me-1"></i>Leave Management
            </button>
          </li>
        </ul>

        {/* ============ TIME SLOTS TAB ============ */}
        {activeTab === 'slots' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 style={{ fontWeight: 700, color: '#1a5276' }}>Weekly Schedule</h5>
              <button className="btn btn-primary btn-sm" style={{ borderRadius: 8 }} onClick={() => setShowSlotForm(!showSlotForm)}>
                <i className={`fas ${showSlotForm ? 'fa-times' : 'fa-plus'} me-1`}></i>{showSlotForm ? 'Cancel' : 'Add Slot'}
              </button>
            </div>

            {slotMsg && <div className={`alert alert-${slotMsg.type} py-2`}>{slotMsg.text}</div>}

            {/* Add Slot Form */}
            {showSlotForm && (
              <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
                <div className="card-body">
                  <h6 style={{ fontWeight: 700, color: '#1a5276' }}>Add New Time Slot</h6>
                  <form onSubmit={handleCreateSlot}>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Day of Week</label>
                        <select className="form-select" value={slotForm.day_of_week} onChange={e => setSlotForm({ ...slotForm, day_of_week: e.target.value })}>
                          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Start Time</label>
                        <input type="time" className="form-control" value={slotForm.start_time} onChange={e => setSlotForm({ ...slotForm, start_time: e.target.value })} required />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>End Time</label>
                        <input type="time" className="form-control" value={slotForm.end_time} onChange={e => setSlotForm({ ...slotForm, end_time: e.target.value })} required />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Slot Duration (min)</label>
                        <input type="number" className="form-control" min="5" max="120" value={slotForm.slot_duration} onChange={e => setSlotForm({ ...slotForm, slot_duration: parseInt(e.target.value) || 30 })} required />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Max Patients</label>
                        <input type="number" className="form-control" min="1" max="100" value={slotForm.max_patients} onChange={e => setSlotForm({ ...slotForm, max_patients: parseInt(e.target.value) || 20 })} required />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary mt-3" disabled={slotSaving} style={{ borderRadius: 8 }}>
                      {slotSaving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="fas fa-save me-1"></i>Save Slot</>}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Weekly Grid */}
            <div className="row g-3">
              {DAYS.map(day => {
                const daySlots = slotsByDay[day];
                const color = DAY_COLORS[day];
                return (
                  <div className="col-md-6 col-lg-4" key={day}>
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ height: 4, background: color }}></div>
                      <div className="card-body">
                        <h6 className="mb-2" style={{ fontWeight: 700, color }}>{day}</h6>
                        {daySlots.length === 0 ? (
                          <div className="text-muted text-center py-3" style={{ fontSize: '0.85rem' }}>
                            <i className="fas fa-moon d-block mb-1"></i>Day Off
                          </div>
                        ) : daySlots.map(slot => (
                          <div key={slot.id} className="d-flex justify-content-between align-items-center py-2 px-2 mb-2" style={{ background: '#f8f9fa', borderRadius: 8, fontSize: '0.85rem' }}>
                            <div>
                              <div style={{ fontWeight: 600 }}><i className="fas fa-clock me-1 text-muted"></i>{fmtTime(slot.start_time)} - {fmtTime(slot.end_time)}</div>
                              <div className="text-muted" style={{ fontSize: '0.78rem' }}>{slot.slot_duration} min slots &bull; Max {slot.max_patients} patients</div>
                            </div>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteSlot(slot.id)} style={{ borderRadius: 6, fontSize: '0.72rem' }}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============ LEAVES TAB ============ */}
        {activeTab === 'leaves' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 style={{ fontWeight: 700, color: '#1a5276' }}>Leave Requests</h5>
              <button className="btn btn-primary btn-sm" style={{ borderRadius: 8 }} onClick={() => setShowLeaveForm(!showLeaveForm)}>
                <i className={`fas ${showLeaveForm ? 'fa-times' : 'fa-plus'} me-1`}></i>{showLeaveForm ? 'Cancel' : 'Apply Leave'}
              </button>
            </div>

            {leaveMsg && <div className={`alert alert-${leaveMsg.type} py-2`}>{leaveMsg.text}</div>}

            {/* Leave Form */}
            {showLeaveForm && (
              <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
                <div className="card-body">
                  <h6 style={{ fontWeight: 700, color: '#1a5276' }}>Apply for Leave</h6>
                  <form onSubmit={handleCreateLeave}>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Start Date</label>
                        <input type="date" className="form-control" value={leaveForm.start_date} onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })} required />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>End Date</label>
                        <input type="date" className="form-control" value={leaveForm.end_date} onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })} required />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Reason</label>
                        <input type="text" className="form-control" value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Reason for leave" required />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary mt-3" disabled={leaveSaving} style={{ borderRadius: 8 }}>
                      {leaveSaving ? <><span className="spinner-border spinner-border-sm me-1"></span>Submitting...</> : <><i className="fas fa-paper-plane me-1"></i>Submit Request</>}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Leave List */}
            {leaves.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="fas fa-umbrella-beach fa-2x mb-2 d-block"></i>
                <p className="mb-0">No leave requests</p>
              </div>
            ) : (
              <div className="row g-3">
                {leaves.map(leave => {
                  const statusMap = { PENDING: { bg: 'warning', icon: 'fa-hourglass-half' }, APPROVED: { bg: 'success', icon: 'fa-check' }, REJECTED: { bg: 'danger', icon: 'fa-times' } };
                  const st = statusMap[(leave.status || 'PENDING').toUpperCase()] || statusMap.PENDING;
                  const start = new Date(leave.start_date);
                  const end = new Date(leave.end_date);
                  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                  const isPast = end < new Date();
                  return (
                    <div className="col-md-6" key={leave.id}>
                      <div className={`card border-0 shadow-sm ${isPast ? 'opacity-75' : ''}`} style={{ borderRadius: 12 }}>
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <div className="d-flex align-items-center gap-2 mb-1">
                                <span className={`badge bg-${st.bg}`}><i className={`fas ${st.icon} me-1`}></i>{leave.status || 'Pending'}</span>
                                <span className="badge bg-light text-dark border">{days} {days === 1 ? 'day' : 'days'}</span>
                              </div>
                              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2c3e50' }}>
                                {fmt(leave.start_date)} - {fmt(leave.end_date)}
                              </div>
                              <div className="text-muted mt-1" style={{ fontSize: '0.85rem' }}>
                                <i className="fas fa-comment me-1"></i>{leave.reason || 'No reason provided'}
                              </div>
                            </div>
                            {(leave.status || '').toUpperCase() === 'PENDING' && (
                              <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteLeave(leave.id)} style={{ borderRadius: 6 }}>
                                <i className="fas fa-trash"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorSchedule;
