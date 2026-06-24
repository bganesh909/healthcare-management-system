import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { billingService, paymentService } from '../../services/api';

const InvoiceDetail = () => {
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'CASH',
    transaction_id: ''
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();

  const fetchInvoice = async () => {
    try {
      const response = await billingService.get(id);
      setInvoice(response.data);

      // Try to load payments
      try {
        const paymentsRes = await paymentService.getAll({ invoice: id });
        setPayments(paymentsRes.data || []);
      } catch (err) {
        // Payments might be nested in invoice response
        if (response.data.payments) {
          setPayments(response.data.payments);
        }
      }

      setLoading(false);
    } catch (err) {
      setError('Error fetching invoice details');
      setLoading(false);
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDownloadPdf = async () => {
    try {
      const response = await billingService.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download PDF');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await billingService.delete(id);
        navigate('/billing');
      } catch (err) {
        setError('Error deleting invoice');
        console.error(err);
      }
    }
  };

  const handleMarkAsPaid = async () => {
    if (window.confirm('Mark this invoice as paid?')) {
      try {
        await billingService.markPaid(id);
        await fetchInvoice();
      } catch (err) {
        setError('Error marking invoice as paid');
        console.error(err);
      }
    }
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setPaymentSubmitting(true);
    try {
      await paymentService.create({
        invoice: id,
        amount: parseFloat(paymentData.amount),
        payment_method: paymentData.payment_method,
        transaction_id: paymentData.transaction_id || undefined
      });
      setPaymentData({ amount: '', payment_method: 'CASH', transaction_id: '' });
      setShowPaymentForm(false);
      await fetchInvoice();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error recording payment');
      console.error(err);
    }
    setPaymentSubmitting(false);
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

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toFixed(2);
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;
  if (error && !invoice) return <div className="container mt-4"><div className="alert alert-danger">{error}</div></div>;
  if (!invoice) return <div className="container mt-4"><div className="alert alert-warning">Invoice not found</div></div>;

  const lineItems = invoice.items || invoice.line_items || [];
  const paymentsList = payments.length > 0 ? payments : (invoice.payments || []);

  return (
    <div className="container mt-4">
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h3><i className="fas fa-file-invoice-dollar me-2"></i>Invoice Details</h3>
          <div>
            {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
              <>
                <button onClick={() => setShowPaymentForm(!showPaymentForm)} className="btn btn-light me-2">
                  <i className="fas fa-money-bill-wave me-1"></i>Record Payment
                </button>
                <button onClick={handleMarkAsPaid} className="btn btn-success me-2">
                  <i className="fas fa-check me-1"></i>Mark as Paid
                </button>
              </>
            )}
            <button className="btn btn-danger me-2" onClick={handleDownloadPdf}>
              <i className="fas fa-file-pdf me-2"></i>Download PDF
            </button>
            <Link to={`/billing/edit/${invoice.id}`} className="btn btn-warning me-2">
              <i className="fas fa-edit me-1"></i>Edit
            </Link>
            <button onClick={handleDelete} className="btn btn-danger">
              <i className="fas fa-trash me-1"></i>Delete
            </button>
          </div>
        </div>
        <div className="card-body">
          {/* Invoice Info */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="card-title">Invoice Information</h5>
                </div>
                <div className="card-body">
                  <p><strong>Invoice #:</strong> {invoice.invoice_number || invoice.id}</p>
                  <p><strong>Date:</strong> {invoice.invoice_date || invoice.created_at?.split('T')[0]}</p>
                  <p><strong>Due Date:</strong> {invoice.due_date || 'N/A'}</p>
                  <p>
                    <strong>Status:</strong>{' '}
                    <span className={`badge ${getStatusBadgeClass(invoice.status)}`}>
                      {invoice.status_display || invoice.status}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="card-title">Patient Information</h5>
                </div>
                <div className="card-body">
                  <p><strong>Name:</strong> {
                    invoice.patient_name ||
                    `${invoice.patient?.first_name || ''} ${invoice.patient?.last_name || ''}`
                  }</p>
                  {invoice.patient?.email && (
                    <p><strong>Email:</strong> {invoice.patient.email}</p>
                  )}
                  {invoice.patient?.phone_number && (
                    <p><strong>Phone:</strong> {invoice.patient.phone_number}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Record Payment Form */}
          {showPaymentForm && (
            <div className="card mb-4 border-success">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0"><i className="fas fa-money-bill-wave me-2"></i>Record Payment</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handlePaymentSubmit}>
                  <div className="row g-3">
                    <div className="col-md-3">
                      <label className="form-label">Amount *</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        name="amount"
                        value={paymentData.amount}
                        onChange={handlePaymentChange}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Payment Method *</label>
                      <select
                        className="form-select"
                        name="payment_method"
                        value={paymentData.payment_method}
                        onChange={handlePaymentChange}
                        required
                      >
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="INSURANCE">Insurance</option>
                        <option value="CHECK">Check</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Transaction ID</label>
                      <input
                        type="text"
                        className="form-control"
                        name="transaction_id"
                        value={paymentData.transaction_id}
                        onChange={handlePaymentChange}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="col-md-3 d-flex align-items-end">
                      <button type="submit" className="btn btn-success me-2" disabled={paymentSubmitting}>
                        {paymentSubmitting ? 'Saving...' : 'Submit'}
                      </button>
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPaymentForm(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Line Items */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title"><i className="fas fa-list me-2"></i>Line Items</h5>
            </div>
            <div className="card-body">
              {lineItems.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead className="table-light">
                      <tr>
                        <th>Description</th>
                        <th>Type</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, index) => (
                        <tr key={item.id || index}>
                          <td>{item.description}</td>
                          <td>{item.item_type_display || item.item_type}</td>
                          <td>{item.quantity}</td>
                          <td>₹{formatCurrency(item.unit_price)}</td>
                          <td>₹{formatCurrency(item.total_price || (item.quantity * item.unit_price))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="alert alert-info mb-0">No line items</div>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title"><i className="fas fa-calculator me-2"></i>Payment Summary</h5>
                </div>
                <div className="card-body">
                  <table className="table table-borderless mb-0">
                    <tbody>
                      <tr>
                        <td><strong>Subtotal:</strong></td>
                        <td className="text-end">₹{formatCurrency(invoice.subtotal)}</td>
                      </tr>
                      <tr>
                        <td><strong>Tax:</strong></td>
                        <td className="text-end">₹{formatCurrency(invoice.tax_amount || invoice.tax)}</td>
                      </tr>
                      <tr>
                        <td><strong>Discount:</strong></td>
                        <td className="text-end">-₹{formatCurrency(invoice.discount_amount || invoice.discount)}</td>
                      </tr>
                      <tr className="border-top">
                        <td><strong>Total:</strong></td>
                        <td className="text-end"><strong>₹{formatCurrency(invoice.total_amount || invoice.total)}</strong></td>
                      </tr>
                      <tr>
                        <td><strong>Paid:</strong></td>
                        <td className="text-end text-success">₹{formatCurrency(invoice.paid_amount || invoice.amount_paid)}</td>
                      </tr>
                      <tr className="border-top">
                        <td><strong>Balance:</strong></td>
                        <td className="text-end text-danger"><strong>₹{formatCurrency(invoice.balance_amount || invoice.balance)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Payments History */}
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title"><i className="fas fa-history me-2"></i>Payment History</h5>
                </div>
                <div className="card-body">
                  {paymentsList.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-sm table-striped mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Transaction ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentsList.map((payment, index) => (
                            <tr key={payment.id || index}>
                              <td>{payment.payment_date || payment.created_at?.split('T')[0]}</td>
                              <td>₹{formatCurrency(payment.amount)}</td>
                              <td>{payment.payment_method_display || payment.payment_method}</td>
                              <td>{payment.transaction_id || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="alert alert-info mb-0">No payments recorded</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title">Notes</h5>
              </div>
              <div className="card-body">
                <p className="mb-0">{invoice.notes}</p>
              </div>
            </div>
          )}
        </div>
        <div className="card-footer">
          <Link to="/billing" className="btn btn-secondary">
            <i className="fas fa-arrow-left me-1"></i>Back to Invoices
          </Link>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
