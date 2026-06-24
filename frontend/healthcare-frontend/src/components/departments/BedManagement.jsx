import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { wardService, bedService, patientService } from '../../services/api';

const BED_STATUS_COLORS = {
  AVAILABLE: 'bg-success',
  OCCUPIED: 'bg-danger',
  MAINTENANCE: 'bg-warning',
  RESERVED: 'bg-primary',
};

const BedManagement = () => {
  const { id: departmentId } = useParams();
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState('');
  const [beds, setBeds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bedsLoading, setBedsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [admitModal, setAdmitModal] = useState({ show: false, bedId: null });
  const [selectedPatient, setSelectedPatient] = useState('');

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [wardsResponse, patientsResponse] = await Promise.all([
          wardService.getAll({ department: departmentId }),
          patientService.getAll({ page_size: 100 }),
        ]);
        setWards(wardsResponse.data);
        setPatients(patientsResponse.data);
        if (wardsResponse.data.length > 0) {
          setSelectedWard(wardsResponse.data[0].id);
        }
        setLoading(false);
      } catch (err) {
        setError('Error fetching ward data');
        setLoading(false);
        console.error(err);
      }
    };
    fetchInitialData();
  }, [departmentId]);

  const fetchBeds = useCallback(async () => {
    if (!selectedWard) return;
    setBedsLoading(true);
    try {
      const response = await bedService.getAll({ ward: selectedWard });
      setBeds(response.data);
      setBedsLoading(false);
    } catch (err) {
      setError('Error fetching beds');
      setBedsLoading(false);
      console.error(err);
    }
  }, [selectedWard]);

  useEffect(() => {
    fetchBeds();
  }, [fetchBeds]);

  const handleAdmit = async () => {
    if (!selectedPatient || !admitModal.bedId) return;
    try {
      await bedService.admitPatient(admitModal.bedId, { patient: selectedPatient });
      setAdmitModal({ show: false, bedId: null });
      setSelectedPatient('');
      fetchBeds();
    } catch (err) {
      setError('Error admitting patient');
      console.error(err);
    }
  };

  const handleDischarge = async (bedId) => {
    if (window.confirm('Are you sure you want to discharge this patient?')) {
      try {
        await bedService.dischargePatient(bedId);
        fetchBeds();
      } catch (err) {
        setError('Error discharging patient');
        console.error(err);
      }
    }
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Bed Management</h2>
        <Link to={`/departments/${departmentId}`} className="btn btn-secondary">
          Back to Department
        </Link>
      </div>

      {error && <div className="alert alert-danger alert-dismissible">
        {error}
        <button type="button" className="btn-close" onClick={() => setError(null)}></button>
      </div>}

      {/* Ward Selector */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-3">
              <label className="form-label fw-bold">Select Ward</label>
            </div>
            <div className="col-md-9">
              <select
                className="form-select"
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
              >
                <option value="">-- Select a Ward --</option>
                {wards.map((ward) => (
                  <option key={ward.id} value={ward.id}>{ward.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bed Legend */}
      <div className="d-flex gap-3 mb-3">
        {Object.entries(BED_STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="d-flex align-items-center">
            <span className={`badge ${color} me-1`}>&nbsp;&nbsp;&nbsp;</span>
            <small>{status.charAt(0) + status.slice(1).toLowerCase()}</small>
          </div>
        ))}
      </div>

      {/* Beds Grid */}
      {bedsLoading ? (
        <div className="text-center mt-5"><div className="spinner-border"></div></div>
      ) : !selectedWard ? (
        <div className="alert alert-info">Please select a ward to view beds</div>
      ) : beds.length === 0 ? (
        <div className="alert alert-info">No beds found in this ward</div>
      ) : (
        <div className="row row-cols-2 row-cols-md-4 row-cols-lg-6 g-3">
          {beds.map((bed) => (
            <div key={bed.id} className="col">
              <div className={`card text-center h-100`}>
                <div className={`card-header ${BED_STATUS_COLORS[bed.status] || 'bg-secondary'} text-white`}>
                  <strong>Bed {bed.bed_number}</strong>
                </div>
                <div className="card-body p-2">
                  <span className={`badge ${BED_STATUS_COLORS[bed.status] || 'bg-secondary'} mb-2`}>
                    {bed.status}
                  </span>
                  {bed.status === 'OCCUPIED' && (
                    <p className="small mb-1">
                      {bed.patient_name || (bed.patient ? `${bed.patient.first_name} ${bed.patient.last_name}` : 'Patient')}
                    </p>
                  )}
                </div>
                <div className="card-footer p-1">
                  {bed.status === 'AVAILABLE' && (
                    <button
                      className="btn btn-sm btn-success w-100"
                      onClick={() => setAdmitModal({ show: true, bedId: bed.id })}
                    >
                      Admit
                    </button>
                  )}
                  {bed.status === 'OCCUPIED' && (
                    <button
                      className="btn btn-sm btn-outline-danger w-100"
                      onClick={() => handleDischarge(bed.id)}
                    >
                      Discharge
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admit Patient Modal */}
      {admitModal.show && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Admit Patient</h5>
                <button type="button" className="btn-close" onClick={() => { setAdmitModal({ show: false, bedId: null }); setSelectedPatient(''); }}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Select Patient</label>
                  <select
                    className="form-select"
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                  >
                    <option value="">-- Select Patient --</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setAdmitModal({ show: false, bedId: null }); setSelectedPatient(''); }}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleAdmit} disabled={!selectedPatient}>
                  Admit Patient
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BedManagement;
