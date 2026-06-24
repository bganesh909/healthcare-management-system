import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { pharmacyService } from '../../services/api';

const PharmacyDashboard = () => {
  const [stats, setStats] = useState({ total: 0, inStock: 0, lowStock: 0, outOfStock: 0, expired: 0, pendingOrders: 0 });
  const [allMedicines, setAllMedicines] = useState([]);
  const [lowStockMedicines, setLowStockMedicines] = useState([]);
  const [outOfStockMedicines, setOutOfStockMedicines] = useState([]);
  const [expiredMedicines, setExpiredMedicines] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [alertDismissed, setAlertDismissed] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, lowRes, expRes, ordersRes] = await Promise.all([
        pharmacyService.getAll({ page_size: 500 }),
        pharmacyService.getLowStock(),
        pharmacyService.getExpired(),
        pharmacyService.getOrders({ page_size: 20 }),
      ]);

      const medicines = allRes.data || [];
      const lowData = lowRes.data?.results || lowRes.data || [];
      const expData = expRes.data?.results || expRes.data || [];
      const orders = ordersRes.data || [];

      const outOfStock = medicines.filter(m => m.stock_quantity <= 0);
      const lowStock = medicines.filter(m => m.stock_quantity > 0 && m.stock_quantity <= (m.reorder_level || 10));
      const inStock = medicines.filter(m => m.stock_quantity > (m.reorder_level || 10));

      setAllMedicines(medicines);
      setLowStockMedicines(Array.isArray(lowData) ? lowData : lowStock);
      setOutOfStockMedicines(outOfStock);
      setExpiredMedicines(Array.isArray(expData) ? expData : []);
      setRecentOrders(orders.slice(0, 15));

      setStats({
        total: medicines.length,
        inStock: inStock.length,
        lowStock: lowStock.length,
        outOfStock: outOfStock.length,
        expired: Array.isArray(expData) ? expData.length : 0,
        pendingOrders: orders.filter(o => o.status === 'PENDING' || o.status === 'PROCESSING').length,
      });
    } catch (err) {
      setError('Failed to load pharmacy data.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getStockStatus = (medicine) => {
    if (medicine.stock_quantity <= 0) return { label: 'Out of Stock', color: 'danger', icon: 'fa-times-circle', bg: '#fef2f2' };
    if (medicine.stock_quantity <= (medicine.reorder_level || 10)) return { label: 'Low Stock', color: 'warning', icon: 'fa-exclamation-triangle', bg: '#fffbeb' };
    return { label: 'In Stock', color: 'success', icon: 'fa-check-circle', bg: '#ecfdf5' };
  };

  const getStockPercentage = (medicine) => {
    const max = Math.max((medicine.reorder_level || 10) * 5, medicine.stock_quantity, 100);
    return Math.min((medicine.stock_quantity / max) * 100, 100);
  };

  const formatExpiry = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const now = new Date();
    const days = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    const formatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    if (days < 0) return <span className="text-danger fw-bold">{formatted} (Expired)</span>;
    if (days <= 30) return <span className="text-warning fw-bold">{formatted} ({days}d left)</span>;
    if (days <= 90) return <span className="text-info">{formatted} ({days}d left)</span>;
    return formatted;
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div><p className="mt-2 text-muted">Loading pharmacy data...</p></div>;
  if (error) return <div className="container mt-4"><div className="alert alert-danger">{error} <button className="btn btn-sm btn-danger ms-2" onClick={fetchData}>Retry</button></div></div>;

  const criticalAlerts = stats.outOfStock + stats.lowStock + stats.expired;

  return (
    <div className="container-fluid px-4 mt-4 mb-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="mb-1"><i className="fas fa-pills text-primary me-2"></i>Pharmacy & Inventory</h2>
          <p className="text-muted mb-0">Medicine stock management and alerts</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/pharmacy/medicines" className="btn btn-outline-primary"><i className="fas fa-list me-1"></i>All Medicines</Link>
          <Link to="/pharmacy/medicines/add" className="btn btn-primary"><i className="fas fa-plus me-1"></i>Add Medicine</Link>
        </div>
      </div>

      {/* Critical Alert Banner */}
      {criticalAlerts > 0 && !alertDismissed && (
        <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center justify-content-between mb-4" style={{ borderLeft: '5px solid #dc2626', background: 'linear-gradient(135deg, #fef2f2, #fee2e2)' }}>
          <div>
            <i className="fas fa-exclamation-circle fa-lg me-2"></i>
            <strong>Attention Required!</strong>
            {stats.outOfStock > 0 && <span className="badge bg-danger ms-2"><i className="fas fa-times-circle me-1"></i>{stats.outOfStock} Out of Stock</span>}
            {stats.lowStock > 0 && <span className="badge bg-warning text-dark ms-2"><i className="fas fa-exclamation-triangle me-1"></i>{stats.lowStock} Low Stock</span>}
            {stats.expired > 0 && <span className="badge bg-dark ms-2"><i className="fas fa-calendar-times me-1"></i>{stats.expired} Expired</span>}
          </div>
          <button className="btn btn-sm btn-outline-danger" onClick={() => setAlertDismissed(true)}><i className="fas fa-times"></i></button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Medicines', value: stats.total, icon: 'fa-pills', gradient: 'linear-gradient(135deg, #4361ee, #3a56d4)', click: () => setActiveTab('overview') },
          { label: 'In Stock', value: stats.inStock, icon: 'fa-check-circle', gradient: 'linear-gradient(135deg, #10b981, #059669)', click: () => setActiveTab('instock') },
          { label: 'Low Stock', value: stats.lowStock, icon: 'fa-exclamation-triangle', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', click: () => setActiveTab('lowstock') },
          { label: 'Out of Stock', value: stats.outOfStock, icon: 'fa-times-circle', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', click: () => setActiveTab('outofstock') },
          { label: 'Expired', value: stats.expired, icon: 'fa-calendar-times', gradient: 'linear-gradient(135deg, #6b7280, #4b5563)', click: () => setActiveTab('expired') },
          { label: 'Pending Orders', value: stats.pendingOrders, icon: 'fa-clock', gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', click: () => setActiveTab('orders') },
        ].map((card, i) => (
          <div className="col-6 col-md-4 col-lg-2" key={i}>
            <div className="card border-0 shadow-sm h-100" style={{ cursor: 'pointer', transition: 'all 0.3s' }} onClick={card.click}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <div className="card-body text-center py-3">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2"
                  style={{ width: 45, height: 45, background: card.gradient, color: '#fff' }}>
                  <i className={`fas ${card.icon}`}></i>
                </div>
                <h3 className="mb-0 fw-bold">{card.value}</h3>
                <small className="text-muted">{card.label}</small>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <ul className="nav nav-pills mb-4 gap-2 flex-nowrap overflow-auto pb-1">
        {[
          { id: 'overview', label: 'All Medicines', icon: 'fa-pills', count: stats.total },
          { id: 'instock', label: 'In Stock', icon: 'fa-check-circle', count: stats.inStock },
          { id: 'lowstock', label: 'Low Stock', icon: 'fa-exclamation-triangle', count: stats.lowStock },
          { id: 'outofstock', label: 'Out of Stock', icon: 'fa-times-circle', count: stats.outOfStock },
          { id: 'expired', label: 'Expired', icon: 'fa-calendar-times', count: stats.expired },
          { id: 'orders', label: 'Orders', icon: 'fa-shopping-cart', count: stats.pendingOrders },
        ].map(tab => (
          <li className="nav-item" key={tab.id}>
            <button className={`nav-link d-flex align-items-center gap-1 text-nowrap ${activeTab === tab.id ? 'active' : 'text-dark border bg-white'}`}
              onClick={() => setActiveTab(tab.id)}>
              <i className={`fas ${tab.icon}`}></i> {tab.label}
              {tab.count > 0 && <span className={`badge rounded-pill ms-1 ${activeTab === tab.id ? 'bg-white text-primary' : 'bg-primary text-white'}`} style={{ fontSize: '0.7rem' }}>{tab.count}</span>}
            </button>
          </li>
        ))}
      </ul>

      {/* Medicine Table */}
      {(activeTab === 'overview' || activeTab === 'instock' || activeTab === 'lowstock' || activeTab === 'outofstock') && (
        <div className="card shadow-sm">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0">
              <i className={`fas ${activeTab === 'instock' ? 'fa-check-circle text-success' : activeTab === 'lowstock' ? 'fa-exclamation-triangle text-warning' : activeTab === 'outofstock' ? 'fa-times-circle text-danger' : 'fa-pills text-primary'} me-2`}></i>
              {activeTab === 'instock' ? 'In Stock Medicines' : activeTab === 'lowstock' ? 'Low Stock Medicines' : activeTab === 'outofstock' ? 'Out of Stock Medicines' : 'All Medicines'}
            </h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-bordered align-middle mb-0" style={{ fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f4f8' }}>
                    <th className="py-2 px-3" style={{ width: '40px' }}>#</th>
                    <th className="py-2 px-3">Medicine Name</th>
                    <th className="py-2 px-3">Generic</th>
                    <th className="py-2 px-3">Form</th>
                    <th className="py-2 px-3">Strength</th>
                    <th className="py-2 px-3">Price (₹)</th>
                    <th className="py-2 px-3" style={{ minWidth: '180px' }}>Stock Level</th>
                    <th className="py-2 px-3">Reorder At</th>
                    <th className="py-2 px-3">Expiry</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let filtered = allMedicines;
                    if (activeTab === 'instock') filtered = allMedicines.filter(m => m.stock_quantity > (m.reorder_level || 10));
                    if (activeTab === 'lowstock') filtered = allMedicines.filter(m => m.stock_quantity > 0 && m.stock_quantity <= (m.reorder_level || 10));
                    if (activeTab === 'outofstock') filtered = allMedicines.filter(m => m.stock_quantity <= 0);

                    if (filtered.length === 0) return (
                      <tr><td colSpan="10" className="text-center py-5 text-muted">
                        <i className="fas fa-box-open fa-3x mb-3 d-block opacity-50"></i>No medicines found
                      </td></tr>
                    );

                    return filtered.map((med, i) => {
                      const stock = getStockStatus(med);
                      const pct = getStockPercentage(med);
                      return (
                        <tr key={med.id} style={{ backgroundColor: stock.color === 'danger' ? '#fef2f2' : stock.color === 'warning' ? '#fffbeb' : '' }}>
                          <td className="px-3 text-muted">{i + 1}</td>
                          <td className="px-3 fw-semibold">{med.name}</td>
                          <td className="px-3 text-muted">{med.generic_name || '-'}</td>
                          <td className="px-3">{med.form || '-'}</td>
                          <td className="px-3">{med.strength || '-'}</td>
                          <td className="px-3">₹{parseFloat(med.unit_price || 0).toFixed(2)}</td>
                          <td className="px-3">
                            <div className="d-flex align-items-center gap-2">
                              <div className="flex-grow-1">
                                <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                                  <div className={`progress-bar bg-${stock.color}`} style={{ width: `${pct}%`, transition: 'width 1s' }}></div>
                                </div>
                              </div>
                              <span className={`fw-bold text-${stock.color}`} style={{ minWidth: '35px', textAlign: 'right' }}>{med.stock_quantity}</span>
                            </div>
                          </td>
                          <td className="px-3 text-muted">{med.reorder_level || 10}</td>
                          <td className="px-3">{formatExpiry(med.expiry_date)}</td>
                          <td className="px-3">
                            <span className={`badge bg-${stock.color} ${stock.color === 'warning' ? 'text-dark' : ''}`}>
                              <i className={`fas ${stock.icon} me-1`}></i>{stock.label}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Expired Tab */}
      {activeTab === 'expired' && (
        <div className="card shadow-sm">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0"><i className="fas fa-calendar-times text-danger me-2"></i>Expired Medicines</h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-bordered align-middle mb-0" style={{ fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fef2f2' }}>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Medicine</th>
                    <th className="py-2 px-3">Generic</th>
                    <th className="py-2 px-3">Form</th>
                    <th className="py-2 px-3">Stock Qty</th>
                    <th className="py-2 px-3">Expiry Date</th>
                    <th className="py-2 px-3">Days Expired</th>
                    <th className="py-2 px-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expiredMedicines.length === 0 ? (
                    <tr><td colSpan="8" className="text-center py-5 text-muted">
                      <i className="fas fa-check-circle fa-3x text-success mb-3 d-block opacity-50"></i>No expired medicines
                    </td></tr>
                  ) : expiredMedicines.map((med, i) => {
                    const days = med.expiry_date ? Math.abs(Math.ceil((new Date() - new Date(med.expiry_date)) / (1000 * 60 * 60 * 24))) : 0;
                    return (
                      <tr key={med.id} style={{ backgroundColor: '#fef2f2' }}>
                        <td className="px-3">{i + 1}</td>
                        <td className="px-3 fw-semibold">{med.name}</td>
                        <td className="px-3">{med.generic_name || '-'}</td>
                        <td className="px-3">{med.form || '-'}</td>
                        <td className="px-3"><span className="badge bg-secondary">{med.stock_quantity}</span></td>
                        <td className="px-3 text-danger fw-bold">{med.expiry_date ? new Date(med.expiry_date).toLocaleDateString('en-IN') : '-'}</td>
                        <td className="px-3"><span className="badge bg-danger">{days} days ago</span></td>
                        <td className="px-3"><span className="badge bg-dark">Dispose</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="card shadow-sm">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0"><i className="fas fa-shopping-cart text-info me-2"></i>Medicine Orders</h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-bordered align-middle mb-0" style={{ fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f4f8' }}>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Order No</th>
                    <th className="py-2 px-3">Patient</th>
                    <th className="py-2 px-3">Prescribed By</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Amount (₹)</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr><td colSpan="7" className="text-center py-5 text-muted">No orders found</td></tr>
                  ) : recentOrders.map((order, i) => (
                    <tr key={order.id}>
                      <td className="px-3">{i + 1}</td>
                      <td className="px-3 fw-semibold">{order.order_number || order.id}</td>
                      <td className="px-3">{order.patient_name || '-'}</td>
                      <td className="px-3">{order.prescribed_by_name || '-'}</td>
                      <td className="px-3">{order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : '-'}</td>
                      <td className="px-3">₹{parseFloat(order.total_amount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-3">
                        <span className={`badge ${order.status === 'DISPENSED' ? 'bg-success' : order.status === 'CANCELLED' ? 'bg-danger' : order.status === 'PROCESSING' ? 'bg-info' : 'bg-warning text-dark'}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stock Summary at Bottom */}
      <div className="row g-3 mt-4">
        <div className="col-md-4">
          <div className="card shadow-sm h-100" style={{ borderLeft: '4px solid #10b981' }}>
            <div className="card-body">
              <h6 className="text-muted mb-3"><i className="fas fa-chart-pie me-2"></i>Stock Distribution</h6>
              <div className="mb-2 d-flex justify-content-between align-items-center">
                <span><i className="fas fa-circle text-success me-2" style={{ fontSize: '0.5rem' }}></i>In Stock</span>
                <span className="fw-bold">{stats.total > 0 ? Math.round((stats.inStock / stats.total) * 100) : 0}%</span>
              </div>
              <div className="progress mb-3" style={{ height: '10px' }}>
                <div className="progress-bar bg-success" style={{ width: `${stats.total > 0 ? (stats.inStock / stats.total) * 100 : 0}%` }}></div>
                <div className="progress-bar bg-warning" style={{ width: `${stats.total > 0 ? (stats.lowStock / stats.total) * 100 : 0}%` }}></div>
                <div className="progress-bar bg-danger" style={{ width: `${stats.total > 0 ? (stats.outOfStock / stats.total) * 100 : 0}%` }}></div>
              </div>
              <div className="d-flex justify-content-between" style={{ fontSize: '0.8rem' }}>
                <span className="text-success"><i className="fas fa-circle me-1" style={{ fontSize: '0.4rem' }}></i>In Stock: {stats.inStock}</span>
                <span className="text-warning"><i className="fas fa-circle me-1" style={{ fontSize: '0.4rem' }}></i>Low: {stats.lowStock}</span>
                <span className="text-danger"><i className="fas fa-circle me-1" style={{ fontSize: '0.4rem' }}></i>Out: {stats.outOfStock}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm h-100" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div className="card-body">
              <h6 className="text-muted mb-3"><i className="fas fa-exclamation-triangle me-2"></i>Reorder Alerts</h6>
              {lowStockMedicines.length === 0 ? (
                <p className="text-success mb-0"><i className="fas fa-check-circle me-1"></i>All medicines adequately stocked</p>
              ) : (
                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  {lowStockMedicines.slice(0, 8).map(med => (
                    <div key={med.id} className="d-flex justify-content-between align-items-center py-1 border-bottom" style={{ fontSize: '0.85rem' }}>
                      <span className="text-truncate me-2">{med.name}</span>
                      <span className="badge bg-warning text-dark">{med.stock_quantity} left</span>
                    </div>
                  ))}
                  {lowStockMedicines.length > 8 && <p className="text-muted mt-1 mb-0" style={{ fontSize: '0.8rem' }}>+{lowStockMedicines.length - 8} more...</p>}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm h-100" style={{ borderLeft: '4px solid #ef4444' }}>
            <div className="card-body">
              <h6 className="text-muted mb-3"><i className="fas fa-times-circle me-2"></i>Out of Stock - Reorder Now</h6>
              {outOfStockMedicines.length === 0 ? (
                <p className="text-success mb-0"><i className="fas fa-check-circle me-1"></i>No medicines out of stock</p>
              ) : (
                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  {outOfStockMedicines.slice(0, 8).map(med => (
                    <div key={med.id} className="d-flex justify-content-between align-items-center py-1 border-bottom" style={{ fontSize: '0.85rem' }}>
                      <span className="text-truncate me-2 text-danger">{med.name}</span>
                      <span className="badge bg-danger">0 qty</span>
                    </div>
                  ))}
                  {outOfStockMedicines.length > 8 && <p className="text-muted mt-1 mb-0" style={{ fontSize: '0.8rem' }}>+{outOfStockMedicines.length - 8} more...</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyDashboard;
