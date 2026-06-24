import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { inventoryService } from '../../services/api';

const InventoryDashboard = () => {
  const [assets, setAssets] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [categories, setCategories] = useState([]);
  const [maintenanceDue, setMaintenanceDue] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [assetsRes, categoriesRes, maintenanceRes, poRes] = await Promise.all([
          inventoryService.getAssets(),
          inventoryService.getCategories(),
          inventoryService.getMaintenanceDue(),
          inventoryService.getPurchaseOrders({ page: 1 }),
        ]);
        setAssets(assetsRes.data || []);
        setCategories(categoriesRes.data || []);
        setMaintenanceDue(maintenanceRes.data?.results || maintenanceRes.data || []);
        setPurchaseOrders(poRes.data || []);
        setLoading(false);
      } catch (err) {
        setError('Error loading inventory dashboard data');
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const allAssets = Array.isArray(assets) ? assets : [];
  const totalAssets = allAssets.length;
  const activeAssets = allAssets.filter(a => a.status === 'ACTIVE').length;
  const inRepairAssets = allAssets.filter(a => a.status === 'IN_REPAIR').length;
  const maintenanceDueCount = Array.isArray(maintenanceDue) ? maintenanceDue.length : 0;

  // Assets by category
  const assetsByCategory = {};
  allAssets.forEach(asset => {
    const catName = asset.category_name || asset.category?.name || 'Uncategorized';
    assetsByCategory[catName] = (assetsByCategory[catName] || 0) + 1;
  });

  // Warranty expiring soon (within 30 days)
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const warrantyExpiring = allAssets.filter(a => {
    if (!a.warranty_expiry) return false;
    const expiry = new Date(a.warranty_expiry);
    return expiry >= now && expiry <= thirtyDaysFromNow;
  });

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
        <h2><i className="fas fa-warehouse me-2"></i>Inventory Dashboard</h2>
        <div>
          <Link to="/inventory/assets/add" className="btn btn-primary me-2">
            <i className="fas fa-plus me-1"></i> Add Asset
          </Link>
          <Link to="/inventory/purchase-orders/add" className="btn btn-outline-primary me-2">
            <i className="fas fa-file-invoice me-1"></i> Create PO
          </Link>
          <Link to="/inventory/maintenance/add" className="btn btn-outline-warning">
            <i className="fas fa-wrench me-1"></i> Log Maintenance
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm border-start border-primary border-4">
            <div className="card-body text-center">
              <i className="fas fa-boxes fa-2x text-primary mb-2"></i>
              <h3 className="text-primary">{totalAssets}</h3>
              <div className="text-muted">Total Assets</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-start border-success border-4">
            <div className="card-body text-center">
              <i className="fas fa-check-circle fa-2x text-success mb-2"></i>
              <h3 className="text-success">{activeAssets}</h3>
              <div className="text-muted">Active</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-start border-warning border-4">
            <div className="card-body text-center">
              <i className="fas fa-tools fa-2x text-warning mb-2"></i>
              <h3 className="text-warning">{inRepairAssets}</h3>
              <div className="text-muted">In Repair</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-start border-danger border-4">
            <div className="card-body text-center">
              <i className="fas fa-exclamation-triangle fa-2x text-danger mb-2"></i>
              <h3 className="text-danger">{maintenanceDueCount}</h3>
              <div className="text-muted">Maintenance Due</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Assets by Category */}
        <div className="col-md-4">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0"><i className="fas fa-chart-pie me-2"></i>Assets by Category</h5>
            </div>
            <div className="card-body">
              {Object.keys(assetsByCategory).length === 0 ? (
                <p className="text-muted text-center">No data available</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {Object.entries(assetsByCategory).map(([catName, count]) => (
                    <li key={catName} className="list-group-item d-flex justify-content-between align-items-center">
                      {catName}
                      <span className="badge bg-primary rounded-pill">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Maintenance Due */}
        <div className="col-md-4">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-warning text-dark">
              <h5 className="mb-0"><i className="fas fa-wrench me-2"></i>Maintenance Due Soon</h5>
            </div>
            <div className="card-body">
              {maintenanceDueCount === 0 ? (
                <p className="text-muted text-center">No maintenance due</p>
              ) : (
                <div className="list-group list-group-flush">
                  {(Array.isArray(maintenanceDue) ? maintenanceDue : []).slice(0, 8).map((asset) => (
                    <Link
                      key={asset.id}
                      to={`/inventory/assets/${asset.id}`}
                      className="list-group-item list-group-item-action list-group-item-warning"
                    >
                      <div className="d-flex justify-content-between">
                        <div>
                          <strong>{asset.name}</strong>
                          <br />
                          <small>{asset.asset_tag || ''}</small>
                        </div>
                        <small>{asset.next_maintenance_date ? new Date(asset.next_maintenance_date).toLocaleDateString() : 'Overdue'}</small>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-md-4">
          {/* Warranty Expiring */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-danger text-white">
              <h5 className="mb-0"><i className="fas fa-shield-alt me-2"></i>Warranty Expiring Soon</h5>
            </div>
            <div className="card-body">
              {warrantyExpiring.length === 0 ? (
                <p className="text-muted text-center">No warranties expiring soon</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {warrantyExpiring.slice(0, 5).map((asset) => (
                    <li key={asset.id} className="list-group-item">
                      <div className="d-flex justify-content-between">
                        <div>
                          <strong>{asset.name}</strong>
                          <br />
                          <small className="text-muted">{asset.asset_tag}</small>
                        </div>
                        <small className="text-danger">
                          {new Date(asset.warranty_expiry).toLocaleDateString()}
                        </small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Recent Purchase Orders */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0"><i className="fas fa-file-invoice-dollar me-2"></i>Recent Purchase Orders</h5>
            </div>
            <div className="card-body">
              {purchaseOrders.length === 0 ? (
                <p className="text-muted text-center">No purchase orders</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {purchaseOrders.slice(0, 5).map((po) => (
                    <li key={po.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{po.po_number || `PO-${po.id}`}</strong>
                        <br />
                        <small className="text-muted">{po.vendor_name || po.vendor?.name || '-'}</small>
                      </div>
                      <span className={`badge ${
                        po.status === 'APPROVED' ? 'bg-success' :
                        po.status === 'PENDING' ? 'bg-warning text-dark' :
                        po.status === 'DELIVERED' ? 'bg-info' : 'bg-secondary'
                      }`}>
                        {po.status_display || po.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;
