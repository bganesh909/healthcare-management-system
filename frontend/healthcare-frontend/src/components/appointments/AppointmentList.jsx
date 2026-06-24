import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import { Chip, IconButton, Tooltip, Box } from '@mui/material';
import { appointmentService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const fmtTime = (t) => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h, 10); return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; };

const STATUS_CONFIG = {
  SCHEDULED: { color: 'primary', icon: 'fa-clock', label: 'Scheduled' },
  CHECKED_IN: { color: 'info', icon: 'fa-sign-in-alt', label: 'Checked In' },
  VITALS_RECORDED: { color: 'secondary', icon: 'fa-heartbeat', label: 'Vitals Done' },
  FEES_PAID: { color: 'warning', icon: 'fa-rupee-sign', label: 'Fees Paid' },
  READY: { color: 'info', icon: 'fa-user-check', label: 'Ready' },
  IN_CONSULTATION: { color: 'primary', icon: 'fa-stethoscope', label: 'In Consultation' },
  COMPLETED: { color: 'success', icon: 'fa-check-circle', label: 'Completed' },
  CANCELLED: { color: 'error', icon: 'fa-times-circle', label: 'Cancelled' },
  NO_SHOW: { color: 'warning', icon: 'fa-user-slash', label: 'No Show' },
};

const AppointmentList = () => {
  const navigate = useNavigate();
  const { isAdmin, isStaff, isDoctor } = useAuth();
  const canManage = isAdmin || isStaff || isDoctor;

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');

  // DataGrid pagination state
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [rowCount, setRowCount] = useState(0);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const page = paginationModel.page + 1; // API uses 1-based pages
      let response;
      if (quickFilter === 'today') {
        response = await appointmentService.getToday({ page, page_size: paginationModel.pageSize });
      } else if (quickFilter === 'upcoming') {
        response = await appointmentService.getUpcoming({ page, page_size: paginationModel.pageSize });
      } else {
        const params = { page, page_size: paginationModel.pageSize };
        if (statusFilter) params.status = statusFilter;
        if (date) params.appointment_date = date;
        if (search) params.search = search;
        response = await appointmentService.getAll(params);
      }
      setAppointments(response.data || []);
      setRowCount(response.count || 0);
    } catch {
      setError('Error fetching appointments');
    }
    setLoading(false);
  }, [paginationModel, statusFilter, date, search, quickFilter]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleCheckIn = async (id) => {
    setActionLoading(id);
    try { await appointmentService.checkIn(id); fetchAppointments(); } catch { setError('Check-in failed'); }
    setActionLoading(null);
  };

  const handleCheckOut = async (id) => {
    setActionLoading(id);
    try { await appointmentService.checkOut(id); fetchAppointments(); } catch { setError('Check-out failed'); }
    setActionLoading(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this appointment?')) {
      try { await appointmentService.delete(id); fetchAppointments(); } catch { setError('Error deleting'); }
    }
  };

  const clearFilters = () => {
    setStatusFilter(''); setDate(''); setSearch('');
    setPaginationModel({ page: 0, pageSize: paginationModel.pageSize });
    setQuickFilter('all');
  };

  // Stats from current page data
  const scheduled = appointments.filter(a => a.status === 'SCHEDULED').length;
  const completed = appointments.filter(a => a.status === 'COMPLETED').length;

  const columns = [
    {
      field: 'appointment_date',
      headerName: 'Date & Time',
      flex: 1.2,
      minWidth: 160,
      renderCell: (params) => {
        const isToday = params.row.appointment_date === new Date().toISOString().split('T')[0];
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#2c3e50' }}>
              {fmt(params.row.appointment_date)}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#7f8c8d' }}>
              <i className="fas fa-clock me-1"></i>{fmtTime(params.row.appointment_time)}
              {isToday && <span className="badge bg-info ms-2" style={{ fontSize: '0.6rem' }}>TODAY</span>}
              {params.row.is_walk_in && <span className="badge bg-secondary ms-1" style={{ fontSize: '0.6rem' }}>Walk-in</span>}
            </div>
          </div>
        );
      },
    },
    {
      field: 'patient_name',
      headerName: 'Patient',
      flex: 1,
      minWidth: 140,
      valueGetter: (params) => params.row.patient_name || `Patient #${params.row.patient}`,
      renderCell: (params) => (
        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{params.value}</span>
      ),
    },
    {
      field: 'doctor_name',
      headerName: 'Doctor',
      flex: 1,
      minWidth: 140,
      valueGetter: (params) => params.row.doctor_name || `Doctor #${params.row.doctor}`,
    },
    {
      field: 'reason',
      headerName: 'Reason',
      flex: 1.3,
      minWidth: 150,
      renderCell: (params) => (
        <Tooltip title={params.value || ''} arrow>
          <span style={{ fontSize: '0.85rem', color: '#555' }}>
            {(params.value || '-').length > 35 ? params.value.slice(0, 35) + '...' : (params.value || '-')}
          </span>
        </Tooltip>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.9,
      minWidth: 140,
      renderCell: (params) => {
        const sc = STATUS_CONFIG[params.value] || STATUS_CONFIG.SCHEDULED;
        return (
          <div>
            <Chip
              icon={<i className={`fas ${sc.icon}`} style={{ fontSize: '0.7rem' }}></i>}
              label={sc.label}
              color={sc.color}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
            />
            {params.row.check_in_time && !params.row.check_out_time && (
              <div style={{ fontSize: '0.68rem', color: '#27ae60', marginTop: 2 }}>
                <i className="fas fa-sign-in-alt me-1"></i>Checked in
              </div>
            )}
          </div>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.8,
      minWidth: 120,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const appt = params.row;
        const isToday = appt.appointment_date === new Date().toISOString().split('T')[0];
        const isFuture = new Date(appt.appointment_date) >= new Date(new Date().toDateString());
        const canCheckIn = appt.status === 'SCHEDULED' && !appt.check_in_time && (isToday || isFuture);
        const canCheckOut = appt.status === 'SCHEDULED' && appt.check_in_time && !appt.check_out_time;

        return (
          <div className="d-flex gap-1">
            {canManage && canCheckIn && (
              <Tooltip title="Check In" arrow>
                <IconButton size="small" color="success" disabled={actionLoading === appt.id}
                  onClick={(e) => { e.stopPropagation(); handleCheckIn(appt.id); }}>
                  {actionLoading === appt.id
                    ? <span className="spinner-border spinner-border-sm"></span>
                    : <i className="fas fa-sign-in-alt" style={{ fontSize: '0.85rem' }}></i>}
                </IconButton>
              </Tooltip>
            )}
            {canManage && canCheckOut && (
              <Tooltip title="Check Out" arrow>
                <IconButton size="small" color="primary" disabled={actionLoading === appt.id}
                  onClick={(e) => { e.stopPropagation(); handleCheckOut(appt.id); }}>
                  {actionLoading === appt.id
                    ? <span className="spinner-border spinner-border-sm"></span>
                    : <i className="fas fa-sign-out-alt" style={{ fontSize: '0.85rem' }}></i>}
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Edit" arrow>
              <IconButton size="small" color="warning"
                onClick={(e) => { e.stopPropagation(); navigate(`/appointments/edit/${appt.id}`); }}>
                <i className="fas fa-edit" style={{ fontSize: '0.85rem' }}></i>
              </IconButton>
            </Tooltip>
            {canManage && (
              <Tooltip title="Delete" arrow>
                <IconButton size="small" color="error"
                  onClick={(e) => { e.stopPropagation(); handleDelete(appt.id); }}>
                  <i className="fas fa-trash" style={{ fontSize: '0.85rem' }}></i>
                </IconButton>
              </Tooltip>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="container mt-4 mb-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1" style={{ fontWeight: 700, color: '#1a5276' }}>
            <i className="fas fa-calendar-alt me-2"></i>Appointments
          </h2>
          <p className="text-muted mb-0">{rowCount} total appointments</p>
        </div>
        <Link to="/appointments/add" className="btn btn-primary" style={{ borderRadius: 8 }}>
          <i className="fas fa-plus me-1"></i> Schedule Appointment
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total', value: rowCount, icon: 'fa-calendar', color: '#3498db', bg: '#ebf5fb', filter: 'all' },
          { label: 'Today', value: '-', icon: 'fa-calendar-day', color: '#e67e22', bg: '#fef5e7', filter: 'today' },
          { label: 'Upcoming', value: '-', icon: 'fa-calendar-check', color: '#27ae60', bg: '#eafaf1', filter: 'upcoming' },
          { label: 'Scheduled', value: scheduled, icon: 'fa-clock', color: '#2980b9', bg: '#ebf5fb' },
          { label: 'Completed', value: completed, icon: 'fa-check-circle', color: '#27ae60', bg: '#eafaf1' },
        ].map((s, i) => (
          <div className="col" key={i}>
            <div className={`card border-0 shadow-sm h-100`}
              style={{
                borderRadius: 12,
                cursor: s.filter ? 'pointer' : 'default',
                outline: quickFilter === s.filter ? `2px solid ${s.color}` : 'none',
              }}
              onClick={() => {
                if (s.filter) {
                  setQuickFilter(s.filter);
                  setPaginationModel({ ...paginationModel, page: 0 });
                  setStatusFilter(''); setDate('');
                }
              }}>
              <div className="card-body text-center py-3">
                <div className="mx-auto mb-1" style={{ width: 36, height: 36, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`fas ${s.icon}`} style={{ color: s.color }}></i>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2c3e50' }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: '#7f8c8d' }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card shadow-sm mb-4" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-body py-3">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-white"><i className="fas fa-search text-muted"></i></span>
                <input type="text" className="form-control border-start-0" placeholder="Search patient or doctor..."
                  value={search} onChange={(e) => { setSearch(e.target.value); setPaginationModel({ ...paginationModel, page: 0 }); setQuickFilter('all'); }} />
              </div>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPaginationModel({ ...paginationModel, page: 0 }); setQuickFilter('all'); }}>
                <option value="">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="NO_SHOW">No Show</option>
              </select>
            </div>
            <div className="col-md-3">
              <input type="date" className="form-control" value={date} onChange={(e) => { setDate(e.target.value); setPaginationModel({ ...paginationModel, page: 0 }); setQuickFilter('all'); }} />
            </div>
            <div className="col-md-2">
              <button className="btn btn-outline-secondary w-100" onClick={clearFilters} style={{ borderRadius: 8 }}>
                <i className="fas fa-times me-1"></i>Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger alert-dismissible">{error}<button className="btn-close" onClick={() => setError(null)}></button></div>}

      {/* DataGrid */}
      <Box sx={{
        width: '100%',
        '& .MuiDataGrid-root': {
          border: 'none',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          backgroundColor: '#fff',
          fontSize: '0.88rem',
        },
        '& .MuiDataGrid-columnHeaders': {
          backgroundColor: '#fafbfc',
          fontSize: '0.78rem',
          textTransform: 'uppercase',
          color: '#7f8c8d',
          letterSpacing: '0.3px',
        },
        '& .MuiDataGrid-row:hover': {
          backgroundColor: '#f8f9ff',
          cursor: 'pointer',
        },
        '& .MuiDataGrid-cell': {
          borderBottom: '1px solid #f0f0f0',
          padding: '8px 12px',
        },
        '& .MuiDataGrid-footerContainer': {
          borderTop: '1px solid #f0f0f0',
        },
      }}>
        <DataGrid
          rows={appointments}
          columns={columns}
          loading={loading}
          rowCount={rowCount}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50]}
          rowHeight={65}
          disableRowSelectionOnClick
          onRowClick={(params) => navigate(`/appointments/${params.id}`)}
          autoHeight
          sx={{ minHeight: 400 }}
          slotProps={{
            loadingOverlay: {
              variant: 'linear-progress',
            },
            noRowsOverlay: {
              children: (
                <div className="text-center py-5">
                  <i className="fas fa-calendar-times fa-3x text-muted mb-3 d-block"></i>
                  <h5 className="text-muted">No appointments found</h5>
                </div>
              ),
            },
          }}
        />
      </Box>
    </div>
  );
};

export default AppointmentList;
