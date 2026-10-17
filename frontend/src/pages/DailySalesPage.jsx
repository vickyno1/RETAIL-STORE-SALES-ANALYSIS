import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, Calendar, Search, Filter, Save, 
  CheckCircle, AlertCircle, ArrowLeft, RefreshCw, Calculator, Layers
} from 'lucide-react';
import api from '../api/client';

export default function DailySalesPage() {
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({}); // { [productId]: quantityString }
  const [discounts, setDiscounts] = useState({});
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/products?status=ACTIVE'),
        api.get('/categories')
      ]);
      setProducts(prodRes.data.products || []);
      setCategories(catRes.data.categories || []);
    } catch (err) {
      setError('Failed to load active product catalog from Oracle.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = categoryFilter === 'ALL' || p.CATEGORY_NAME === categoryFilter;
      const matchesSearch = !searchQuery || 
        p.PRODUCT_NAME.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.PRODUCT_CODE.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [products, categoryFilter, searchQuery]);

  // Handle quantity change
  const handleQuantityChange = (productId, val) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: val
    }));
  };

  // Handle discount change
  const handleDiscountChange = (productId, val) => {
    setDiscounts((prev) => ({
      ...prev,
      [productId]: val
    }));
  };

  // Summary calculations
  const summary = useMemo(() => {
    let totalItems = 0;
    let totalQty = 0;
    let totalRevenue = 0;
    let totalCogs = 0;
    const catSubtotals = {};

    products.forEach((p) => {
      const qty = parseFloat(quantities[p.PRODUCT_ID] || 0);
      const disc = parseFloat(discounts[p.PRODUCT_ID] || 0);
      if (qty > 0) {
        totalItems += 1;
        totalQty += qty;
        const lineTotal = Math.max(0, (qty * p.SELLING_PRICE) - disc);
        const lineCogs = qty * (p.CURRENT_AVERAGE_COST || p.PURCHASE_COST || 0);
        totalRevenue += lineTotal;
        totalCogs += lineCogs;

        const cat = p.CATEGORY_NAME || 'Other';
        if (!catSubtotals[cat]) {
          catSubtotals[cat] = { qty: 0, revenue: 0 };
        }
        catSubtotals[cat].qty += qty;
        catSubtotals[cat].revenue += lineTotal;
      }
    });

    const grossProfit = totalRevenue - totalCogs;
    const marginPct = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) : '0.00';

    return { totalItems, totalQty, totalRevenue, totalCogs, grossProfit, marginPct, catSubtotals };
  }, [products, quantities, discounts]);

  // Submit Daily Sales to Backend / Oracle
  const handleSubmit = async (asDraft = false) => {
    setError('');
    setMessage('');

    // Prepare line items
    const items = [];
    let hasOverselling = false;
    let oversoldItem = '';

    for (const p of products) {
      const qty = parseFloat(quantities[p.PRODUCT_ID] || 0);
      const disc = parseFloat(discounts[p.PRODUCT_ID] || 0);
      if (qty > 0) {
        if (!asDraft && qty > p.CURRENT_STOCK) {
          hasOverselling = true;
          oversoldItem = `${p.PRODUCT_NAME} (Entered: ${qty} ${p.UNIT}, Stock: ${p.CURRENT_STOCK} ${p.UNIT})`;
          break;
        }
        items.push({
          product_id: p.PRODUCT_ID,
          quantity: qty,
          selling_price: p.SELLING_PRICE,
          discount_amount: disc
        });
      }
    }

    if (hasOverselling) {
      setError(`Overselling rejected: ${oversoldItem}. Insufficient inventory in shop.`);
      return;
    }

    if (items.length === 0) {
      setError('Please enter sold quantities for at least one product before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = asDraft ? '/sales/draft' : '/sales/daily';
      const res = await api.post(endpoint, {
        sale_date: saleDate,
        items,
        notes: notes || `End of day sales closing for ${saleDate}`
      });

      const sale = res.data.sale;
      setMessage(
        asDraft 
          ? `Draft saved successfully! (Batch #${sale.SALE_ID})`
          : `Daily sales batch #${sale.SALE_ID} committed! Revenue: ₹${sale.TOTAL_REVENUE}, Gross Profit: ₹${sale.TOTAL_PROFIT}. Inventory deducted.`
      );

      if (!asDraft) {
        // Reset quantities
        setQuantities({});
        setDiscounts({});
        fetchInitialData();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit daily sales entry to Oracle.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ShoppingCart color="#059669" size={28} />
            <span>Daily Sales & End-of-Day Closing</span>
          </h1>
          <p className="page-desc">
            Fast, table-based end-of-day sales entry. Automatically calculates line totals, COGS, and gross profit.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            type="button" 
            onClick={() => handleSubmit(true)} 
            className="btn btn-secondary"
            disabled={submitting || summary.totalItems === 0}
          >
            <Save size={16} />
            <span>Save Draft</span>
          </button>

          <button 
            type="button" 
            onClick={() => handleSubmit(false)} 
            className="btn btn-primary"
            disabled={submitting || summary.totalItems === 0}
          >
            <CheckCircle size={16} />
            <span>{submitting ? 'Recording in Oracle...' : 'Commit Daily Sales'}</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <div className="card" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={18} color="#059669" />
            <span>{message}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="card" style={{ backgroundColor: '#fff1f2', borderColor: '#fecdd3', color: '#be123c' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} color="#e11d48" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Real-Time Daily Closing Summary Banner */}
      <div className="card" style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ backgroundColor: '#064e3b', padding: '0.75rem', borderRadius: '0.75rem' }}>
              <Calculator size={28} color="#34d399" />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                Live Closing Revenue
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399' }}>
                ₹{summary.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Items with Sales</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{summary.totalItems} <span style={{ fontSize: '0.85rem', color: '#64748b' }}>products</span></div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Sold Quantity</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{summary.totalQty.toLocaleString('en-IN')} <span style={{ fontSize: '0.85rem', color: '#64748b' }}>units/kg</span></div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Estimated COGS</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f8fafc' }}>₹{summary.totalCogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Estimated Gross Profit</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#818cf8' }}>
                ₹{summary.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                <span style={{ fontSize: '0.85rem', marginLeft: '0.35rem', color: '#a5b4fc' }}>({summary.marginPct}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Subtotals Pill Ribbon */}
        {Object.keys(summary.catSubtotals).length > 0 && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #1e293b', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', alignSelf: 'center' }}>Category Subtotals:</span>
            {Object.entries(summary.catSubtotals).map(([cat, val]) => (
              <span key={cat} style={{ backgroundColor: '#1e293b', padding: '0.25rem 0.65rem', borderRadius: '0.5rem', fontSize: '0.75rem' }}>
                <strong>{cat}:</strong> {val.qty} units = ₹{val.revenue.toLocaleString('en-IN')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Date & Filter Controls */}
      <div className="filter-bar card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} color="#64748b" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Business Date:</span>
          <input 
            type="date" 
            className="form-control" 
            style={{ width: 'auto' }}
            value={saleDate} 
            onChange={(e) => setSaleDate(e.target.value)} 
          />
        </div>

        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by vegetable, fruit, grocery name or code..."
            style={{ paddingLeft: '2.25rem' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
              <option key={c.CATEGORY_ID} value={c.CATEGORY_NAME}>{c.CATEGORY_NAME}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sales Entry Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '100px' }}>Code</th>
              <th>Product Name</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Stock Available</th>
              <th style={{ textAlign: 'right' }}>Selling Price</th>
              <th style={{ width: '160px', textAlign: 'center' }}>Quantity Sold</th>
              <th style={{ width: '120px', textAlign: 'center' }}>Discount (₹)</th>
              <th style={{ textAlign: 'right' }}>Line Total (₹)</th>
              <th style={{ textAlign: 'right' }}>Est. Profit (₹)</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => {
              const qtyVal = quantities[p.PRODUCT_ID] || '';
              const discVal = discounts[p.PRODUCT_ID] || '';
              const qty = parseFloat(qtyVal) || 0;
              const disc = parseFloat(discVal) || 0;
              const lineTotal = Math.max(0, (qty * p.SELLING_PRICE) - disc);
              const lineCogs = qty * (p.CURRENT_AVERAGE_COST || p.PURCHASE_COST || 0);
              const lineProfit = lineTotal - lineCogs;
              const isOverStock = qty > p.CURRENT_STOCK;

              return (
                <tr key={p.PRODUCT_ID} style={{ backgroundColor: qty > 0 ? (isOverStock ? '#fff1f2' : '#f0fdf4') : 'inherit' }}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                      {p.PRODUCT_CODE}
                    </span>
                  </td>
                  <td>
                    <strong>{p.PRODUCT_NAME}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Avg Cost: ₹{p.CURRENT_AVERAGE_COST} / {p.UNIT}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-secondary">{p.CATEGORY_NAME}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`badge ${p.CURRENT_STOCK <= p.REORDER_LEVEL ? 'badge-warning' : 'badge-success'}`}>
                      {p.CURRENT_STOCK} {p.UNIT}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    ₹{p.SELLING_PRICE} / {p.UNIT}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="form-control"
                        placeholder="0"
                        style={{ 
                          textAlign: 'right', 
                          fontWeight: 700,
                          borderColor: isOverStock ? '#e11d48' : (qty > 0 ? '#059669' : '#cbd5e1')
                        }}
                        value={qtyVal}
                        onChange={(e) => handleQuantityChange(p.PRODUCT_ID, e.target.value)}
                      />
                      <span style={{ fontSize: '0.75rem', color: '#64748b', width: '32px' }}>{p.UNIT}</span>
                    </div>
                    {isOverStock && (
                      <div style={{ fontSize: '0.65rem', color: '#e11d48', marginTop: '2px' }}>
                        Exceeds stock ({p.CURRENT_STOCK})
                      </div>
                    )}
                  </td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-control"
                      placeholder="0"
                      style={{ textAlign: 'right' }}
                      value={discVal}
                      onChange={(e) => handleDiscountChange(p.PRODUCT_ID, e.target.value)}
                    />
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: qty > 0 ? '#0f172a' : '#94a3b8' }}>
                    ₹{lineTotal.toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right', color: lineProfit > 0 ? '#059669' : '#64748b', fontWeight: 600 }}>
                    {qty > 0 ? `₹${lineProfit.toFixed(2)}` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Optional Daily Notes */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <label className="form-label">End of Day Closing Notes & Audit Comments (Optional)</label>
        <textarea
          className="form-control"
          rows="2"
          placeholder="E.g., Morning vegetable market shipment arrived, heavy tomato sales due to weekend festival..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </div>
  );
}
