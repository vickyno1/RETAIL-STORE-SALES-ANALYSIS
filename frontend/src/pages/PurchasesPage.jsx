import React, { useState, useEffect } from 'react';
import { 
  Truck, Plus, Calendar, Eye, RotateCcw, 
  Trash, Save, X, CheckCircle, AlertCircle 
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { isAdmin } = useAuth();

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { product_id: '', quantity: '', unit_cost: '', discount_amount: '0' }
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPurchases();
    fetchMetadata();
  }, []);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await api.get('/purchases');
      setPurchases(res.data.purchases || []);
    } catch (err) {
      setError('Failed to load purchases from Oracle.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [sRes, pRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/products?status=ACTIVE')
      ]);
      setSuppliers(sRes.data.suppliers || []);
      setProducts(pRes.data.products || []);
      if (sRes.data.suppliers?.length > 0) {
        setSupplierId(sRes.data.suppliers[0].SUPPLIER_ID);
      }
    } catch (err) {}
  };

  const addItemRow = () => {
    setItems([...items, { product_id: '', quantity: '', unit_cost: '', discount_amount: '0' }]);
  };

  const removeItemRow = (idx) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, val) => {
    const updated = [...items];
    updated[idx][field] = val;

    // Auto-populate default purchase cost when product selected
    if (field === 'product_id') {
      const prod = products.find((p) => p.PRODUCT_ID === parseInt(val));
      if (prod) {
        updated[idx].unit_cost = prod.PURCHASE_COST || '';
      }
    }
    setItems(updated);
  };

  const calculateTotal = () => {
    return items.reduce((sum, it) => {
      const q = parseFloat(it.quantity) || 0;
      const c = parseFloat(it.unit_cost) || 0;
      const d = parseFloat(it.discount_amount) || 0;
      return sum + Math.max(0, (q * c) - d);
    }, 0);
  };

  const handleSubmitPurchase = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const validItems = items.filter((it) => it.product_id && parseFloat(it.quantity) > 0);
    if (validItems.length === 0) {
      setError('Please add at least one valid product with quantity > 0.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/purchases', {
        supplier_id: supplierId,
        purchase_date: purchaseDate,
        notes,
        items: validItems
      });

      setMessage(`Purchase #${res.data.purchase.PURCHASE_REF} recorded! Stock and weighted-average costs updated.`);
      setShowNewModal(false);
      setItems([{ product_id: '', quantity: '', unit_cost: '', discount_amount: '0' }]);
      setNotes('');
      fetchPurchases();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record purchase.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDetail = async (purchaseId) => {
    try {
      const res = await api.get(`/purchases/${purchaseId}`);
      setSelectedPurchase(res.data.purchase);
    } catch (err) {
      setError('Failed to fetch purchase details.');
    }
  };

  const handleReversePurchase = async (purchaseId) => {
    if (!window.confirm('Are you sure you want to reverse this purchase? Stock will be deducted from inventory.')) {
      return;
    }
    try {
      await api.post(`/purchases/${purchaseId}/reverse`, {
        reason: 'Reversed from purchase management screen'
      });
      setMessage(`Purchase #${purchaseId} reversed successfully.`);
      setSelectedPurchase(null);
      fetchPurchases();
    } catch (err) {
      setError(err.response?.data?.error || 'Purchase reversal failed. Check if sufficient stock remains.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Truck color="#059669" size={28} />
            <span>Purchase & Inward Stock Management</span>
          </h1>
          <p className="page-desc">
            Record supplier shipments, update moving weighted-average costs, and track procurement.
          </p>
        </div>

        <button onClick={() => setShowNewModal(true)} className="btn btn-primary">
          <Plus size={16} />
          <span>Record New Purchase</span>
        </button>
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

      {/* Purchases List Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Order Ref</th>
              <th>Date</th>
              <th>Supplier</th>
              <th>City</th>
              <th>Items & Qty</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Total Amount</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.PURCHASE_ID}>
                <td>
                  <strong>{p.PURCHASE_REF}</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>By: {p.CREATED_BY_NAME || 'Admin'}</div>
                </td>
                <td>{p.PURCHASE_DATE}</td>
                <td><strong>{p.SUPPLIER_NAME}</strong></td>
                <td>{p.SUPPLIER_CITY}</td>
                <td>{p.ITEM_COUNT} items ({p.TOTAL_QUANTITY} units)</td>
                <td>
                  <span className={`badge ${p.STATUS === 'COMPLETED' ? 'badge-success' : 'badge-danger'}`}>
                    {p.STATUS}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                  ₹{Number(p.TOTAL_AMOUNT).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button onClick={() => handleOpenDetail(p.PURCHASE_ID)} className="btn btn-secondary btn-sm">
                    <Eye size={13} />
                    <span>View Bill</span>
                  </button>
                </td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No purchase records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Record Purchase Modal */}
      {showNewModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem' }}>Record Supplier Stock Purchase</h3>
              <button onClick={() => setShowNewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Supplier *</label>
                    <select
                      className="form-select"
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      required
                    >
                      {suppliers.map((s) => (
                        <option key={s.SUPPLIER_ID} value={s.SUPPLIER_ID}>
                          {s.SUPPLIER_NAME} ({s.CITY})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Purchase Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.95rem' }}>Line Items Received</h4>
                  <button type="button" onClick={addItemRow} className="btn btn-secondary btn-sm">
                    <Plus size={14} />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="table-container" style={{ marginBottom: '1rem' }}>
                  <table className="table" style={{ fontSize: '0.8125rem' }}>
                    <thead>
                      <tr>
                        <th>Product *</th>
                        <th style={{ width: '130px' }}>Quantity *</th>
                        <th style={{ width: '130px' }}>Cost/Unit (₹) *</th>
                        <th style={{ width: '110px' }}>Discount (₹)</th>
                        <th style={{ textAlign: 'right', width: '120px' }}>Total (₹)</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => {
                        const q = parseFloat(it.quantity) || 0;
                        const c = parseFloat(it.unit_cost) || 0;
                        const d = parseFloat(it.discount_amount) || 0;
                        const lineTot = Math.max(0, (q * c) - d);

                        return (
                          <tr key={idx}>
                            <td>
                              <select
                                className="form-select"
                                value={it.product_id}
                                onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                                required
                              >
                                <option value="">Select Product...</option>
                                {products.map((p) => (
                                  <option key={p.PRODUCT_ID} value={p.PRODUCT_ID}>
                                    {p.PRODUCT_NAME} ({p.UNIT})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                step="any"
                                min="0.001"
                                className="form-control"
                                placeholder="Qty"
                                value={it.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                className="form-control"
                                placeholder="Cost"
                                value={it.unit_cost}
                                onChange={(e) => handleItemChange(idx, 'unit_cost', e.target.value)}
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                className="form-control"
                                placeholder="0"
                                value={it.discount_amount}
                                onChange={(e) => handleItemChange(idx, 'discount_amount', e.target.value)}
                              />
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>
                              ₹{lineTot.toFixed(2)}
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => removeItemRow(idx)}
                                style={{ background: 'none', border: 'none', color: '#e11d48', cursor: 'pointer' }}
                              >
                                <Trash size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem' }}>
                  Total Inward Amount: <span style={{ color: '#059669', marginLeft: '0.5rem' }}>₹{calculateTotal().toFixed(2)}</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes & Delivery Memo</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="E.g., Morning mandi shipment, lorry freight included..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowNewModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Recording in Oracle...' : 'Save & Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Detail Modal */}
      {selectedPurchase && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.2rem' }}>Purchase Order: {selectedPurchase.PURCHASE_REF}</h3>
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Supplier: {selectedPurchase.SUPPLIER_NAME} | Date: {selectedPurchase.PURCHASE_DATE}
                </div>
              </div>
              <button onClick={() => setSelectedPurchase(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="table-container">
                <table className="table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Quantity</th>
                      <th>Unit Cost</th>
                      <th>Discount</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPurchase.ITEMS || []).map((it) => (
                      <tr key={it.PURCHASE_ITEM_ID}>
                        <td><strong>{it.PRODUCT_NAME}</strong></td>
                        <td>{it.CATEGORY_NAME}</td>
                        <td>{it.QUANTITY} {it.UNIT}</td>
                        <td>₹{it.UNIT_COST}</td>
                        <td>₹{it.DISCOUNT_AMOUNT}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{it.LINE_TOTAL}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ textAlign: 'right', marginTop: '1rem', fontSize: '1.25rem', fontWeight: 800 }}>
                Total: ₹{selectedPurchase.TOTAL_AMOUNT}
              </div>
            </div>

            <div className="modal-footer">
              {isAdmin && selectedPurchase.STATUS === 'COMPLETED' && (
                <button onClick={() => handleReversePurchase(selectedPurchase.PURCHASE_ID)} className="btn btn-danger">
                  <RotateCcw size={16} />
                  <span>Reverse Purchase</span>
                </button>
              )}
              <button onClick={() => setSelectedPurchase(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
