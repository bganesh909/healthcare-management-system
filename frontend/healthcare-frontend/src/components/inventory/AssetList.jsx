import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { inventoryService } from '../../services/api';

const AssetList = () => {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      if (status) params.status = status;
      if (category) params.category = category;
      if (department) params.department = department;
      const response = await inventoryService.getAssets(params);
      setAssets(response.data);
      setPagination({ next: response.next, previous: response.previous, count: response.count });
      setLoading(false);
    } catch (err) {
      setError('Error fetching assets');
      setLoading(false);
    }
  }, [page, search, status, category, department]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await inventoryService.getCategories();
        setCategories(res.data || []);
      } catch (e) {
        // Categories optional
      }
    };
    fetchCategories();
  }, []);

  const getStatusBadgeClass = (s) => {
    switch (s) {
      case 'ACTIVE': return 'bg-success';
      case 'IN_REPAIR': return 'bg-warning text-dark';
      case 'RETIRED': return 'bg-secondary';
      case 'DISPOSED': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  const getConditionStyle = (condition) => {
    switch (condition) {
      case 'EXCELLENT': return { color: '#198754', fontWeight: 'bold' };
      case 'GOOD': return { color: '#0d6efd', fontWeight: 'bold' };
      case 'FAIR': return { color: '#ffc107', fontWeight: 'bold' };
      case 'POOR': return { color: '#dc3545', fontWeight: 'bold' };
      default: return {};
    }
  };

  const getConditionIcon = (condition) => {
    switch (condition) {
      case 'EXCELLENT': return 'fa-circle text-success';
      case 'GOOD': return 'fa-circle text-primary';
      case 'FAIR': return 'fa-circle text-warning';
      case 'POOR': return 'fa-circle text-danger';
      default: return 'fa-circle text-muted';
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setCategory('');
    setDepartment('');
    setPage(1);
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-boxes me-2"></i>Assets</h2>
        <Link to="/inventory/assets/add" className="btn btn-primary">
          <i className="fas fa-plus me-1"></i> Add Asset
        </Link>
      </div>

      {/* Filters */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <div className="input-group">
                <span className="input-group-text"><i className="fas fa-search"></i></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search name, tag, serial..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="IN_REPAIR">In Repair</option>
                <option value="RETIRED">Retired</option>
                <option value="DISPOSED">Disposed</option>
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <input
                type="text"
                className="form-control"
                placeholder="Department..."
                value={department}
                onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-2">
              <button className="btn btn-outline-secondary w-100" onClick={clearFilters}>
                <i className="fas fa-times me-1"></i> Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center mt-5"><div className="spinner-border"></div></div>
      ) : assets.length === 0 ? (
        <div className="alert alert-info">No assets found</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="table-dark">
                <tr>
                  <th>Asset Tag</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Condition</th>
                  <th>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td><code>{asset.asset_tag || '-'}</code></td>
                    <td>{asset.name}</td>
                    <td>{asset.category_name || asset.category?.name || '-'}</td>
                    <td>{asset.asset_type_display || asset.asset_type || '-'}</td>
                    <td>{asset.department_name || asset.department?.name || '-'}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(asset.status)}`}>
                        {asset.status_display || asset.status}
                      </span>
                    </td>
                    <td>
                      <i className={`fas ${getConditionIcon(asset.condition)} me-1`} style={{ fontSize: '0.6rem' }}></i>
                      <span style={getConditionStyle(asset.condition)}>
                        {asset.condition_display || asset.condition || '-'}
                      </span>
                    </td>
                    <td>{asset.location || '-'}</td>
                    <td>
                      <Link to={`/inventory/assets/${asset.id}`} className="btn btn-sm btn-info">
                        <i className="fas fa-eye"></i>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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

export default AssetList;
