import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { billingService, patientService, appointmentService } from '../../services/api';

const ITEM_TYPES = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'PROCEDURE', label: 'Procedure' },
  { value: 'LAB_TEST', label: 'Lab Test' },
  { value: 'MEDICATION', label: 'Medication' },
  { value: 'ROOM_CHARGE', label: 'Room Charge' },
  { value: 'OTHER', label: 'Other' }
];

const emptyLineItem = {
  description: '',
  item_type: 'CONSULTATION',
  quantity: 1,
  unit_price: ''
};

const InvoiceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    patient: '',
    appointment: '',
    due_date: '',
    tax_percentage: '0',
    discount: '0',
    notes: '',
    items: [{ ...emptyLineItem }]
  });

  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const patientsRes = await patientService.getAll();
        setPatients(patientsRes.data);

        if (isEditMode) {
          const response = await billingService.get(id);
          const invoice = response.data;
          const invoiceItems = invoice.items || invoice.line_items || [];

          setFormData({
            patient: invoice.patient?.id || invoice.patient || '',
            appointment: invoice.appointment?.id || invoice.appointment || '',
            due_date: invoice.due_date || '',
            tax_percentage: invoice.tax_percentage || invoice.tax_rate || '0',
            discount: invoice.discount_amount || invoice.discount || '0',
            notes: invoice.notes || '',
            items: invoiceItems.length > 0
              ? invoiceItems.map(item => ({
                  description: item.description || '',
                  item_type: item.item_type || 'CONSULTATION',
                  quantity: item.quantity || 1,
                  unit_price: item.unit_price || ''
                }))
              : [{ ...emptyLineItem }]
          });

          // Load appointments for the patient
          if (invoice.patient) {
            const patientId = invoice.patient?.id || invoice.patient;
            try {
              const apptRes = await appointmentService.getAll({ patient: patientId });
              setAppointments(apptRes.data);
            } catch (err) {
              console.error('Error loading appointments', err);
            }
          }
        }

        setLoading(false);
      } catch (err) {
        setError('Error fetching data');
        setLoading(false);
        console.error(err);
      }
    };
    fetchData();
  }, [id, isEditMode]);

  // Fetch appointments when patient changes
  useEffect(() => {
    const fetchAppointments = async () => {
      if (formData.patient) {
        try {
          const response = await appointmentService.getAll({ patient: formData.patient });
          setAppointments(response.data);
        } catch (err) {
          console.error('Error fetching appointments', err);
          setAppointments([]);
        }
      } else {
        setAppointments([]);
      }
    };
    fetchAppointments();
  }, [formData.patient]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'patient') {
      setFormData(prev => ({ ...prev, patient: value, appointment: '' }));
    }
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [name]: value };
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...emptyLineItem }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Calculate totals
  const subtotal = formData.items.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
  }, 0);

  const taxAmount = subtotal * (parseFloat(formData.tax_percentage) || 0) / 100;
  const discountAmount = parseFloat(formData.discount) || 0;
  const total = subtotal + taxAmount - discountAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const submitData = {
        patient: formData.patient,
        due_date: formData.due_date || null,
        tax_percentage: parseFloat(formData.tax_percentage) || 0,
        discount_amount: parseFloat(formData.discount) || 0,
        notes: formData.notes,
        items: formData.items.map(item => ({
          description: item.description,
          item_type: item.item_type,
          quantity: parseInt(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0
        }))
      };
      if (formData.appointment) {
        submitData.appointment = formData.appointment;
      }

      if (isEditMode) {
        await billingService.update(id, submitData);
      } else {
        await billingService.create(submitData);
      }
      navigate('/billing');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving invoice');
      setSubmitting(false);
      console.error(err);
    }
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;

  return (
    <div className="container mt-4">
      <h2>
        <i className="fas fa-file-invoice-dollar me-2"></i>
        {isEditMode ? 'Edit Invoice' : 'New Invoice'}
      </h2>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* General Info */}
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">General Information</h5>
          </div>
          <div className="card-body">
            <div className="row mb-3">
              <div className="col-md-4">
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
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label htmlFor="appointment" className="form-label">Appointment</label>
                <select
                  className="form-select"
                  id="appointment"
                  name="appointment"
                  value={formData.appointment}
                  onChange={handleChange}
                  disabled={!formData.patient}
                >
                  <option value="">Select Appointment (optional)</option>
                  {appointments.map(appt => (
                    <option key={appt.id} value={appt.id}>
                      {appt.appointment_date} {appt.appointment_time} - Dr. {appt.doctor_name || `${appt.doctor?.first_name || ''} ${appt.doctor?.last_name || ''}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label htmlFor="due_date" className="form-label">Due Date</label>
                <input
                  type="date"
                  className="form-control"
                  id="due_date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="fas fa-list me-2"></i>Line Items</h5>
            <button type="button" className="btn btn-sm btn-success" onClick={addItem}>
              <i className="fas fa-plus me-1"></i> Add Item
            </button>
          </div>
          <div className="card-body">
            {formData.items.map((item, index) => (
              <div key={index} className="border rounded p-3 mb-3 bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="mb-0">Item #{index + 1}</h6>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => removeItem(index)}
                    >
                      <i className="fas fa-times"></i> Remove
                    </button>
                  )}
                </div>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Description *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="description"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, e)}
                      required
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Type *</label>
                    <select
                      className="form-select"
                      name="item_type"
                      value={item.item_type}
                      onChange={(e) => handleItemChange(index, e)}
                      required
                    >
                      {ITEM_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      name="quantity"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, e)}
                      required
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Unit Price *</label>
                    <div className="input-group">
                      <span className="input-group-text">&#8377;</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        name="unit_price"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, e)}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="text-end mt-2">
                  <small className="text-muted">
                    Line Total: <strong>₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}</strong>
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals and Notes */}
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="mb-0">Additional Details</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label htmlFor="tax_percentage" className="form-label">Tax Percentage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="form-control"
                    id="tax_percentage"
                    name="tax_percentage"
                    value={formData.tax_percentage}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="discount" className="form-label">Discount ($)</label>
                  <div className="input-group">
                    <span className="input-group-text">&#8377;</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      id="discount"
                      name="discount"
                      value={formData.discount}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label htmlFor="notes" className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="mb-0"><i className="fas fa-calculator me-2"></i>Totals</h5>
              </div>
              <div className="card-body">
                <table className="table table-borderless mb-0">
                  <tbody>
                    <tr>
                      <td><strong>Subtotal:</strong></td>
                      <td className="text-end">₹{subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td><strong>Tax ({formData.tax_percentage || 0}%):</strong></td>
                      <td className="text-end">₹{taxAmount.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td><strong>Discount:</strong></td>
                      <td className="text-end">-₹{discountAmount.toFixed(2)}</td>
                    </tr>
                    <tr className="border-top">
                      <td><strong>Total:</strong></td>
                      <td className="text-end"><strong>₹{total.toFixed(2)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex gap-2 mt-4 mb-4">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : isEditMode ? 'Update Invoice' : 'Create Invoice'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/billing')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;
