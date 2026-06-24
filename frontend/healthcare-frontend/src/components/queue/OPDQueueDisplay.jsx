import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { queueService, appointmentService } from '../../services/api';

const OPDQueueDisplay = () => {
  const [displays, setDisplays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);

  const fetchQueueData = useCallback(async () => {
    try {
      const response = await queueService.getActiveDisplays();
      const data = response.data?.results || response.data || [];
      setDisplays(data);
      setLastUpdated(new Date());
      setLoading(false);
      setError(null);
    } catch (err) {
      // On first load show error, on refresh keep existing data
      if (displays.length === 0) {
        // Try fetching today's appointments as fallback
        try {
          const todayRes = await appointmentService.getToday({});
          const appts = todayRes.data?.results || todayRes.data || [];
          setTodayAppointments(appts);
        } catch { /* ignore */ }
        setLoading(false);
      }
    }
  }, [displays.length]);

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 15000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="container-fluid mt-4">
        <div className="text-center mt-5"><div className="spinner-border spinner-border-lg"></div></div>
      </div>
    );
  }

  if (error && displays.length === 0) {
    return (
      <div className="container-fluid mt-4">
        <div className="alert alert-danger text-center">{error}</div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-4 py-3" style={{ backgroundColor: '#1a1a2e', minHeight: '100vh' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="text-white mb-0">
          <i className="fas fa-hospital me-3"></i>OPD Queue Display
        </h1>
        <div className="text-white-50">
          <i className="fas fa-sync-alt me-1"></i>
          Auto-refreshes every 15s
          {lastUpdated && (
            <span className="ms-2">| Last: {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {displays.length === 0 ? (
        <div className="text-center mt-5">
          <i className="fas fa-inbox fa-3x mb-3 text-white-50"></i>
          <h4 className="text-white-50">No active queues at the moment</h4>
          <p className="text-white-50 mb-4">Patients will appear here once they check in for their appointments.</p>

          {todayAppointments.length > 0 && (
            <div className="mt-4" style={{ maxWidth: 700, margin: '0 auto' }}>
              <h5 className="text-white mb-3">
                <i className="fas fa-calendar-day me-2"></i>
                Today's Appointments ({todayAppointments.length})
              </h5>
              <div className="card" style={{ backgroundColor: '#16213e', border: '1px solid #0f3460' }}>
                <div className="table-responsive">
                  <table className="table table-dark table-hover mb-0" style={{ backgroundColor: 'transparent' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #0f3460' }}>
                        <th>Time</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayAppointments.slice(0, 10).map((appt) => (
                        <tr key={appt.id} style={{ borderBottom: '1px solid #0f3460' }}>
                          <td>{appt.appointment_time ? appt.appointment_time.slice(0, 5) : '-'}</td>
                          <td>{appt.patient_name || `Patient #${appt.patient}`}</td>
                          <td>{appt.doctor_name || `Doctor #${appt.doctor}`}</td>
                          <td>
                            <span className={`badge ${
                              appt.status === 'SCHEDULED' ? 'bg-primary' :
                              appt.status === 'COMPLETED' ? 'bg-success' :
                              appt.status === 'CHECKED_IN' ? 'bg-info' : 'bg-secondary'
                            }`}>
                              {appt.status_display || appt.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-white-50 mt-3" style={{ fontSize: '0.85rem' }}>
                <i className="fas fa-info-circle me-1"></i>
                Check in patients from the <Link to="/appointments" className="text-info">Appointments</Link> page to add them to the queue.
              </p>
            </div>
          )}

          {todayAppointments.length === 0 && (
            <div className="mt-3">
              <Link to="/appointments/add" className="btn btn-outline-light">
                <i className="fas fa-plus me-2"></i>Schedule an Appointment
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="row g-4">
          {displays.map((display) => {
            const queue = display.queue_entries || display.entries || [];
            const currentEntry = queue.find(e => e.status === 'IN_CONSULTATION' || e.status === 'CALLED');
            const waitingEntries = queue.filter(e => e.status === 'WAITING' || e.status === 'CHECKED_IN');
            const nextEntries = waitingEntries.slice(0, 5);
            const avgWait = display.average_wait_time || display.avg_wait_time || null;

            return (
              <div key={display.id} className="col-lg-4 col-md-6">
                <div className="card shadow-lg h-100" style={{ backgroundColor: '#16213e', border: '1px solid #0f3460' }}>
                  {/* Doctor Header */}
                  <div className="card-header text-white" style={{ backgroundColor: '#0f3460' }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h4 className="mb-0">
                          <i className="fas fa-user-md me-2"></i>
                          Dr. {display.doctor_name || `${display.doctor?.first_name || ''} ${display.doctor?.last_name || ''}`}
                        </h4>
                        <small className="text-white-50">
                          {display.department_name || display.department || display.doctor?.specialization_display || ''}
                        </small>
                      </div>
                      <div className="text-end">
                        <span className="badge bg-light text-dark">
                          <i className="fas fa-users me-1"></i>{waitingEntries.length} waiting
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="card-body text-white">
                    {/* Current Token */}
                    <div className="text-center mb-4">
                      <small className="text-white-50 text-uppercase">Now Serving</small>
                      {currentEntry ? (
                        <div
                          className="rounded-3 py-3 mt-2"
                          style={{ backgroundColor: '#198754', fontSize: '1rem' }}
                        >
                          <div style={{ fontSize: '3rem', fontWeight: '800', lineHeight: 1 }}>
                            {currentEntry.token_number || currentEntry.token || '-'}
                          </div>
                          <div className="mt-1">
                            {currentEntry.patient_name || `${currentEntry.patient?.first_name || ''} ${currentEntry.patient?.last_name || ''}`}
                          </div>
                        </div>
                      ) : (
                        <div
                          className="rounded-3 py-3 mt-2 text-muted"
                          style={{ backgroundColor: '#2a2a4a' }}
                        >
                          <div style={{ fontSize: '2rem', fontWeight: '600' }}>--</div>
                          <div>No patient currently</div>
                        </div>
                      )}
                    </div>

                    {/* Next Tokens */}
                    <div className="mb-3">
                      <small className="text-white-50 text-uppercase">Up Next</small>
                      {nextEntries.length === 0 ? (
                        <div className="text-center text-muted mt-2">No patients waiting</div>
                      ) : (
                        <div className="mt-2">
                          {nextEntries.map((entry, idx) => (
                            <div
                              key={entry.id}
                              className="d-flex justify-content-between align-items-center rounded px-3 py-2 mb-2"
                              style={{
                                backgroundColor: idx === 0 ? '#ffc10733' : '#2a2a4a',
                                borderLeft: idx === 0 ? '4px solid #ffc107' : '4px solid transparent',
                              }}
                            >
                              <div className="d-flex align-items-center">
                                <span
                                  className="badge me-2"
                                  style={{
                                    backgroundColor: idx === 0 ? '#ffc107' : '#6c757d',
                                    color: idx === 0 ? '#000' : '#fff',
                                    fontSize: '1rem',
                                    minWidth: '40px',
                                  }}
                                >
                                  {entry.token_number || entry.token || '-'}
                                </span>
                                <span style={{ fontSize: '0.9rem' }}>
                                  {entry.patient_name || `${entry.patient?.first_name || ''} ${entry.patient?.last_name || ''}`}
                                </span>
                              </div>
                              {entry.priority && entry.priority !== 'NORMAL' && (
                                <span className="badge bg-danger" style={{ fontSize: '0.7rem' }}>
                                  {entry.priority}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Average Wait Time */}
                    {avgWait && (
                      <div className="text-center mt-3 pt-3" style={{ borderTop: '1px solid #2a2a4a' }}>
                        <i className="fas fa-clock text-warning me-1"></i>
                        <span className="text-white-50">Avg Wait: </span>
                        <strong className="text-warning">{avgWait} min</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OPDQueueDisplay;
