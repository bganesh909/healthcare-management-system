import React, { useState, useEffect, useCallback } from 'react';
import { accountingService } from '../../services/api';

const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return '\u20B9' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const FinanceDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [arAging, setArAging] = useState(null);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [budgetVariance, setBudgetVariance] = useState([]);
  const [profitLoss, setProfitLoss] = useState(null);
  const [plLoading, setPlLoading] = useState(false);
  const [plExpanded, setPlExpanded] = useState(false);
  const [plStartDate, setPlStartDate] = useState('');
  const [plEndDate, setPlEndDate] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, arRes, expCatRes, budgetRes] = await Promise.all([
        accountingService.getFinancialDashboard(),
        accountingService.getARAging(),
        accountingService.getExpensesByCategory(),
        accountingService.getBudgetVariance(),
      ]);
      setDashboard(dashRes.data);
      setArAging(arRes.data?.summary || arRes.data);
      setExpensesByCategory(expCatRes.data || []);
      setBudgetVariance(budgetRes.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load financial data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchProfitLoss = async () => {
    setPlLoading(true);
    try {
      const params = {};
      if (plStartDate) params.start_date = plStartDate;
      if (plEndDate) params.end_date = plEndDate;
      const res = await accountingService.getProfitLoss(params);
      setProfitLoss(res.data);
    } catch (err) {
      setProfitLoss(null);
    } finally {
      setPlLoading(false);
    }
  };

  useEffect(() => {
    if (plExpanded) {
      fetchProfitLoss();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plExpanded]);

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading financial data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          <div>{error}</div>
          <button className="btn btn-outline-danger btn-sm ms-auto" onClick={fetchData}>
            <i className="fas fa-redo me-1"></i>Retry
          </button>
        </div>
      </div>
    );
  }

  const revenue = dashboard?.revenue || {};
  const expenses = dashboard?.expenses || {};
  const profit = dashboard?.profit || {};
  const payroll = dashboard?.payroll || {};
  const recentPayments = dashboard?.recent_payments || [];
  const recentExpenses = dashboard?.recent_expenses || [];
  const pendingApprovals = dashboard?.pending_approvals || 0;

  // Calculate total for expense category percentages
  const totalExpensesByCategory = expensesByCategory.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // AR Aging total
  const arTotal = arAging
    ? (Number(arAging.current) || 0) + (Number(arAging['30_days']) || 0) + (Number(arAging['60_days']) || 0) + (Number(arAging['90_days']) || 0) + (Number(arAging.over_90) || 0)
    : 0;

  const getArPercent = (val) => (arTotal > 0 ? ((Number(val) || 0) / arTotal) * 100 : 0);

  const getUtilizationColor = (pct) => {
    if (pct >= 100) return 'text-danger';
    if (pct >= 80) return 'text-warning';
    return 'text-success';
  };

  return (
    <div className="container-fluid py-4">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1"><i className="fas fa-chart-pie me-2 text-primary"></i>Finance & Budget Dashboard</h2>
          <p className="text-muted mb-0">Comprehensive financial overview and budget tracking</p>
        </div>
        <button className="btn btn-outline-primary" onClick={fetchData}>
          <i className="fas fa-sync-alt me-1"></i>Refresh
        </button>
      </div>

      {/* Row 1 - KPI Cards */}
      <div className="row g-3 mb-4">
        {/* Today's Revenue */}
        <div className="col-md-6 col-lg-3">
          <div className="card h-100 shadow-sm" style={{ borderLeft: '4px solid #28a745' }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1 small text-uppercase fw-semibold">Today's Revenue</p>
                  <h3 className="mb-0 fw-bold" style={{ color: '#28a745' }}>{formatCurrency(revenue.today)}</h3>
                </div>
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', backgroundColor: '#28a74520' }}>
                  <i className="fas fa-rupee-sign" style={{ color: '#28a745', fontSize: '1.2rem' }}></i>
                </div>
              </div>
              <small className="text-muted">FY Revenue: {formatCurrency(revenue.fy)}</small>
            </div>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="col-md-6 col-lg-3">
          <div className="card h-100 shadow-sm" style={{ borderLeft: '4px solid #0d6efd' }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1 small text-uppercase fw-semibold">Monthly Revenue</p>
                  <h3 className="mb-0 fw-bold" style={{ color: '#0d6efd' }}>{formatCurrency(revenue.month)}</h3>
                </div>
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', backgroundColor: '#0d6efd20' }}>
                  <i className="fas fa-chart-line" style={{ color: '#0d6efd', fontSize: '1.2rem' }}></i>
                </div>
              </div>
              <small className="text-muted">Outstanding: {formatCurrency(dashboard?.outstanding_receivables)}</small>
            </div>
          </div>
        </div>

        {/* Monthly Expenses */}
        <div className="col-md-6 col-lg-3">
          <div className="card h-100 shadow-sm" style={{ borderLeft: '4px solid #dc3545' }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1 small text-uppercase fw-semibold">Monthly Expenses</p>
                  <h3 className="mb-0 fw-bold" style={{ color: '#dc3545' }}>{formatCurrency(expenses.month)}</h3>
                </div>
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', backgroundColor: '#dc354520' }}>
                  <i className="fas fa-arrow-down" style={{ color: '#dc3545', fontSize: '1.2rem' }}></i>
                </div>
              </div>
              <small className="text-muted">FY Expenses: {formatCurrency(expenses.fy)}</small>
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="col-md-6 col-lg-3">
          <div className="card h-100 shadow-sm" style={{ borderLeft: '4px solid #6f42c1' }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1 small text-uppercase fw-semibold">Net Profit (Month)</p>
                  <h3 className="mb-0 fw-bold" style={{ color: '#6f42c1' }}>{formatCurrency(profit.month)}</h3>
                </div>
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', backgroundColor: '#6f42c120' }}>
                  <i className="fas fa-balance-scale" style={{ color: '#6f42c1', fontSize: '1.2rem' }}></i>
                </div>
              </div>
              <small className="text-muted">FY Profit: {formatCurrency(profit.fy)}</small>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 - Revenue vs Expenses / AR Aging */}
      <div className="row g-3 mb-4">
        {/* Revenue vs Expenses */}
        <div className="col-lg-7">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white">
              <h5 className="mb-0"><i className="fas fa-exchange-alt me-2 text-primary"></i>Revenue vs Expenses Summary</h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover table-bordered mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Period</th>
                      <th className="text-end">Revenue</th>
                      <th className="text-end">Expenses</th>
                      <th className="text-end">Net Profit</th>
                      <th className="text-end">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Today</strong></td>
                      <td className="text-end text-success">{formatCurrency(revenue.today)}</td>
                      <td className="text-end text-danger">--</td>
                      <td className="text-end">--</td>
                      <td className="text-end">--</td>
                    </tr>
                    <tr>
                      <td><strong>This Month</strong></td>
                      <td className="text-end text-success">{formatCurrency(revenue.month)}</td>
                      <td className="text-end text-danger">{formatCurrency(expenses.month)}</td>
                      <td className="text-end" style={{ color: (Number(profit.month) || 0) >= 0 ? '#28a745' : '#dc3545' }}>
                        {formatCurrency(profit.month)}
                      </td>
                      <td className="text-end">
                        {Number(revenue.month) > 0
                          ? ((Number(profit.month) / Number(revenue.month)) * 100).toFixed(1) + '%'
                          : '--'}
                      </td>
                    </tr>
                    <tr className="table-active">
                      <td><strong>Financial Year</strong></td>
                      <td className="text-end text-success fw-bold">{formatCurrency(revenue.fy)}</td>
                      <td className="text-end text-danger fw-bold">{formatCurrency(expenses.fy)}</td>
                      <td className="text-end fw-bold" style={{ color: (Number(profit.fy) || 0) >= 0 ? '#28a745' : '#dc3545' }}>
                        {formatCurrency(profit.fy)}
                      </td>
                      <td className="text-end fw-bold">
                        {Number(revenue.fy) > 0
                          ? ((Number(profit.fy) / Number(revenue.fy)) * 100).toFixed(1) + '%'
                          : '--'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* AR Aging */}
        <div className="col-lg-5">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white">
              <h5 className="mb-0"><i className="fas fa-clock me-2 text-warning"></i>Outstanding Receivables (AR Aging)</h5>
            </div>
            <div className="card-body">
              {arAging ? (
                <>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Current</span>
                      <span className="fw-bold">{formatCurrency(arAging.current)}</span>
                    </div>
                    <div className="progress" style={{ height: '12px' }}>
                      <div className="progress-bar bg-success" style={{ width: `${getArPercent(arAging.current)}%` }}></div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span>30 Days</span>
                      <span className="fw-bold">{formatCurrency(arAging['30_days'])}</span>
                    </div>
                    <div className="progress" style={{ height: '12px' }}>
                      <div className="progress-bar bg-info" style={{ width: `${getArPercent(arAging['30_days'])}%` }}></div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span>60 Days</span>
                      <span className="fw-bold">{formatCurrency(arAging['60_days'])}</span>
                    </div>
                    <div className="progress" style={{ height: '12px' }}>
                      <div className="progress-bar bg-warning" style={{ width: `${getArPercent(arAging['60_days'])}%` }}></div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span>90 Days</span>
                      <span className="fw-bold">{formatCurrency(arAging['90_days'])}</span>
                    </div>
                    <div className="progress" style={{ height: '12px' }}>
                      <div className="progress-bar bg-orange" style={{ width: `${getArPercent(arAging['90_days'])}%`, backgroundColor: '#fd7e14' }}></div>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Over 90 Days</span>
                      <span className="fw-bold">{formatCurrency(arAging.over_90)}</span>
                    </div>
                    <div className="progress" style={{ height: '12px' }}>
                      <div className="progress-bar bg-danger" style={{ width: `${getArPercent(arAging.over_90)}%` }}></div>
                    </div>
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between">
                    <span className="fw-bold">Total Outstanding</span>
                    <span className="fw-bold text-primary">{formatCurrency(arTotal)}</span>
                  </div>
                </>
              ) : (
                <p className="text-muted text-center">No AR aging data available.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3 - Expense Breakdown / Budget vs Actual / Payroll */}
      <div className="row g-3 mb-4">
        {/* Expense Breakdown by Category */}
        <div className="col-lg-4">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white">
              <h5 className="mb-0"><i className="fas fa-tags me-2 text-danger"></i>Expense Breakdown by Category</h5>
            </div>
            <div className="card-body p-0">
              {expensesByCategory.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover table-bordered mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Category</th>
                        <th className="text-end">Amount</th>
                        <th className="text-end">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expensesByCategory.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.category || item.name || 'N/A'}</td>
                          <td className="text-end">{formatCurrency(item.amount || item.total)}</td>
                          <td className="text-end">
                            {totalExpensesByCategory > 0
                              ? (((Number(item.amount || item.total) || 0) / totalExpensesByCategory) * 100).toFixed(1) + '%'
                              : '0%'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light">
                      <tr>
                        <td className="fw-bold">Total</td>
                        <td className="text-end fw-bold">{formatCurrency(totalExpensesByCategory)}</td>
                        <td className="text-end fw-bold">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center text-muted py-4">No expense category data available.</div>
              )}
            </div>
          </div>
        </div>

        {/* Budget vs Actual */}
        <div className="col-lg-5">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white">
              <h5 className="mb-0"><i className="fas fa-bullseye me-2 text-info"></i>Budget vs Actual</h5>
            </div>
            <div className="card-body p-0">
              {budgetVariance.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover table-bordered mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Department</th>
                        <th className="text-end">Budgeted</th>
                        <th className="text-end">Spent</th>
                        <th className="text-end">Remaining</th>
                        <th className="text-end">Utilization</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetVariance.map((item, idx) => {
                        const budgeted = Number(item.budgeted || item.budget) || 0;
                        const spent = Number(item.spent || item.actual) || 0;
                        const remaining = budgeted - spent;
                        const utilization = budgeted > 0 ? (spent / budgeted) * 100 : 0;
                        return (
                          <tr key={idx}>
                            <td>{item.department || item.name || 'N/A'}</td>
                            <td className="text-end">{formatCurrency(budgeted)}</td>
                            <td className="text-end">{formatCurrency(spent)}</td>
                            <td className="text-end" style={{ color: remaining >= 0 ? '#28a745' : '#dc3545' }}>
                              {formatCurrency(remaining)}
                            </td>
                            <td className={`text-end fw-bold ${getUtilizationColor(utilization)}`}>
                              {utilization.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-muted py-4">No budget variance data available.</div>
              )}
            </div>
          </div>
        </div>

        {/* Payroll Summary */}
        <div className="col-lg-3">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white">
              <h5 className="mb-0"><i className="fas fa-money-check-alt me-2 text-success"></i>Payroll Summary</h5>
            </div>
            <div className="card-body">
              <div className="text-center mb-4">
                <p className="text-muted mb-1 small text-uppercase">Monthly Payroll</p>
                <h3 className="fw-bold text-primary">{formatCurrency(payroll.month)}</h3>
              </div>
              <hr />
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-muted">Pending Approvals</span>
                <span className="badge bg-warning text-dark fs-6">{pendingApprovals}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted">FY Expenses</span>
                <span className="fw-bold">{formatCurrency(expenses.fy)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4 - Recent Payments / Recent Expenses */}
      <div className="row g-3 mb-4">
        {/* Recent Payments */}
        <div className="col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white">
              <h5 className="mb-0"><i className="fas fa-receipt me-2 text-success"></i>Recent Payments</h5>
            </div>
            <div className="card-body p-0">
              {recentPayments.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover table-bordered mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Invoice</th>
                        <th className="text-end">Amount</th>
                        <th>Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPayments.map((payment, idx) => (
                        <tr key={idx}>
                          <td>{payment.date ? new Date(payment.date).toLocaleDateString('en-IN') : 'N/A'}</td>
                          <td>{payment.invoice || payment.invoice_number || 'N/A'}</td>
                          <td className="text-end text-success fw-bold">{formatCurrency(payment.amount)}</td>
                          <td>
                            <span className="badge bg-light text-dark">{payment.method || payment.payment_method || 'N/A'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-muted py-4">No recent payments.</div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white">
              <h5 className="mb-0"><i className="fas fa-file-invoice me-2 text-danger"></i>Recent Expenses</h5>
            </div>
            <div className="card-body p-0">
              {recentExpenses.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover table-bordered mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th className="text-end">Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentExpenses.map((expense, idx) => (
                        <tr key={idx}>
                          <td>{expense.date ? new Date(expense.date).toLocaleDateString('en-IN') : 'N/A'}</td>
                          <td>{expense.category || 'N/A'}</td>
                          <td className="text-end text-danger fw-bold">{formatCurrency(expense.amount)}</td>
                          <td>
                            <span className={`badge ${
                              expense.status === 'approved' ? 'bg-success' :
                              expense.status === 'pending' ? 'bg-warning text-dark' :
                              expense.status === 'rejected' ? 'bg-danger' : 'bg-secondary'
                            }`}>
                              {expense.status || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-muted py-4">No recent expenses.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 5 - Profit & Loss Statement */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card shadow-sm">
            <div
              className="card-header bg-white d-flex justify-content-between align-items-center"
              style={{ cursor: 'pointer' }}
              onClick={() => setPlExpanded(!plExpanded)}
            >
              <h5 className="mb-0">
                <i className={`fas fa-chevron-${plExpanded ? 'down' : 'right'} me-2 text-muted`}></i>
                <i className="fas fa-file-alt me-2 text-primary"></i>
                Profit & Loss Statement
              </h5>
              <span className="badge bg-primary">{plExpanded ? 'Click to collapse' : 'Click to expand'}</span>
            </div>
            {plExpanded && (
              <div className="card-body">
                {/* Date Range Filter */}
                <div className="row g-2 mb-4">
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={plStartDate}
                      onChange={(e) => setPlStartDate(e.target.value)}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={plEndDate}
                      onChange={(e) => setPlEndDate(e.target.value)}
                    />
                  </div>
                  <div className="col-md-3 d-flex align-items-end">
                    <button className="btn btn-primary" onClick={fetchProfitLoss} disabled={plLoading}>
                      {plLoading ? (
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      ) : (
                        <i className="fas fa-filter me-1"></i>
                      )}
                      Apply Filter
                    </button>
                  </div>
                </div>

                {plLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : profitLoss ? (
                  <div className="row">
                    {/* Income Items */}
                    <div className="col-md-6 mb-3">
                      <h6 className="text-success fw-bold mb-3"><i className="fas fa-arrow-up me-1"></i>Income</h6>
                      <div className="table-responsive">
                        <table className="table table-hover table-bordered mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Item</th>
                              <th className="text-end">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(profitLoss.income_items || profitLoss.income || []).map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.name || item.description || item.category || 'N/A'}</td>
                                <td className="text-end text-success">{formatCurrency(item.amount || item.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="table-success">
                            <tr>
                              <td className="fw-bold">Total Income</td>
                              <td className="text-end fw-bold">{formatCurrency(profitLoss.total_income || profitLoss.totals?.income)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Expense Items */}
                    <div className="col-md-6 mb-3">
                      <h6 className="text-danger fw-bold mb-3"><i className="fas fa-arrow-down me-1"></i>Expenses</h6>
                      <div className="table-responsive">
                        <table className="table table-hover table-bordered mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Item</th>
                              <th className="text-end">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(profitLoss.expense_items || profitLoss.expenses || []).map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.name || item.description || item.category || 'N/A'}</td>
                                <td className="text-end text-danger">{formatCurrency(item.amount || item.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="table-danger">
                            <tr>
                              <td className="fw-bold">Total Expenses</td>
                              <td className="text-end fw-bold">{formatCurrency(profitLoss.total_expenses || profitLoss.totals?.expenses)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Net Profit Summary */}
                    <div className="col-12">
                      <div className="alert alert-primary d-flex justify-content-between align-items-center mb-0">
                        <span className="fw-bold fs-5">
                          <i className="fas fa-calculator me-2"></i>Net Profit
                        </span>
                        <span className="fw-bold fs-4" style={{
                          color: (Number(profitLoss.net_profit) || 0) >= 0 ? '#28a745' : '#dc3545'
                        }}>
                          {formatCurrency(profitLoss.net_profit)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted py-4">
                    <i className="fas fa-info-circle me-1"></i>
                    No profit & loss data available. Try adjusting the date range.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;
