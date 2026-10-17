import React, { useState, useEffect } from 'react';
import { 
  ReceiptText, Calendar, Filter, Eye, RotateCcw, 
  CheckCircle, AlertCircle, X, Download
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function SalesHistoryPage() {
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reversalLoading, setReversalLoading] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchSales();
  }, [startDate, endDate, statusFilter]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await api.get('/sales', { params });
      setSales(res.data.sales || []);
    } catch (err) {
      setError('Failed to fetch sales history from Oracle.');
    } finally {
      setLoading(false);
    }
  };

  const openSaleDetail = async (saleId) => {
    try {
      const res = await api.get(`/sales/${saleId}`);
      setSelectedSale(res.data.sale);
    } catch (err) {
      setError('Failed to load sales batch details.');
    }
  };

  const handleReverseSale = async () => {
    if (!selectedSale) return;
    setReversalLoading(true);
    try {
      await api.post(`/sales/${selectedSale.SALE_ID}/reverse`, {
        reason: reversalReason || 'Manual reversal from sales history'
      });
      setMessage(`Sale #${selectedSale.SALE_ID} reversed successfully. Inventory stock restored.`);
      setShowReverseModal(false);
      setSelectedSale(null);
      setReversalReason('');
      fetchSales();
    } catch (err) {
      setError(err.response?.data?.error || 'Reversal failed.');
    } finally {
      setReversalLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ReceiptText color="#059669" size={28} />
            <span>Sales History & Transaction Journal</span>
          </h1>
          <p className="page-desc">
            Auditable daily sales batches, revenue reconciliation, and authorized reversals.
          </p>
        </div>
      </div>

      {message && (
        <div className="card" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}>
          {message}
        </div>
      )}

      {error && (
        <div className="card" style={{ backgroundColor: '#fff1f2', borderColor: '#fecdd3', color: '#be123c' }}>
          {error}
        </div>
      )}

      {/* Filter Controls */}
      <div className="filter-bar card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} color="#64748b" />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>From:</span>
          <input 
            type="date" 
            className="form-control" 
            style={{ width: 'auto' }}
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>To:</span>
          <input 
            type="date" 
            className="form-control" 
            style={{ width: 'auto' }}
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={18} color="#64748b" />
          <select 
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="FINALIZED">Finalized</option>
            <option value="DRAFT">Draft</option>
            <option value="REVERSED">Reversed</option>
          </select>
        </div>
      </div>

      {/* Sales List Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Ref No.</th>
              <th>Sale Date</th>
              <th>Items & Qty</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Total Revenue</th>
              <th style={{ textAlign: 'right' }}>COGS</th>
              <th style={{ textAlign: 'right' }}>Gross Profit</th>
              <th style={{ textAlign: 'right' }}>Margin %</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.SALE_ID}>
                <td>
                  <strong>{s.SALE_REF}</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>By: {s.CREATED_BY_NAME || 'Owner'}</div>
                </td>
                <td>{s.SALE_DATE}</td>
                <td>
                  {s.ITEM_COUNT} items ({s.TOTAL_QUANTITY} units)
                </td>
                <td>
                  <span className={`badge ${
                    s.STATUS === 'FINALIZED' ? 'badge-success' : 
                    s.STATUS === 'REVERSED' ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {s.STATUS}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                  ₹{Number(s.TOTAL_REVENUE).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'right', color: '#64748b' }}>
                  ₹{Number(s.TOTAL_COGS).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                  ₹{Number(s.TOTAL_PROFIT).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="badge badge-secondary">{s.PROFIT_MARGIN_PCT}%</span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button 
                    onClick={() => openSaleDetail(s.SALE_ID)} 
                    className="btn btn-secondary btn-sm"
                  >
                    <Eye size={14} />
                    <span>View Items</span>
                  </button>
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No sales transaction batches found matching the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.25rem' }}>Sales Batch: {selectedSale.SALE_REF}</h3>
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Date: {selectedSale.SALE_DATE} | Status: {selectedSale.STATUS}</div>
              </div>
              <button 
                onClick={() => setSelectedSale(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Revenue</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>₹{selectedSale.TOTAL_REVENUE}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>COGS</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>₹{selectedSale.TOTAL_COGS}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Gross Profit</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#059669' }}>₹{selectedSale.TOTAL_PROFIT}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Margin</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{selectedSale.PROFIT_MARGIN_PCT}%</div>
                </div>
              </div>

              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Line Items Breakdown</h4>
              <div className="table-container">
                <table className="table" style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Total (₹)</th>
                      <th>COGS (₹)</th>
                      <th>Profit (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedSale.ITEMS || []).map((it) => (
                      <tr key={it.SALES_ITEM_ID}>
                        <td><strong>{it.PRODUCT_NAME}</strong></td>
                        <td>{it.CATEGORY_NAME}</td>
                        <td>{it.QUANTITY} {it.UNIT}</td>
                        <td>₹{it.SELLING_PRICE}</td>
                        <td style={{ fontWeight: 600 }}>₹{it.LINE_TOTAL}</td>
                        <td>₹{it.COST_OF_GOODS_SOLD}</td>
                        <td style={{ color: '#059669', fontWeight: 600 }}>₹{it.LINE_PROFIT}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              {isAdmin && selectedSale.STATUS === 'FINALIZED' && (
                <button 
                  onClick={() => setShowReverseModal(true)} 
                  className="btn btn-danger"
                >
                  <RotateCcw size={16} />
                  <span>Reverse Sale & Restore Stock</span>
                </button>
              )}
              <button onClick={() => setSelectedSale(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reversal */}
      {showReverseModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', color: '#e11d48' }}>Confirm Transaction Reversal</h3>
              <button onClick={() => setShowReverseModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: '#475569' }}>
                Are you sure you want to reverse batch <strong>{selectedSale?.SALE_REF}</strong>? 
                This will automatically return the sold items to product inventory and record an auditable reversal movement.
              </p>
              <div className="form-group">
                <label className="form-label">Reversal Reason</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="E.g., Customer returned items / entered in error..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowReverseModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button 
                onClick={handleReverseSale} 
                className="btn btn-danger"
                disabled={reversalLoading}
              >
                {reversalLoading ? 'Reversing in Oracle...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
