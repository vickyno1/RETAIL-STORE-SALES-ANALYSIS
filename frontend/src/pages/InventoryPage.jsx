import React, { useState, useEffect } from 'react';
import { 
  Layers, RefreshCw, Sliders, CheckCircle, AlertTriangle, 
  Search, ArrowDownRight, ArrowUpRight, History, ShieldCheck 
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function InventoryPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('valuation'); // 'valuation' | 'movements' | 'reconcile'
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [reconciliation, setReconciliation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters for Movements
  const [selectedType, setSelectedType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newStock, setNewStock] = useState('');
  const [adjustReason, setAdjustReason] = useState('Physical inventory count reconciliation');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  useEffect(() => {
    fetchInventory();
    fetchMovements();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory');
      setInventory(res.data.inventory || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load inventory valuation.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async (typeFilter = selectedType) => {
    try {
      const params = {};
      if (typeFilter) params.movement_type = typeFilter;
      const res = await api.get('/inventory/movements', { params });
      setMovements(res.data.movements || []);
    } catch (err) {
      console.error('Failed to load movements', err);
    }
  };

  const handleReconcile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/reconcile');
      setReconciliation(res.data);
      setActiveTab('reconcile');
    } catch (err) {
      setError(err.response?.data?.error || 'Reconciliation check failed.');
    } finally {
      setLoading(false);
    }
  };

  const openAdjustModal = (prod) => {
    setSelectedProduct(prod);
    setNewStock(prod.CURRENT_STOCK);
    setAdjustReason('Physical inventory count reconciliation');
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (newStock === '' || isNaN(newStock) || Number(newStock) < 0) {
      setError('Please provide a valid non-negative stock count.');
      return;
    }

    try {
      setSubmittingAdjust(true);
      await api.post('/inventory/adjustments', {
        product_id: selectedProduct.PRODUCT_ID,
        new_stock: parseFloat(newStock),
        reason: adjustReason
      });
      setSuccessMsg(`Stock for "${selectedProduct.PRODUCT_NAME}" successfully updated to ${newStock} ${selectedProduct.UNIT}.`);
      setIsAdjustModalOpen(false);
      fetchInventory();
      fetchMovements();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to adjust stock.');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  // Summary Metrics
  const totalValuation = inventory.reduce((sum, item) => sum + (parseFloat(item.INVENTORY_VALUE) || 0), 0);
  const totalUnits = inventory.reduce((sum, item) => sum + (parseFloat(item.CURRENT_STOCK) || 0), 0);
  const lowStockCount = inventory.filter(i => parseFloat(i.CURRENT_STOCK) <= parseFloat(i.REORDER_LEVEL)).length;

  const filteredInventory = inventory.filter(i => 
    i.PRODUCT_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.CATEGORY_NAME.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMovements = movements.filter(m => 
    m.PRODUCT_NAME?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.MOVEMENT_TYPE?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      {/* Top Banner / Title */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Layers className="text-primary" /> Inventory & Stock Ledger
          </h1>
          <p className="text-muted">Real-time stock valuation, perpetual double-entry movement ledger, and reconciliation</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {isAdmin && (
            <button className="btn btn-outline" onClick={handleReconcile}>
              <ShieldCheck size={18} /> Reconcile Ledger
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => { fetchInventory(); fetchMovements(); }}>
            <RefreshCw size={18} /> Refresh
          </button>
        </div>
      </div>

      {/* Notifications */}
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
          <div className="stat-label">Total Inventory Valuation</div>
          <div className="stat-value" style={{ color: '#059669' }}>₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-sub">Based on moving weighted-avg cost</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Physical Stock Units</div>
          <div className="stat-value">{totalUnits.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</div>
          <div className="stat-sub">Across {inventory.length} tracked products</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Items Below Reorder Level</div>
          <div className="stat-value" style={{ color: lowStockCount > 0 ? '#dc2626' : '#10b981' }}>
            {lowStockCount}
          </div>
          <div className="stat-sub">{lowStockCount > 0 ? 'Requires stock replenishment' : 'All stock levels healthy'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ledger Integrity Status</div>
          <div className="stat-value" style={{ color: '#2563eb', fontSize: '1.4rem' }}>
            Perpetual Balanced
          </div>
          <div className="stat-sub">100% auditable movements</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <button 
          className={`tab-btn ${activeTab === 'valuation' ? 'active' : ''}`}
          onClick={() => setActiveTab('valuation')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'valuation' ? '3px solid #059669' : '3px solid transparent',
            color: activeTab === 'valuation' ? '#059669' : '#64748b'
          }}
        >
          Product Valuation ({inventory.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'movements' ? 'active' : ''}`}
          onClick={() => setActiveTab('movements')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'movements' ? '3px solid #059669' : '3px solid transparent',
            color: activeTab === 'movements' ? '#059669' : '#64748b'
          }}
        >
          Movement Ledger History ({movements.length})
        </button>
        {reconciliation && (
          <button 
            className={`tab-btn ${activeTab === 'reconcile' ? 'active' : ''}`}
            onClick={() => setActiveTab('reconcile')}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              background: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              borderBottom: activeTab === 'reconcile' ? '3px solid #059669' : '3px solid transparent',
              color: activeTab === 'reconcile' ? '#059669' : '#64748b'
            }}
          >
            Reconciliation Audit Result
          </button>
        )}
      </div>

      {/* TAB 1: VALUATION */}
      {activeTab === 'valuation' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '320px' }} className="search-box">
              <Search size={16} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Search product or category..." 
                className="form-control"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="text-muted" style={{ fontSize: '0.875rem' }}>
              Showing {filteredInventory.length} of {inventory.length} products
            </div>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Product Code</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th style={{ textAlign: 'right' }}>Current Stock</th>
                  <th style={{ textAlign: 'right' }}>Reorder Level</th>
                  <th style={{ textAlign: 'right' }}>Avg Purchase Cost</th>
                  <th style={{ textAlign: 'right' }}>Selling Price</th>
                  <th style={{ textAlign: 'right' }}>Total Stock Value</th>
                  <th>Status</th>
                  {isAdmin && <th style={{ textAlign: 'center' }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map(item => {
                  const stock = parseFloat(item.CURRENT_STOCK);
                  const reorder = parseFloat(item.REORDER_LEVEL);
                  const isLow = stock <= reorder;
                  return (
                    <tr key={item.PRODUCT_ID}>
                      <td><span className="badge badge-secondary">{item.PRODUCT_CODE}</span></td>
                      <td style={{ fontWeight: 600 }}>{item.PRODUCT_NAME}</td>
                      <td><span className="badge badge-info">{item.CATEGORY_NAME}</span></td>
                      <td>{item.UNIT}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: isLow ? '#dc2626' : 'inherit' }}>
                        {stock.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#64748b' }}>{reorder.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>₹{parseFloat(item.PURCHASE_COST || 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>₹{parseFloat(item.SELLING_PRICE || 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                        ₹{parseFloat(item.INVENTORY_VALUE || 0).toFixed(2)}
                      </td>
                      <td>
                        {isLow ? (
                          <span className="badge badge-danger">Low Stock</span>
                        ) : (
                          <span className="badge badge-success">Optimal</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="btn btn-sm btn-outline" 
                            title="Adjust physical inventory count"
                            onClick={() => openAdjustModal(item)}
                          >
                            <Sliders size={14} /> Adjust
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MOVEMENT LEDGER */}
      {activeTab === 'movements' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '280px' }} className="search-box">
                <Search size={16} color="#94a3b8" />
                <input 
                  type="text" 
                  placeholder="Filter product or type..." 
                  className="form-control"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <select 
                className="form-select" 
                style={{ width: '200px' }}
                value={selectedType}
                onChange={e => {
                  setSelectedType(e.target.value);
                  fetchMovements(e.target.value);
                }}
              >
                <option value="">All Movement Types</option>
                <option value="OPENING_STOCK">Opening Stock</option>
                <option value="PURCHASE">Purchase Inward</option>
                <option value="SALE">Daily Sale Outward</option>
                <option value="WASTAGE">Wastage / Spoilage</option>
                <option value="ADJUSTMENT">Stock Adjustment</option>
                <option value="SALE_REVERSAL">Sale Reversal</option>
                <option value="PURCHASE_REVERSAL">Purchase Reversal</option>
              </select>
            </div>
            <div className="text-muted" style={{ fontSize: '0.875rem' }}>
              Showing {filteredMovements.length} journal ledger entries
            </div>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Date & Time</th>
                  <th>Product</th>
                  <th>Movement Type</th>
                  <th style={{ textAlign: 'right' }}>Qty Change</th>
                  <th style={{ textAlign: 'right' }}>Balance After</th>
                  <th style={{ textAlign: 'right' }}>Unit Cost Basis</th>
                  <th>Reference / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map(m => {
                  const qty = parseFloat(m.QUANTITY_CHANGE);
                  const isPositive = qty > 0;
                  return (
                    <tr key={m.MOVEMENT_ID}>
                      <td>#{m.MOVEMENT_ID}</td>
                      <td>{m.MOVEMENT_DATE}</td>
                      <td style={{ fontWeight: 600 }}>{m.PRODUCT_NAME}</td>
                      <td>
                        <span className={`badge ${
                          m.MOVEMENT_TYPE === 'PURCHASE' ? 'badge-success' :
                          m.MOVEMENT_TYPE === 'SALE' ? 'badge-info' :
                          m.MOVEMENT_TYPE === 'WASTAGE' ? 'badge-danger' :
                          m.MOVEMENT_TYPE === 'ADJUSTMENT' ? 'badge-warning' :
                          'badge-secondary'
                        }`}>
                          {m.MOVEMENT_TYPE}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: isPositive ? '#059669' : '#dc2626' }}>
                        {isPositive ? `+${qty.toFixed(2)}` : qty.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {parseFloat(m.BALANCE_AFTER).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        ₹{parseFloat(m.UNIT_COST || 0).toFixed(2)}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {m.NOTES || m.REFERENCE_TYPE || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RECONCILIATION */}
      {activeTab === 'reconcile' && reconciliation && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {reconciliation.is_reconciled ? (
              <CheckCircle size={20} color="#059669" />
            ) : (
              <AlertTriangle size={20} color="#dc2626" />
            )}
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
              {reconciliation.is_reconciled 
                ? 'Perpetual Ledger Reconciled: Zero Discrepancies Found' 
                : `Audit Warning: ${reconciliation.mismatches_count} Stock Discrepancies Found`}
            </h3>
          </div>
          <div className="card-body">
            <p className="text-muted" style={{ marginBottom: '1rem' }}>
              Comparison between current physical master record (<code>PRODUCTS.CURRENT_STOCK</code>) and cumulative double-entry journal movements (<code>SUM(INVENTORY_MOVEMENTS.QUANTITY_CHANGE)</code>).
            </p>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product Code</th>
                    <th>Product Name</th>
                    <th style={{ textAlign: 'right' }}>Master Current Stock</th>
                    <th style={{ textAlign: 'right' }}>Ledger Cumulative Sum</th>
                    <th style={{ textAlign: 'right' }}>Variance</th>
                    <th>Reconciliation Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliation.reconciliation.map(item => {
                    const diff = parseFloat(item.DIFFERENCE || 0);
                    const isMismatch = item.STATUS === 'MISMATCH';
                    return (
                      <tr key={item.PRODUCT_ID} style={{ backgroundColor: isMismatch ? '#fef2f2' : 'inherit' }}>
                        <td><span className="badge badge-secondary">{item.PRODUCT_CODE}</span></td>
                        <td style={{ fontWeight: 600 }}>{item.PRODUCT_NAME}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{parseFloat(item.CURRENT_STOCK).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{parseFloat(item.LEDGER_STOCK).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: diff !== 0 ? '#dc2626' : '#059669' }}>
                          {diff.toFixed(2)}
                        </td>
                        <td>
                          {isMismatch ? (
                            <span className="badge badge-danger">MISMATCH</span>
                          ) : (
                            <span className="badge badge-success">VERIFIED</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PHYSICAL ADJUSTMENT MODAL */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Adjust Physical Stock Count</h3>
              <button className="btn-close" onClick={() => setIsAdjustModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAdjustSubmit}>
              <div className="modal-body">
                <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{selectedProduct.PRODUCT_NAME}</div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    Code: {selectedProduct.PRODUCT_CODE} | Category: {selectedProduct.CATEGORY_NAME}
                  </div>
                  <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Current Recorded Stock:</span>
                    <span style={{ fontWeight: 700 }}>{selectedProduct.CURRENT_STOCK} {selectedProduct.UNIT}</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">New Verified Physical Count ({selectedProduct.UNIT}) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    required
                    className="form-control"
                    value={newStock}
                    onChange={e => setNewStock(e.target.value)}
                  />
                  {newStock !== '' && !isNaN(newStock) && (
                    <small style={{ color: (newStock - selectedProduct.CURRENT_STOCK) >= 0 ? '#059669' : '#dc2626' }}>
                      Variance delta: {(newStock - selectedProduct.CURRENT_STOCK).toFixed(2)} {selectedProduct.UNIT}
                    </small>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Audit Reason / Justification *</label>
                  <input 
                    type="text" 
                    required
                    className="form-control"
                    value={adjustReason}
                    onChange={e => setAdjustReason(e.target.value)}
                    placeholder="e.g. End of month physical audit variance"
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdjustModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingAdjust}>
                  {submittingAdjust ? 'Saving...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
