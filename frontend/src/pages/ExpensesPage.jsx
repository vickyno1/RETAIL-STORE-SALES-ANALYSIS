import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Plus, RefreshCw, Search, Calendar, 
  Tag, CreditCard, PieChart as PieIcon 
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ExpensesPage() {
  const { isAdmin } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: 'Electricity',
    amount: '',
    description: ''
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/expenses');
      setExpenses(res.data.expenses || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch operating expenses.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid expense amount.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/expenses', {
        expense_date: formData.expense_date,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description
      });
      setSuccessMsg('Operating expense recorded successfully.');
      setIsModalOpen(false);
      setFormData({
        expense_date: new Date().toISOString().split('T')[0],
        category: 'Electricity',
        amount: '',
        description: ''
      });
      fetchExpenses();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create expense record.');
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.AMOUNT) || 0), 0);
  const count = expenses.length;
  
  // Group by category
  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.CATEGORY] = (acc[e.CATEGORY] || 0) + parseFloat(e.AMOUNT || 0);
    return acc;
  }, {});

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = 
      (e.DESCRIPTION && e.DESCRIPTION.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.CATEGORY && e.CATEGORY.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = categoryFilter ? e.CATEGORY === categoryFilter : true;
    return matchesSearch && matchesCat;
  });

  const categories = ['Rent', 'Electricity', 'Labor / Wages', 'Packaging Materials', 'Transportation', 'Maintenance', 'Miscellaneous'];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <DollarSign className="text-primary" /> Operating Expenses (OPEX)
          </h1>
          <p className="text-muted">Track store overheads (rent, electricity, labor, packaging) to calculate true Net Profit</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={fetchExpenses}>
            <RefreshCw size={18} /> Refresh
          </button>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={18} /> Record Expense
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button className="btn-close" onClick={() => setError(null)}>×</button>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{successMsg}</span>
          <button className="btn-close" onClick={() => setSuccessMsg(null)}>×</button>
        </div>
      )}

      {/* KPI Ribbon */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total Operating Expenses</div>
          <div className="stat-value" style={{ color: '#0284c7' }}>
            ₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="stat-sub">Overhead operational costs</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Recorded Transactions</div>
          <div className="stat-value">{count}</div>
          <div className="stat-sub">Verified payments & bills</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Accounting Formula</div>
          <div className="stat-value" style={{ fontSize: '1.15rem', color: '#059669' }}>
            Net Profit = Gross - OPEX - Wastage
          </div>
          <div className="stat-sub">Automatic monthly deduction</div>
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {Object.entries(categoryTotals).map(([cat, amt]) => (
          <div key={cat} className="card" style={{ padding: '1rem', borderLeft: '3px solid #0284c7' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{cat}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem', color: '#1e293b' }}>
              ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              {((amt / (totalExpenses || 1)) * 100).toFixed(1)}% of total OPEX
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }} className="search-box">
            <Search size={16} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Search category or description..." 
              className="form-control"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="form-select" 
            style={{ width: '220px' }}
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Operating Expense Records</h3>
          <span className="text-muted" style={{ fontSize: '0.875rem' }}>
            Showing {filteredExpenses.length} transactions
          </span>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Expense ID</th>
                <th>Payment Date</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Description / Purpose</th>
                <th>Logged By</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(exp => (
                <tr key={exp.EXPENSE_ID}>
                  <td>#{exp.EXPENSE_ID}</td>
                  <td>{exp.EXPENSE_DATE}</td>
                  <td><span className="badge badge-info">{exp.CATEGORY}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>
                    ₹{parseFloat(exp.AMOUNT).toFixed(2)}
                  </td>
                  <td>{exp.DESCRIPTION}</td>
                  <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    {exp.RECORDED_BY || 'Admin'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD EXPENSE MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={20} className="text-primary" /> Record Operating Expense
              </h3>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Payment Date *</label>
                    <input 
                      type="date" 
                      name="expense_date" 
                      required 
                      className="form-control"
                      value={formData.expense_date}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select 
                      name="category" 
                      required 
                      className="form-select"
                      value={formData.category}
                      onChange={handleInputChange}
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Amount (₹) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="1" 
                    required 
                    className="form-control"
                    name="amount"
                    placeholder="e.g. 1500.00"
                    value={formData.amount}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Description / Bill Reference *</label>
                  <textarea 
                    name="description" 
                    required 
                    rows="3"
                    className="form-control"
                    placeholder="e.g. Electricity bill payment for commercial shop meter"
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
