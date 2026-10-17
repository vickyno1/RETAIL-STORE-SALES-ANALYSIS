import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, RefreshCw, ShoppingBag, Phone, Mail, 
  Search, ShieldAlert, ArrowRight, CheckCircle2 
} from 'lucide-react';
import api from '../api/client';

export default function LowStockPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchLowStockAlerts();
  }, []);

  const fetchLowStockAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/low-stock');
      setAlerts(res.data.alerts || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch low-stock alerts.');
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(alerts.map(a => a.CATEGORY_NAME).filter(Boolean)));

  const filteredAlerts = alerts.filter(a => {
    const matchesSearch = 
      a.PRODUCT_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.PRODUCT_CODE.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.SUPPLIER_NAME && a.SUPPLIER_NAME.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = categoryFilter ? a.CATEGORY_NAME === categoryFilter : true;
    return matchesSearch && matchesCat;
  });

  // Calculate Metrics
  const totalLowStock = alerts.length;
  const criticalStock = alerts.filter(a => parseFloat(a.CURRENT_STOCK) <= 0.25 * parseFloat(a.REORDER_LEVEL)).length;
  const estimatedCapital = alerts.reduce((acc, a) => {
    const deficit = Math.max(0, parseFloat(a.REORDER_LEVEL) * 2 - parseFloat(a.CURRENT_STOCK));
    const cost = parseFloat(a.PURCHASE_COST || 0);
    return acc + (deficit * cost);
  }, 0);

  return (
    <div className="page-container">
      {/* Top Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle color="#ea580c" /> Low-Stock & Replenishment Alerts
          </h1>
          <p className="text-muted">Identify items running out of inventory and plan tomorrow's supplier purchase order</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={fetchLowStockAlerts}>
            <RefreshCw size={18} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/purchases')}>
            <ShoppingBag size={18} /> Create Inward Purchase
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* KPI Ribbon */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Items Below Reorder Level</div>
          <div className="stat-value" style={{ color: totalLowStock > 0 ? '#ea580c' : '#059669' }}>
            {totalLowStock}
          </div>
          <div className="stat-sub">{totalLowStock > 0 ? 'Action required immediately' : 'Inventory is adequately stocked'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Critically Low (&lt;25% Buffer)</div>
          <div className="stat-value" style={{ color: criticalStock > 0 ? '#dc2626' : '#10b981' }}>
            {criticalStock}
          </div>
          <div className="stat-sub">{criticalStock > 0 ? 'Risk of complete stockout today' : 'No critical emergencies'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Estimated Reorder Capital</div>
          <div className="stat-value" style={{ color: '#2563eb' }}>
            ₹{estimatedCapital.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="stat-sub">Estimated cost to reach 2x safety buffer</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Daily Purchase Advice</div>
          <div className="stat-value" style={{ fontSize: '1.25rem', color: totalLowStock > 0 ? '#c2410c' : '#059669' }}>
            {totalLowStock > 0 ? 'Order from Suppliers' : 'Stock Levels Safe'}
          </div>
          <div className="stat-sub">Review supplier contact cards below</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }} className="search-box">
            <Search size={16} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Search product code, name, or supplier..." 
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

      {/* Empty State */}
      {filteredAlerts.length === 0 && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <CheckCircle2 size={48} color="#059669" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 600 }}>All Stock Levels are Healthy</h3>
          <p className="text-muted" style={{ maxWidth: '460px', margin: '0 auto' }}>
            No products are currently at or below their configured safety reorder thresholds. All grocery, vegetable, and fruit inventories have adequate stock buffers.
          </p>
        </div>
      )}

      {/* Alert Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
        {filteredAlerts.map(item => {
          const current = parseFloat(item.CURRENT_STOCK);
          const reorder = parseFloat(item.REORDER_LEVEL);
          const deficit = Math.max(0, (reorder * 2) - current);
          const estCost = deficit * parseFloat(item.PURCHASE_COST || 0);
          const ratio = reorder > 0 ? (current / reorder) * 100 : 0;
          const isCritical = ratio <= 25;

          return (
            <div 
              key={item.PRODUCT_ID} 
              className="card" 
              style={{ 
                borderLeft: isCritical ? '4px solid #dc2626' : '4px solid #ea580c',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)' 
              }}
            >
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="badge badge-secondary" style={{ marginRight: '0.4rem' }}>{item.PRODUCT_CODE}</span>
                  <span className="badge badge-info">{item.CATEGORY_NAME}</span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginTop: '0.35rem' }}>{item.PRODUCT_NAME}</h3>
                </div>
                <span className={`badge ${isCritical ? 'badge-danger' : 'badge-warning'}`}>
                  {isCritical ? 'CRITICAL' : 'REORDER'}
                </span>
              </div>

              <div className="card-body">
                {/* Visual Stock Buffer Gauge */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span>Current Stock: <strong style={{ color: isCritical ? '#dc2626' : '#ea580c' }}>{current} {item.UNIT}</strong></span>
                    <span className="text-muted">Reorder Threshold: <strong>{reorder} {item.UNIT}</strong></span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${Math.min(100, ratio)}%`, 
                        height: '100%', 
                        backgroundColor: isCritical ? '#dc2626' : '#ea580c',
                        borderRadius: '4px' 
                      }} 
                    />
                  </div>
                </div>

                {/* Replenishment Recommendation */}
                <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    <span className="text-muted">Suggested Replenishment:</span>
                    <strong style={{ color: '#059669' }}>{deficit.toFixed(1)} {item.UNIT}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    <span className="text-muted">Unit Purchase Cost:</span>
                    <span>₹{parseFloat(item.PURCHASE_COST || 0).toFixed(2)} / {item.UNIT}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span className="text-muted">Estimated Inward Capital:</span>
                    <strong style={{ color: '#2563eb' }}>₹{estCost.toFixed(2)}</strong>
                  </div>
                </div>

                {/* Preferred Supplier Info */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Preferred Supplier
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {item.SUPPLIER_NAME || 'Not Assigned'}
                  </div>
                  {item.SUPPLIER_PHONE && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#475569', marginTop: '0.2rem' }}>
                      <Phone size={14} color="#64748b" /> {item.SUPPLIER_PHONE}
                    </div>
                  )}
                  {item.SUPPLIER_EMAIL && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#475569', marginTop: '0.2rem' }}>
                      <Mail size={14} color="#64748b" /> {item.SUPPLIER_EMAIL}
                    </div>
                  )}
                </div>
              </div>

              <div className="card-footer" style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #f1f5f9', backgroundColor: '#fcfcfc', textAlign: 'right' }}>
                <button 
                  className="btn btn-sm btn-outline"
                  onClick={() => navigate('/purchases')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  Order from Supplier <ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
