import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, Printer, RefreshCw, 
  Search, Calendar, TrendingUp, Layers, Trash2, BarChart2 
} from 'lucide-react';
import api from '../api/client';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('daily-sales');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const reportTabs = [
    { id: 'daily-sales', label: 'Daily Sales Summary', endpoint: '/reports/daily-sales', exportType: 'daily-sales' },
    { id: 'monthly-sales', label: 'Monthly Financials', endpoint: '/reports/monthly-sales', exportType: 'monthly-sales' },
    { id: 'product-sales', label: 'Product Performance', endpoint: '/reports/product-sales', exportType: 'products' },
    { id: 'category-sales', label: 'Category Performance', endpoint: '/reports/category-sales', exportType: 'categories' },
    { id: 'inventory', label: 'Inventory Valuation', endpoint: '/reports/inventory', exportType: 'inventory' },
    { id: 'wastage', label: 'Wastage & Spoilage', endpoint: '/reports/wastage', exportType: 'wastage' }
  ];

  const currentTabConfig = reportTabs.find(t => t.id === activeTab);

  useEffect(() => {
    fetchReportData(activeTab);
  }, [activeTab]);

  const fetchReportData = async (tabId) => {
    const config = reportTabs.find(t => t.id === tabId);
    if (!config) return;
    try {
      setLoading(true);
      const res = await api.get(config.endpoint);
      setData(res.data.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to load ${config.label}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!currentTabConfig) return;
    const token = localStorage.getItem('token');
    const url = `/api/reports/export?type=${currentTabConfig.exportType}`;
    
    // Trigger download using an anchor element with Bearer token header or window
    api.get(url, { responseType: 'blob' })
      .then(response => {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${currentTabConfig.exportType}_report.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => {
        alert('Failed to download CSV: ' + (err.message || 'Unknown error'));
      });
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter rows
  const filteredData = data.filter(row => {
    if (!searchTerm) return true;
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="page-container">
      {/* Top Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileText className="text-primary" /> Analytical Reports & Data Export
          </h1>
          <p className="text-muted">Standard business intelligence views, printable statements, and Power BI CSV export feeds</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => fetchReportData(activeTab)}>
            <RefreshCw size={18} /> Refresh
          </button>
          <button className="btn btn-outline" onClick={handlePrint}>
            <Printer size={18} /> Print Report
          </button>
          <button className="btn btn-primary" onClick={handleDownloadCsv}>
            <Download size={18} /> Download CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Report Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '2px' }}>
        {reportTabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              background: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              borderBottom: activeTab === tab.id ? '3px solid #059669' : '3px solid transparent',
              color: activeTab === tab.id ? '#059669' : '#64748b'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Box */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '320px' }} className="search-box">
            <Search size={16} color="#94a3b8" />
            <input 
              type="text" 
              placeholder={`Search in ${currentTabConfig?.label}...`}
              className="form-control"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>
            Showing {filteredData.length} of {data.length} records | Compatible with Microsoft Power BI & Excel
          </div>
        </div>
      </div>

      {/* Dynamic Data Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{currentTabConfig?.label}</h3>
          <span className="badge badge-info">View Mode: Tabular Analytical Feed</span>
        </div>
        <div className="table-responsive">
          {filteredData.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  {Object.keys(filteredData[0]).map(key => (
                    <th key={key} style={{ whiteSpace: 'nowrap' }}>
                      {key.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, idx) => (
                  <tr key={idx}>
                    {Object.entries(row).map(([k, v], cellIdx) => {
                      const isNum = typeof v === 'number' || (!isNaN(v) && v !== '' && v !== null && !k.includes('DATE') && !k.includes('ID') && !k.includes('CODE') && !k.includes('KEY'));
                      const isMoney = k.includes('REVENUE') || k.includes('PROFIT') || k.includes('COST') || k.includes('PRICE') || k.includes('VALUE') || k.includes('SALES') || k.includes('EXPENSES');
                      const isMargin = k.includes('MARGIN');

                      let displayVal = v;
                      if (v === null || v === undefined) {
                        displayVal = '—';
                      } else if (isMargin) {
                        displayVal = `${parseFloat(v).toFixed(1)}%`;
                      } else if (isMoney && !isNaN(v)) {
                        displayVal = `₹${parseFloat(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      } else if (isNum && !isNaN(v)) {
                        displayVal = parseFloat(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
                      }

                      return (
                        <td 
                          key={cellIdx} 
                          style={{ 
                            textAlign: isNum ? 'right' : 'left',
                            fontWeight: isMoney || isMargin ? 600 : 'normal',
                            color: k.includes('PROFIT') ? '#059669' : 'inherit'
                          }}
                        >
                          {displayVal}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              {loading ? 'Loading report data...' : 'No records found matching current query.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
