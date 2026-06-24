import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { labService, patientService, doctorService, appointmentService } from '../../services/api';

const LabOrderForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    patient: '',
    doctor: '',
    appointment: '',
    priority: 'ROUTINE',
    clinical_notes: '',
  });

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [testCategories, setTestCategories] = useState([]);
  const [availableTests, setAvailableTests] = useState([]);
  const [selectedTests, setSelectedTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [patientsRes, doctorsRes, categoriesRes, testsRes] = await Promise.all([
          patientService.getAll({ page_size: 100 }),
          doctorService.getAll({ page_size: 100 }),
          labService.getCategories({ page_size: 100 }),
          labService.getTests({ page_size: 200 }),
        ]);
        setPatients(patientsRes.data);
        setDoctors(doctorsRes.data);
        setTestCategories(categoriesRes.data);
        setAvailableTests(testsRes.data);
        setLoading(false);
      } catch (err) {
        setError('Error loading form data');
        setLoading(false);
        console.error(err);
      }
    };
    fetchInitialData();
  }, []);

  // Load appointments when patient changes
  useEffect(() => {
    if (formData.patient) {
      const fetchAppointments = async () => {
        try {
          const response = await appointmentService.getAll({ patient: formData.patient, page_size: 50 });
          setAppointments(response.data);
        } catch (err) {
          console.error('Error fetching appointments', err);
          setAppointments([]);
        }
      };
      fetchAppointments();
    } else {
      setAppointments([]);
    }
  }, [formData.patient]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTestToggle = (testId) => {
    setSelectedTests(prev => {
      if (prev.includes(testId)) {
        return prev.filter(id => id !== testId);
      }
      return [...prev, testId];
    });
  };

  const getTotal = () => {
    return availableTests
      .filter(t => selectedTests.includes(t.id))
      .reduce((sum, t) => sum + parseFloat(t.price || 0), 0);
  };

  const getTestsByCategory = (categoryId) => {
    return availableTests.filter(t => {
      const testCat = t.category?.id || t.category;
      return testCat === categoryId;
    });
  };

  // Tests without a category
  const getUncategorizedTests = () => {
    const categoryIds = testCategories.map(c => c.id);
    return availableTests.filter(t => {
      const testCat = t.category?.id || t.category;
      return !testCat || !categoryIds.includes(testCat);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedTests.length === 0) {
      setError('Please select at least one test');
      return;
    }
    setSubmitting(true);
    try {
      const data = {
        patient: formData.patient,
        doctor: formData.doctor,
        priority: formData.priority,
        clinical_notes: formData.clinical_notes,
        tests: selectedTests,
      };
      if (formData.appointment) {
        data.appointment = formData.appointment;
      }
      await labService.createOrder(data);
      navigate('/lab/orders');
    } catch (err) {
      setError('Error creating lab order');
      setSubmitting(false);
      console.error(err);
    }
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;

  const uncategorizedTests = getUncategorizedTests();

  return (
    <div className="container mt-4">
      <h2>New Lab Order</h2>
      {error && <div className="alert alert-danger alert-dismissible">
        {error}
        <button type="button" className="btn-close" onClick={() => setError(null)}></button>
      </div>}

      <form onSubmit={handleSubmit}>
        <div className="row mb-3">
          <div className="col-md-6">
            <label htmlFor="patient" className="form-label">Patient *</label>
            <select
              className="form-select"
              id="patient"
              name="patient"
              value={formData.patient}
              onChange={handleChange}
              required
            >
              <option value="">Select Patient</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label htmlFor="doctor" className="form-label">Doctor *</label>
            <select
              className="form-select"
              id="doctor"
              name="doctor"
              value={formData.doctor}
              onChange={handleChange}
              required
            >
              <option value="">Select Doctor</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  Dr. {d.first_name} {d.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="row mb-3">
          <div className="col-md-6">
            <label htmlFor="appointment" className="form-label">Appointment (Optional)</label>
            <select
              className="form-select"
              id="appointment"
              name="appointment"
              value={formData.appointment}
              onChange={handleChange}
            >
              <option value="">No Appointment</option>
              {appointments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.appointment_date} - {a.appointment_time} ({a.status})
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label htmlFor="priority" className="form-label">Priority *</label>
            <select
              className="form-select"
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              required
            >
              <option value="ROUTINE">Routine</option>
              <option value="URGENT">Urgent</option>
              <option value="STAT">STAT</option>
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="clinical_notes" className="form-label">Clinical Notes</label>
          <textarea
            className="form-control"
            id="clinical_notes"
            name="clinical_notes"
            value={formData.clinical_notes}
            onChange={handleChange}
            rows="3"
            placeholder="Enter any clinical notes or special instructions..."
          ></textarea>
        </div>

        {/* Test Selection */}
        <div className="card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Select Tests</h5>
            <span className="badge bg-primary">{selectedTests.length} selected</span>
          </div>
          <div className="card-body">
            {testCategories.map(cat => {
              const testsInCat = getTestsByCategory(cat.id);
              if (testsInCat.length === 0) return null;
              return (
                <div key={cat.id} className="mb-4">
                  <h6 className="border-bottom pb-2 text-primary">{cat.name}</h6>
                  <div className="row">
                    {testsInCat.map(test => (
                      <div key={test.id} className="col-md-4 mb-2">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id={`test-${test.id}`}
                            checked={selectedTests.includes(test.id)}
                            onChange={() => handleTestToggle(test.id)}
                          />
                          <label className="form-check-label" htmlFor={`test-${test.id}`}>
                            {test.name}
                            <span className="text-muted ms-1">(₹{parseFloat(test.price || 0).toFixed(2)})</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {uncategorizedTests.length > 0 && (
              <div className="mb-4">
                <h6 className="border-bottom pb-2 text-secondary">Other Tests</h6>
                <div className="row">
                  {uncategorizedTests.map(test => (
                    <div key={test.id} className="col-md-4 mb-2">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`test-${test.id}`}
                          checked={selectedTests.includes(test.id)}
                          onChange={() => handleTestToggle(test.id)}
                        />
                        <label className="form-check-label" htmlFor={`test-${test.id}`}>
                          {test.name}
                          <span className="text-muted ms-1">(₹{parseFloat(test.price || 0).toFixed(2)})</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {availableTests.length === 0 && (
              <div className="alert alert-info mb-0">No tests available</div>
            )}
          </div>
        </div>

        {/* Total */}
        <div className="card mb-4">
          <div className="card-body d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Estimated Total</h5>
            <h4 className="mb-0 text-primary">₹{getTotal().toFixed(2)}</h4>
          </div>
        </div>

        <div className="d-flex gap-2 mt-4">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Lab Order'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/lab/orders')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default LabOrderForm;
