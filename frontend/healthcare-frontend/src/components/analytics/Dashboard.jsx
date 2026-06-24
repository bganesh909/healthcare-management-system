import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsService } from '../../services/api';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await analyticsService.getDashboard();
        setData(response.data);
        setLoading(false);
      } catch (err) {
        setError('Error loading dashboard data');
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;
  if (error) return <div className="container mt-4"><div className="alert alert-danger">{error}</div></div>;
  if (!data) return null;

  const stats = [
    { title: 'Total Patients', value: data.total_patients, icon: 'fa-user-injured', color: 'primary', link: '/patients' },
    { title: 'Total Doctors', value: data.total_doctors, icon: 'fa-user-md', color: 'success', link: '/doctors' },
    { title: 'Total Appointments', value: data.total_appointments, icon: 'fa-calendar-check', color: 'info', link: '/appointments' },
    { title: 'Completed', value: data.appointment_stats?.completed || 0, icon: 'fa-check-circle', color: 'warning', link: '/appointments' },
  ];

  return (
    <div className="container mt-4 fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-chart-line me-2"></i>Analytics Dashboard</h2>
      </div>

      {/* Summary Cards */}
      <div className="row mb-4">
        {stats.map((stat, i) => (
          <div key={i} className="col-md-3 mb-3">
            <Link to={stat.link} className="text-decoration-none">
              <div className={`card border-${stat.color} h-100 analytics-stat-card`}>
                <div className="card-body text-center">
                  <i className={`fas ${stat.icon} text-${stat.color} mb-2`} style={{ fontSize: '2rem' }}></i>
                  <h3 className="mb-1">{stat.value}</h3>
                  <p className="text-muted mb-0">{stat.title}</p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Appointment Status Breakdown */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0"><i className="fas fa-chart-pie me-2"></i>Appointment Status</h5>
            </div>
            <div className="card-body">
              {data.appointment_stats ? (
                <div>
                  {[
                    { label: 'Scheduled', value: data.appointment_stats.scheduled, color: 'primary' },
                    { label: 'Completed', value: data.appointment_stats.completed, color: 'success' },
                    { label: 'Cancelled', value: data.appointment_stats.cancelled, color: 'danger' },
                    { label: 'No Show', value: data.appointment_stats.no_show, color: 'warning' },
                  ].map((item, i) => {
                    const total = data.total_appointments || 1;
                    const pct = Math.round((item.value / total) * 100);
                    return (
                      <div key={i} className="mb-3">
                        <div className="d-flex justify-content-between mb-1">
                          <span>{item.label}</span>
                          <span className="fw-bold">{item.value} ({pct}%)</span>
                        </div>
                        <div className="progress" style={{ height: '8px' }}>
                          <div className={`progress-bar bg-${item.color}`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted">No appointment data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Doctors */}
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0"><i className="fas fa-trophy me-2"></i>Top Doctors</h5>
            </div>
            <div className="card-body">
              {data.top_doctors && data.top_doctors.length > 0 ? (
                <div className="list-group list-group-flush">
                  {data.top_doctors.map((doc, i) => (
                    <div key={i} className="list-group-item d-flex justify-content-between align-items-center px-0">
                      <div>
                        <span className={`badge bg-${i === 0 ? 'warning' : 'secondary'} me-2`}>{i + 1}</span>
                        <strong>Dr. {doc.doctor__first_name} {doc.doctor__last_name}</strong>
                      </div>
                      <span className="badge bg-primary rounded-pill">{doc.total} appointments</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No doctor data available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Patient Statistics */}
      {data.patient_stats && (
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-white">
                <h5 className="mb-0"><i className="fas fa-venus-mars me-2"></i>Gender Distribution</h5>
              </div>
              <div className="card-body">
                {data.patient_stats.gender_distribution && data.patient_stats.gender_distribution.length > 0 ? (
                  data.patient_stats.gender_distribution.map((g, i) => {
                    const total = data.total_patients || 1;
                    const pct = Math.round((g.count / total) * 100);
                    const labels = { M: 'Male', F: 'Female', O: 'Other' };
                    const colors = { M: 'primary', F: 'danger', O: 'info' };
                    return (
                      <div key={i} className="mb-3">
                        <div className="d-flex justify-content-between mb-1">
                          <span>{labels[g.gender] || g.gender}</span>
                          <span className="fw-bold">{g.count} ({pct}%)</span>
                        </div>
                        <div className="progress" style={{ height: '8px' }}>
                          <div className={`progress-bar bg-${colors[g.gender] || 'secondary'}`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-muted">No data available</p>
                )}
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-white">
                <h5 className="mb-0"><i className="fas fa-tint me-2"></i>Blood Group Distribution</h5>
              </div>
              <div className="card-body">
                {data.patient_stats.blood_group_distribution && data.patient_stats.blood_group_distribution.length > 0 ? (
                  <div className="row">
                    {data.patient_stats.blood_group_distribution.map((bg, i) => (
                      <div key={i} className="col-6 col-md-3 mb-2 text-center">
                        <div className="p-2 rounded bg-light">
                          <h5 className="text-danger mb-0">{bg.blood_group || 'N/A'}</h5>
                          <small className="text-muted">{bg.count} patients</small>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">No data available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
