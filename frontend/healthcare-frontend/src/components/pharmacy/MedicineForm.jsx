import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pharmacyService } from '../../services/api';

const FORM_OPTIONS = [
  { value: 'TABLET', label: 'Tablet' },
  { value: 'CAPSULE', label: 'Capsule' },
  { value: 'SYRUP', label: 'Syrup' },
  { value: 'INJECTION', label: 'Injection' },
  { value: 'CREAM', label: 'Cream' },
  { value: 'DROPS', label: 'Drops' },
  { value: 'INHALER', label: 'Inhaler' },
  { value: 'OTHER', label: 'Other' },
];

const MedicineForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    generic_name: '',
    category: '',
    manufacturer: '',
    form: '',
    strength: '',
    unit_price: '',
    stock_quantity: '',
    reorder_level: '',
    expiry_date: '',
    requires_prescription: false,
    is_active: true,
  });

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await pharmacyService.getCategories({ page_size: 100 });
        setCategories(response.data);
      } catch (err) {
        console.error('Error fetching categories', err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (isEditMode) {
      const fetchMedicine = async () => {
        try {
          const response = await pharmacyService.get(id);
          const data = response.data;
          setFormData({
            name: data.name || '',
            generic_name: data.generic_name || '',
            category: data.category?.id || data.category || '',
            manufacturer: data.manufacturer || '',
            form: data.form || '',
            strength: data.strength || '',
            unit_price: data.unit_price || '',
            stock_quantity: data.stock_quantity || '',
            reorder_level: data.reorder_level || '',
            expiry_date: data.expiry_date || '',
            requires_prescription: data.requires_prescription || false,
            is_active: data.is_active !== undefined ? data.is_active : true,
          });
          setLoading(false);
        } catch (err) {
          setError('Error fetching medicine data');
          setLoading(false);
          console.error(err);
        }
      };
      fetchMedicine();
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = {
        ...formData,
        unit_price: parseFloat(formData.unit_price),
        stock_quantity: parseInt(formData.stock_quantity, 10),
        reorder_level: formData.reorder_level ? parseInt(formData.reorder_level, 10) : 0,
      };
      if (isEditMode) {
        await pharmacyService.update(id, data);
      } else {
        await pharmacyService.create(data);
      }
      navigate('/pharmacy/medicines');
    } catch (err) {
      setError('Error saving medicine data');
      setSubmitting(false);
      console.error(err);
    }
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;

  return (
    <div className="container mt-4">
      <h2>{isEditMode ? 'Edit Medicine' : 'Add New Medicine'}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="row mb-3">
          <div className="col-md-6">
            <label htmlFor="name" className="form-label">Name *</label>
            <input
              type="text"
              className="form-control"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="generic_name" className="form-label">Generic Name</label>
            <input
              type="text"
              className="form-control"
              id="generic_name"
              name="generic_name"
              value={formData.generic_name}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="row mb-3">
          <div className="col-md-6">
            <label htmlFor="category" className="form-label">Category *</label>
            <select
              className="form-select"
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">Select Category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label htmlFor="manufacturer" className="form-label">Manufacturer</label>
            <input
              type="text"
              className="form-control"
              id="manufacturer"
              name="manufacturer"
              value={formData.manufacturer}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="row mb-3">
          <div className="col-md-6">
            <label htmlFor="form" className="form-label">Form *</label>
            <select
              className="form-select"
              id="form"
              name="form"
              value={formData.form}
              onChange={handleChange}
              required
            >
              <option value="">Select Form</option>
              {FORM_OPTIONS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label htmlFor="strength" className="form-label">Strength</label>
            <input
              type="text"
              className="form-control"
              id="strength"
              name="strength"
              value={formData.strength}
              onChange={handleChange}
              placeholder="e.g., 500mg, 10ml"
            />
          </div>
        </div>

        <div className="row mb-3">
          <div className="col-md-4">
            <label htmlFor="unit_price" className="form-label">Unit Price (INR) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-control"
              id="unit_price"
              name="unit_price"
              value={formData.unit_price}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-4">
            <label htmlFor="stock_quantity" className="form-label">Stock Quantity *</label>
            <input
              type="number"
              min="0"
              className="form-control"
              id="stock_quantity"
              name="stock_quantity"
              value={formData.stock_quantity}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-4">
            <label htmlFor="reorder_level" className="form-label">Reorder Level</label>
            <input
              type="number"
              min="0"
              className="form-control"
              id="reorder_level"
              name="reorder_level"
              value={formData.reorder_level}
              onChange={handleChange}
              placeholder="Minimum stock before reorder"
            />
          </div>
        </div>

        <div className="row mb-3">
          <div className="col-md-6">
            <label htmlFor="expiry_date" className="form-label">Expiry Date</label>
            <input
              type="date"
              className="form-control"
              id="expiry_date"
              name="expiry_date"
              value={formData.expiry_date}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="row mb-3">
          <div className="col-md-6">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="requires_prescription"
                name="requires_prescription"
                checked={formData.requires_prescription}
                onChange={handleChange}
              />
              <label className="form-check-label" htmlFor="requires_prescription">
                Requires Prescription
              </label>
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
              <label className="form-check-label" htmlFor="is_active">
                Active
              </label>
            </div>
          </div>
        </div>

        <div className="d-flex gap-2 mt-4">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : (isEditMode ? 'Update Medicine' : 'Add Medicine')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/pharmacy/medicines')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default MedicineForm;
