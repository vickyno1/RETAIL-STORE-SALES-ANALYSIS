import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, DollarSign, Package, AlertTriangle, 
  Trash2, RefreshCw, ShoppingBag, ArrowUpRight, ArrowDownRight, 
  Calendar, Layers, CheckCircle2
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import api from '../api/client';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all'); // 'all', 'month', 'week'

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      let params = {};
      const today = new Date();
      if (periodFilter === 'week') {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        params.start_date = d.toISOString().split('T')[0];
      } else if (periodFilter === 'month') {
        const d = new Date(today.getFullYear(), today.getMonth(), 1);
        params.start_date = d.toISOString().split('T')[0];
      }

      const res = await api.get('/analytics/dashboard', { params });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load retail analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [periodFilter]);

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
        <RefreshCw size={32} className="spin" style={{ marginBottom: '1rem', animation: 'spin 1s linear infinite' }} />
        <p>Loading real-time retail intelligence from Oracle Database...</p>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const categories = data?.categories || [];
  const trend = data?.sales_trend || [];
  const topProfit = data?.top_by_profit || [];
  const topRevenue = data?.top_by_revenue || [];
  const slowMoving = data?.slow_moving || [];
  const comparison = data?.period_comparison || {};

  const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <TrendingUp color="#059669" size={28} />
            <span>Retail Executive Dashboard</span>
          </h1>
          <p className="page-desc">
            Performance analytics, sales revenue, gross margin, and stock metrics from Oracle 10g XE.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <select 
            className="form-select" 
            style={{ width: 'auto' }}
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
          >
            <option value="all">All Available History (Past 30 Days)</option>
            <option value="month">This Month to Date</option>
            <option value="week">Past 7 Days</option>
          </select>

          <button 
            onClick={fetchDashboardData} 
            className="btn btn-secondary" 
            title="Refresh from Oracle"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: '#fff1f2', borderColor: '#fecdd3', color: '#e11d48' }}>
          {error}
        </div>
      )}

      {/* KPI Ribbon */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">Total Sales Revenue</div>
          <div className="kpi-value">₹{Number(kpis.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div className="kpi-subtext">{kpis.batch_count} Daily Sales Entries Recorded</div>
        </div>

        <div className="kpi-card secondary">
          <div className="kpi-title">Gross Profit</div>
          <div className="kpi-value" style={{ color: '#4f46e5' }}>
            ₹{Number(kpis.gross_profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="kpi-subtext">Margin: <strong>{kpis.gross_margin_pct}%</strong> (Net Revenue - COGS)</div>
        </div>

        <div className="kpi-card info">
          <div className="kpi-title">Quantity Sold</div>
          <div className="kpi-value">
            {Number(kpis.total_quantity_sold || 0).toLocaleString('en-IN')} <span style={{ fontSize: '1rem', color: '#64748b' }}>units/kg</span>
          </div>
          <div className="kpi-subtext">Across Vegetables, Fruits & Groceries</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Closing Stock Value</div>
          <div className="kpi-value">₹{Number(kpis.inventory_valuation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div className="kpi-subtext">Valued at Moving Weighted-Average Cost</div>
        </div>

        <div className="kpi-card danger">
          <div className="kpi-title">Wastage & Spoilage Loss</div>
          <div className="kpi-value" style={{ color: '#e11d48' }}>
            ₹{Number(kpis.wastage_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="kpi-subtext">Perishable shrinkage recorded</div>
        </div>

        <div className="kpi-card warning">
          <div className="kpi-title">Low Stock Alerts</div>
          <div className="kpi-value" style={{ color: kpis.low_stock_count > 0 ? '#d97706' : '#059669' }}>
            {kpis.low_stock_count} <span style={{ fontSize: '1rem', color: '#64748b' }}>items</span>
          </div>
          <div className="kpi-subtext">Below configured reorder levels</div>
        </div>
      </div>

      {/* Financial Net Estimate Banner */}
      <div className="card" style={{ 
        backgroundColor: '#f0fdf4', 
        borderColor: '#bbf7d0', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '1.25rem 1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ backgroundColor: '#059669', color: '#fff', padding: '0.65rem', borderRadius: '0.65rem' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>
              Net Operating Profit Estimate (Period)
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#14532d' }}>
              ₹{Number(kpis.net_operating_profit_estimate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#15803d', maxWidth: '480px' }}>
          Calculated as: <strong>Gross Profit (₹{kpis.gross_profit})</strong> − <strong>Wastage Costs (₹{kpis.wastage_cost})</strong> − <strong>Operating Expenses (₹{kpis.operating_expenses})</strong>.
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Daily Revenue & Profit Trend Chart */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Daily Revenue & Gross Profit Trend</h3>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Day-wise sales totals vs inventory cost of goods sold
          </p>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="PERIOD_LABEL" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, '']} />
                <Legend />
                <Area type="monotone" dataKey="REVENUE" name="Revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="GROSS_PROFIT" name="Gross Profit" stroke="#6366f1" fillOpacity={1} fill="url(#colorProf)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Contribution Chart */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Category Sales & Margin Breakdown</h3>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Revenue and gross margin comparison by category
          </p>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <BarChart data={categories} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="CATEGORY_NAME" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(val, name) => [name === 'Margin %' ? `${val}%` : `₹${Number(val).toLocaleString('en-IN')}`, name]} />
                <Legend />
                <Bar dataKey="REVENUE" name="Revenue" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="GROSS_PROFIT" name="Gross Profit" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Best Selling & Highest Profit Products */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        {/* Top Products by Gross Profit */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Most Profitable Products</h3>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
            Ranked by gross profit earnings (Revenue minus Moving Avg Cost)
          </p>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Revenue</th>
                  <th>Gross Profit</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {topProfit.map((p, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{p.PRODUCT_NAME}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.PRODUCT_CODE}</div>
                    </td>
                    <td><span className="badge badge-secondary">{p.CATEGORY_NAME}</span></td>
                    <td>₹{Number(p.TOTAL_REVENUE).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#059669', fontWeight: 600 }}>₹{Number(p.GROSS_PROFIT).toLocaleString('en-IN')}</td>
                    <td><span className="badge badge-success">{p.MARGIN_PCT}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products by Revenue */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Top Revenue Generating Products</h3>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
            Ranked by total sales turnover
          </p>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Units Sold</th>
                  <th>Total Revenue</th>
                  <th>Stock Remains</th>
                </tr>
              </thead>
              <tbody>
                {topRevenue.map((p, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{p.PRODUCT_NAME}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.PRODUCT_CODE}</div>
                    </td>
                    <td><span className="badge badge-secondary">{p.CATEGORY_NAME}</span></td>
                    <td>{p.TOTAL_QTY} {p.UNIT}</td>
                    <td style={{ fontWeight: 600 }}>₹{Number(p.TOTAL_REVENUE).toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`badge ${p.CURRENT_STOCK <= 15 ? 'badge-warning' : 'badge-success'}`}>
                        {p.CURRENT_STOCK} {p.UNIT}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
