import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, Edit2, 
  Trash2, AlertTriangle, CheckCircle, X, ShieldAlert 
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    product_code: '',
    product_name: '',
    category_id: 1,
    unit: 'kg',
    purchase_cost: '',
    selling_price: '',
    initial_stock: '',
    reorder_level: '10',
    preferred_supplier_id: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchProducts();
    fetchMetadata();
  }, [categoryFilter, statusFilter, search]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter !== 'ALL') params.category_id = categoryFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search) params.search = search;

      const res = await api.get('/products', { params });
      setProducts(res.data.products || []);
    } catch (err) {
      setError('Failed to fetch products from Oracle database.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        api.get('/categories'),
        api.get('/suppliers')
      ]);
      setCategories(cRes.data.categories || []);
      setSuppliers(sRes.data.suppliers || []);
    } catch (err) {}
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      product_code: '',
      product_name: '',
      category_id: categories[0]?.CATEGORY_ID || 1,
      unit: 'kg',
      purchase_cost: '',
      selling_price: '',
      initial_stock: '',
      reorder_level: '10',
      preferred_supplier_id: suppliers[0]?.SUPPLIER_ID || ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (p) => {
    setEditingProduct(p);
    setFormData({
      product_code: p.PRODUCT_CODE,
      product_name: p.PRODUCT_NAME,
      category_id: p.CATEGORY_ID,
      unit: p.UNIT,
      purchase_cost: p.PURCHASE_COST,
      selling_price: p.SELLING_PRICE,
      initial_stock: p.CURRENT_STOCK,
      reorder_level: p.REORDER_LEVEL,
      preferred_supplier_id: p.PREFERRED_SUPPLIER_ID || ''
    });
    setShowModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.PRODUCT_ID}`, formData);
        setMessage(`Product "${formData.product_name}" updated successfully.`);
      } else {
        await api.post('/products', formData);
        setMessage(`Product "${formData.product_name}" added to catalog.`);
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save product in database.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (product) => {
    if (!window.confirm(`Are you sure you want to deactivate "${product.PRODUCT_NAME}"? Historical records will be preserved.`)) {
      return;
    }
    try {
      await api.delete(`/products/${product.PRODUCT_ID}`);
      setMessage(`Product "${product.PRODUCT_NAME}" deactivated.`);
      fetchProducts();
    } catch (err) {
      setError('Failed to deactivate product.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Package color="#059669" size={28} />
            <span>Product Catalog Management</span>
          </h1>
          <p className="page-desc">
            Manage groceries, fruits, vegetables, unit costs, selling prices, and reorder alerts.
          </p>
        </div>

        {isAdmin && (
          <button onClick={handleOpenAddModal} className="btn btn-primary">
            <Plus size={16} />
            <span>Add New Product</span>
          </button>
        )}
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

      {/* Filter Bar */}
      <div className="filter-bar card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by product name or code..."
            style={{ paddingLeft: '2.25rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={18} color="#64748b" />
          <select 
            className="form-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.CATEGORY_ID} value={c.CATEGORY_ID}>{c.CATEGORY_NAME}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select 
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Unit</th>
              <th style={{ textAlign: 'right' }}>Purchase Cost</th>
              <th style={{ textAlign: 'right' }}>Selling Price</th>
              <th style={{ textAlign: 'right' }}>Margin</th>
              <th style={{ textAlign: 'right' }}>Current Stock</th>
              <th style={{ textAlign: 'right' }}>Stock Value</th>
              <th>Preferred Supplier</th>
              {isAdmin && <th style={{ textAlign: 'center' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const isLow = p.CURRENT_STOCK <= p.REORDER_LEVEL;
              return (
                <tr key={p.PRODUCT_ID} style={{ opacity: p.STATUS === 'INACTIVE' ? 0.6 : 1 }}>
                  <td><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.PRODUCT_CODE}</span></td>
                  <td>
                    <strong>{p.PRODUCT_NAME}</strong>
                    {p.STATUS === 'INACTIVE' && <span className="badge badge-danger" style={{ marginLeft: '0.5rem' }}>Inactive</span>}
                  </td>
                  <td><span className="badge badge-secondary">{p.CATEGORY_NAME}</span></td>
                  <td>{p.UNIT}</td>
                  <td style={{ textAlign: 'right', color: '#64748b' }}>₹{Number(p.CURRENT_AVERAGE_COST || p.PURCHASE_COST).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{Number(p.SELLING_PRICE).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="badge badge-success">{p.PROFIT_MARGIN_PCT}%</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`badge ${isLow ? 'badge-warning' : 'badge-success'}`}>
                      {p.CURRENT_STOCK} {p.UNIT}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    ₹{Number(p.INVENTORY_VALUE).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td>{p.PREFERRED_SUPPLIER || '-'}</td>
                  {isAdmin && (
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                        <button 
                          onClick={() => handleOpenEditModal(p)} 
                          className="btn btn-secondary btn-sm"
                          title="Edit Product"
                        >
                          <Edit2 size={13} />
                        </button>
                        {p.STATUS === 'ACTIVE' && (
                          <button 
                            onClick={() => handleDeactivate(p)} 
                            className="btn btn-danger btn-sm"
                            title="Deactivate Product"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 11 : 10} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No products found matching the criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>
                {editingProduct ? `Edit Product: ${editingProduct.PRODUCT_NAME}` : 'Add New Product to Catalog'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Product Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. VEG-016"
                      value={formData.product_code}
                      onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                      disabled={!!editingProduct}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Product Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Fresh Lady Finger"
                      value={formData.product_name}
                      onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      className="form-select"
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      required
                    >
                      {categories.map((c) => (
                        <option key={c.CATEGORY_ID} value={c.CATEGORY_ID}>{c.CATEGORY_NAME}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unit of Measurement *</label>
                    <select
                      className="form-select"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      required
                    >
                      <option value="kg">Kilogram (kg)</option>
                      <option value="g">Gram (g)</option>
                      <option value="piece">Piece</option>
                      <option value="bunch">Bunch</option>
                      <option value="packet">Packet</option>
                      <option value="litre">Litre</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Purchase Cost (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-control"
                      placeholder="0.00"
                      value={formData.purchase_cost}
                      onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Selling Price (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-control"
                      placeholder="0.00"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {!editingProduct && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Initial Opening Stock</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="form-control"
                        placeholder="0"
                        value={formData.initial_stock}
                        onChange={(e) => setFormData({ ...formData, initial_stock: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Reorder Level Alert</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="form-control"
                        placeholder="10"
                        value={formData.reorder_level}
                        onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Preferred Supplier</label>
                  <select
                    className="form-select"
                    value={formData.preferred_supplier_id}
                    onChange={(e) => setFormData({ ...formData, preferred_supplier_id: e.target.value })}
                  >
                    <option value="">None / Open Market</option>
                    {suppliers.map((s) => (
                      <option key={s.SUPPLIER_ID} value={s.SUPPLIER_ID}>{s.SUPPLIER_NAME} ({s.CITY})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving in Oracle...' : (editingProduct ? 'Save Changes' : 'Create Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
