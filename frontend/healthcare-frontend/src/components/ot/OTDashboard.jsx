import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { operationTheaterService } from '../../services/api';

const OTDashboard = () => {
  const [todaySurgeries, setTodaySurgeries] = useState([]);
  const [upcomingSurgeries, setUpcomingSurgeries] = useState([]);
  const [theaters, setTheaters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [todayRes, upcomingRes, theatersRes] = await Promise.all([
          operationTheaterService.getTodaySurgeries(),
          operationTheaterService.getUpcomingSurgeries(),
          operationTheaterService.getTheaters(),
        ]);
        setTodaySurgeries(todayRes.data?.results || todayRes.data || []);
        setUpcomingSurgeries(upcomingRes.data?.results || upcomingRes.data || []);
        setTheaters(theatersRes.data || []);
        setLoading(false);
      } catch (err) {
        setError('Error loading OT dashboard data');
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const getStatusBadgeClass = (s) => {
    switch (s) {
      case 'SCHEDULED': return 'bg-primary';
      case 'IN_PROGRESS': return 'bg-info';
      case 'COMPLETED': return 'bg-success';
      case 'CANCELLED': return 'bg-danger';
      case 'POSTPONED': return 'bg-warning text-dark';
      default: return 'bg-secondary';
    }
  };

  const getOTStatusClass = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'border-success';
      case 'OCCUPIED': return 'border-danger';
      case 'MAINTENANCE': return 'border-warning';
      case 'CLEANING': return 'border-info';
      default: return 'border-secondary';
    }
  };

  const getOTStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-success';
      case 'OCCUPIED': return 'bg-danger';
      case 'MAINTENANCE': return 'bg-warning text-dark';
      case 'CLEANING': return 'bg-info';
      default: return 'bg-secondary';
    }
  };

  const completedToday = todaySurgeries.filter(s => s.status === 'COMPLETED').length;
  const cancelledToday = todaySurgeries.filter(s => s.status === 'CANCELLED').length;

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
        <h2><i className="fas fa-hospital me-2"></i>OT Dashboard</h2>
        <Link to="/ot/surgeries/add" className="btn btn-primary">
          <i className="fas fa-plus me-1"></i> Schedule Surgery
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm border-start border-primary border-4">
            <div className="card-body text-center">
              <h3 className="text-primary">{todaySurgeries.length}</h3>
              <div className="text-muted"><i className="fas fa-calendar-day me-1"></i>Surgeries Today</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-start border-info border-4">
            <div className="card-body text-center">
              <h3 className="text-info">{upcomingSurgeries.length}</h3>
              <div className="text-muted"><i className="fas fa-calendar-week me-1"></i>Upcoming (7 days)</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-start border-success border-4">
            <div className="card-body text-center">
              <h3 className="text-success">{completedToday}</h3>
              <div className="text-muted"><i className="fas fa-check-circle me-1"></i>Completed Today</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-start border-danger border-4">
            <div className="card-body text-center">
              <h3 className="text-danger">{cancelledToday}</h3>
              <div className="text-muted"><i className="fas fa-times-circle me-1"></i>Cancelled Today</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Today's Surgery Schedule */}
        <div className="col-md-8">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0"><i className="fas fa-clock me-2"></i>Today's Surgery Schedule</h5>
            </div>
            <div className="card-body">
              {todaySurgeries.length === 0 ? (
                <p className="text-muted text-center">No surgeries scheduled for today</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Time</th>
                        <th>Patient</th>
                        <th>Surgeon</th>
                        <th>Procedure</th>
                        <th>OT</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todaySurgeries.map((surgery) => (
                        <tr key={surgery.id}>
                          <td>
                            {surgery.scheduled_date
                              ? new Date(surgery.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '-'}
                          </td>
                          <td>
                            <Link to={`/ot/surgeries/${surgery.id}`}>
                              {surgery.patient_name || `${surgery.patient?.first_name || ''} ${surgery.patient?.last_name || ''}`}
                            </Link>
                          </td>
                          <td>Dr. {surgery.surgeon_name || `${surgery.surgeon?.first_name || ''} ${surgery.surgeon?.last_name || ''}`}</td>
                          <td>{surgery.procedure_name || surgery.procedure || '-'}</td>
                          <td>{surgery.operation_theater_name || surgery.operation_theater?.name || '-'}</td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(surgery.status)}`}>
                              {surgery.status_display || surgery.status}
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

          {/* Upcoming Surgeries */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0"><i className="fas fa-calendar-alt me-2"></i>Upcoming Surgeries (Next 7 Days)</h5>
              <Link to="/ot/surgeries" className="btn btn-sm btn-light">View All</Link>
            </div>
            <div className="card-body">
              {upcomingSurgeries.length === 0 ? (
                <p className="text-muted text-center">No upcoming surgeries</p>
              ) : (
                <div className="list-group list-group-flush">
                  {upcomingSurgeries.slice(0, 10).map((surgery) => (
                    <Link
                      key={surgery.id}
                      to={`/ot/surgeries/${surgery.id}`}
                      className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <strong>{surgery.patient_name || `${surgery.patient?.first_name || ''} ${surgery.patient?.last_name || ''}`}</strong>
                        <br />
                        <small className="text-muted">
                          {surgery.procedure_name || surgery.procedure || '-'} | Dr. {surgery.surgeon_name || `${surgery.surgeon?.first_name || ''} ${surgery.surgeon?.last_name || ''}`}
                        </small>
                      </div>
                      <div className="text-end">
                        <span className={`badge ${getStatusBadgeClass(surgery.status)} me-2`}>
                          {surgery.status_display || surgery.status}
                        </span>
                        <br />
                        <small className="text-muted">
                          {surgery.scheduled_date ? new Date(surgery.scheduled_date).toLocaleDateString() : '-'}
                        </small>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* OT Availability */}
        <div className="col-md-4">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-dark text-white">
              <h5 className="mb-0"><i className="fas fa-door-open me-2"></i>OT Availability</h5>
            </div>
            <div className="card-body">
              {theaters.length === 0 ? (
                <p className="text-muted text-center">No operation theaters found</p>
              ) : (
                theaters.map((theater) => (
                  <div key={theater.id} className={`card mb-3 border-start border-4 ${getOTStatusClass(theater.status)}`}>
                    <div className="card-body py-2 px-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{theater.name}</strong>
                          <br />
                          <small className="text-muted">{theater.location || theater.floor || ''}</small>
                        </div>
                        <span className={`badge ${getOTStatusBadge(theater.status)}`}>
                          {theater.status_display || theater.status}
                        </span>
                      </div>
                      {theater.current_surgery && (
                        <small className="text-muted d-block mt-1">
                          <i className="fas fa-user-md me-1"></i>
                          {theater.current_surgery.patient_name || 'In use'}
                        </small>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTDashboard;
