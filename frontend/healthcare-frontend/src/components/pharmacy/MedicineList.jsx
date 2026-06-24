import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { pharmacyService } from '../../services/api';

const FORM_OPTIONS = [
  { value: '', label: 'All Forms' },
  { value: 'TABLET', label: 'Tablet' },
  { value: 'CAPSULE', label: 'Capsule' },
  { value: 'SYRUP', label: 'Syrup' },
  { value: 'INJECTION', label: 'Injection' },
  { value: 'CREAM', label: 'Cream' },
  { value: 'DROPS', label: 'Drops' },
  { value: 'INHALER', label: 'Inhaler' },
  { value: 'OTHER', label: 'Other' },
];

const MedicineList = () => {
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [form, setForm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });

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

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      if (category) params.category = category;
      if (form) params.form = form;
      const response = await pharmacyService.getAll(params);
      setMedicines(response.data);
      setPagination({ next: response.next, previous: response.previous, count: response.count });
      setLoading(false);
    } catch (err) {
      setError('Error fetching medicines');
      setLoading(false);
    }
  }, [page, search, category, form]);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this medicine?')) {
      try {
        await pharmacyService.delete(id);
        setMedicines(medicines.filter(m => m.id !== id));
      } catch (err) {
        setError('Error deleting medicine');
      }
    }
  };

  const getStockBadge = (medicine) => {
    if (medicine.stock_quantity <= 0) {
      return <span className="badge bg-danger">Out of Stock</span>;
    }
    if (medicine.stock_quantity <= (medicine.reorder_level || 10)) {
      return <span className="badge bg-danger">Low Stock ({medicine.stock_quantity})</span>;
    }
    return <span className="badge bg-success">{medicine.stock_quantity}</span>;
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setForm('');
    setPage(1);
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Medicines</h2>
        <div>
          <Link to="/pharmacy" className="btn btn-outline-info me-2">Dashboard</Link>
          <Link to="/pharmacy/medicines/add" className="btn btn-primary">Add Medicine</Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text"><i className="fas fa-search"></i></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={form}
                onChange={(e) => { setForm(e.target.value); setPage(1); }}
              >
                {FORM_OPTIONS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-outline-secondary w-100" onClick={clearFilters}>
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center mt-5"><div className="spinner-border"></div></div>
      ) : medicines.length === 0 ? (
        <div className="alert alert-info">No medicines found</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="table-primary">
                <tr>
                  <th>Name</th>
                  <th>Generic Name</th>
                  <th>Category</th>
                  <th>Form</th>
                  <th>Strength</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((medicine) => (
                  <tr key={medicine.id}>
                    <td>{medicine.name}</td>
                    <td>{medicine.generic_name || 'N/A'}</td>
                    <td>{medicine.category_name || (medicine.category && medicine.category.name) || 'N/A'}</td>
                    <td>{medicine.form_display || medicine.form || 'N/A'}</td>
                    <td>{medicine.strength || 'N/A'}</td>
                    <td>₹{parseFloat(medicine.unit_price || 0).toFixed(2)}</td>
                    <td>{getStockBadge(medicine)}</td>
                    <td>
                      <span className={`badge ${medicine.is_active ? 'bg-success' : 'bg-secondary'}`}>
                        {medicine.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/pharmacy/medicines/${medicine.id}`} className="btn btn-sm btn-info me-1">View</Link>
                      <Link to={`/pharmacy/medicines/edit/${medicine.id}`} className="btn btn-sm btn-warning me-1">Edit</Link>
                      <button onClick={() => handleDelete(medicine.id)} className="btn btn-sm btn-danger">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(pagination.previous || pagination.next) && (
            <nav className="mt-3">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${!pagination.previous ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => p - 1)}>Previous</button>
                </li>
                <li className="page-item disabled">
                  <span className="page-link">Page {page} ({pagination.count} total)</span>
                </li>
                <li className={`page-item ${!pagination.next ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => p + 1)}>Next</button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  );
};

export default MedicineList;
