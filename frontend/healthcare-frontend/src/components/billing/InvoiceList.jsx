import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { billingService } from '../../services/api';

const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const response = await billingService.getAll(params);
      setInvoices(response.data);
      setPagination({ next: response.next, previous: response.previous, count: response.count });
      setLoading(false);
    } catch (err) {
      setError('Error fetching invoices');
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await billingService.delete(id);
        setInvoices(invoices.filter(inv => inv.id !== id));
      } catch (err) {
        setError('Error deleting invoice');
      }
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'DRAFT': return 'bg-secondary';
      case 'PENDING': return 'bg-warning text-dark';
      case 'PAID': return 'bg-success';
      case 'OVERDUE': return 'bg-danger';
      case 'CANCELLED': return 'bg-dark';
      default: return 'bg-secondary';
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPage(1);
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toFixed(2);
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-file-invoice-dollar me-2"></i>Invoices</h2>
        <Link to="/billing/add" className="btn btn-primary">
          <i className="fas fa-plus me-1"></i> New Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text"><i className="fas fa-search"></i></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by invoice number or patient name..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="col-md-3">
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
      ) : invoices.length === 0 ? (
        <div className="alert alert-info">No invoices found</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="table-primary">
                <tr>
                  <th>Invoice #</th>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoice_number || invoice.id}</td>
                    <td>
                      {invoice.patient_name ||
                        `${invoice.patient?.first_name || ''} ${invoice.patient?.last_name || ''}`}
                    </td>
                    <td>{invoice.invoice_date || invoice.created_at?.split('T')[0]}</td>
                    <td>₹{formatCurrency(invoice.total_amount || invoice.total)}</td>
                    <td>₹{formatCurrency(invoice.paid_amount || invoice.amount_paid)}</td>
                    <td>₹{formatCurrency(invoice.balance_amount || invoice.balance)}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(invoice.status)}`}>
                        {invoice.status_display || invoice.status}
                      </span>
                    </td>
                    <td>
                      <Link to={`/billing/${invoice.id}`} className="btn btn-sm btn-info me-1">
                        <i className="fas fa-eye"></i>
                      </Link>
                      <Link to={`/billing/edit/${invoice.id}`} className="btn btn-sm btn-warning me-1">
                        <i className="fas fa-edit"></i>
                      </Link>
                      <button onClick={() => handleDelete(invoice.id)} className="btn btn-sm btn-danger">
                        <i className="fas fa-trash"></i>
                      </button>
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

export default InvoiceList;
