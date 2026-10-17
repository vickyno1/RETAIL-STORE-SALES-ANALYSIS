import React, { useState, useEffect } from 'react';
import { 
  Trash2, Plus, RefreshCw, AlertCircle, TrendingDown, 
  Search, Calendar, FileText, CheckCircle 
} from 'lucide-react';
import api from '../api/client';

export default function WastagePage() {
  const [wastageList, setWastageList] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    wastage_date: new Date().toISOString().split('T')[0],
    quantity: '',
    reason: 'Spoilage',
    notes: ''
  });

  useEffect(() => {
    fetchWastage();
    fetchProducts();
  }, []);

  const fetchWastage = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/wastage');
      setWastageList(res.data.wastage || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch wastage records.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data.products || []);
    } catch (err) {
      console.error('Failed to load products for wastage form', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product_id || !formData.quantity || parseFloat(formData.quantity) <= 0) {
      setError('Please select a product and enter a positive quantity.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/inventory/wastage', {
        product_id: parseInt(formData.product_id),
        wastage_date: formData.wastage_date,
        quantity: parseFloat(formData.quantity),
        reason: formData.reason,
        notes: formData.notes
      });
      setSuccessMsg('Wastage recorded successfully. Stock deducted and ledger updated.');
      setIsModalOpen(false);
      setFormData({
        product_id: '',
        wastage_date: new Date().toISOString().split('T')[0],
        quantity: '',
        reason: 'Spoilage',
        notes: ''
      });
      fetchWastage();
      fetchProducts();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record wastage.');
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const totalFinancialLoss = wastageList.reduce((sum, w) => sum + (parseFloat(w.TOTAL_COST) || 0), 0);
  const totalIncidents = wastageList.length;
  const selectedProd = products.find(p => p.PRODUCT_ID === parseInt(formData.product_id));
  const estimatedCost = selectedProd && formData.quantity ? (parseFloat(formData.quantity) * parseFloat(selectedProd.PURCHASE_COST || 0)) : 0;

  const filteredList = wastageList.filter(w => {
    const matchesSearch = 
      (w.PRODUCT_NAME && w.PRODUCT_NAME.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (w.PRODUCT_CODE && w.PRODUCT_CODE.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (w.NOTES && w.NOTES.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesReason = reasonFilter ? w.REASON === reasonFilter : true;
    return matchesSearch && matchesReason;
  });

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Trash2 color="#ef4444" /> Wastage, Spoilage & Shrinkage
          </h1>
          <p className="text-muted">Track perishable decay, damaged inventory, and write-offs to accurately calculate net store profit</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={fetchWastage}>
            <RefreshCw size={18} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Record Wastage
          </button>
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
          <div className="stat-label">Total Wastage Cost Loss</div>
          <div className="stat-value" style={{ color: '#dc2626' }}>
            ₹{totalFinancialLoss.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="stat-sub">Deducted from gross profit calculations</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Logged Incidents</div>
          <div className="stat-value">{totalIncidents}</div>
          <div className="stat-sub">Detailed write-off logs</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Accounting Impact</div>
          <div className="stat-value" style={{ color: '#f59e0b', fontSize: '1.35rem' }}>
            Automatic Ledger Entry
          </div>
          <div className="stat-sub">Reduces stock & posts to ledger</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }} className="search-box">
            <Search size={16} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Search product code, name, or notes..." 
              className="form-control"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="form-select" 
            style={{ width: '220px' }}
            value={reasonFilter}
            onChange={e => setReasonFilter(e.target.value)}
          >
            <option value="">All Reasons</option>
            <option value="Spoilage">Spoilage</option>
            <option value="Damage">Damage</option>
            <option value="Unsold Perishable">Unsold Perishable</option>
            <option value="Quality Rejection">Quality Rejection</option>
          </select>
        </div>
      </div>

      {/* Wastage Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Wastage & Spoilage Incident Log</h3>
          <span className="text-muted" style={{ fontSize: '0.875rem' }}>
            Showing {filteredList.length} incident records
          </span>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Wastage Date</th>
                <th>Product Code</th>
                <th>Product Name</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Quantity</th>
                <th style={{ textAlign: 'right' }}>Unit Cost</th>
                <th style={{ textAlign: 'right' }}>Total Loss</th>
                <th>Reason</th>
                <th>Notes / Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map(w => (
                <tr key={w.WASTAGE_ID}>
                  <td>#{w.WASTAGE_ID}</td>
                  <td>{w.WASTAGE_DATE}</td>
                  <td><span className="badge badge-secondary">{w.PRODUCT_CODE}</span></td>
                  <td style={{ fontWeight: 600 }}>{w.PRODUCT_NAME}</td>
                  <td><span className="badge badge-info">{w.CATEGORY_NAME}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>
                    {parseFloat(w.QUANTITY).toFixed(2)} {w.UNIT}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    ₹{parseFloat(w.UNIT_COST || 0).toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>
                    ₹{parseFloat(w.TOTAL_COST || 0).toFixed(2)}
                  </td>
                  <td>
                    <span className="badge badge-danger">
                      {w.REASON}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {w.NOTES || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD WASTAGE MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trash2 size={20} color="#ef4444" /> Record Wastage / Spoilage
              </h3>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Select Perishable Product *</label>
                  <select 
                    name="product_id" 
                    required 
                    className="form-select"
                    value={formData.product_id}
                    onChange={handleInputChange}
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map(p => (
                      <option key={p.PRODUCT_ID} value={p.PRODUCT_ID}>
                        {p.PRODUCT_NAME} ({p.CATEGORY_NAME}) — In Stock: {p.CURRENT_STOCK} {p.UNIT}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Wastage Date *</label>
                    <input 
                      type="date" 
                      name="wastage_date" 
                      required 
                      className="form-control"
                      value={formData.wastage_date}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Wasted Quantity {selectedProd ? `(${selectedProd.UNIT})` : ''} *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0.01" 
                      max={selectedProd ? selectedProd.CURRENT_STOCK : undefined}
                      required 
                      className="form-control"
                      name="quantity"
                      placeholder="e.g. 2.5"
                      value={formData.quantity}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Reason / Category *</label>
                  <select 
                    name="reason" 
                    required 
                    className="form-select"
                    value={formData.reason}
                    onChange={handleInputChange}
                  >
                    <option value="Spoilage">Spoilage (Natural decay / rot)</option>
                    <option value="Damage">Damage (Physical transit / handling)</option>
                    <option value="Unsold Perishable">Unsold Perishable (Passed freshness threshold)</option>
                    <option value="Quality Rejection">Quality Rejection (Customer rejection)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Observations / Notes</label>
                  <input 
                    type="text" 
                    name="notes" 
                    className="form-control"
                    placeholder="e.g. Morning sorting found mold on lower layer"
                    value={formData.notes}
                    onChange={handleInputChange}
                  />
                </div>

                {selectedProd && formData.quantity && (
                  <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '0.85rem', borderRadius: '0.5rem', color: '#991b1b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span>Unit Purchase Cost:</span>
                      <strong>₹{parseFloat(selectedProd.PURCHASE_COST || 0).toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, marginTop: '0.25rem' }}>
                      <span>Calculated Financial Loss:</span>
                      <span>₹{estimatedCost.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" disabled={submitting}>
                  {submitting ? 'Recording...' : 'Record & Deduct Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
