import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, ReceiptText, Package, 
  Truck, Layers, AlertTriangle, Trash2, DollarSign, 
  FileText, Users, LogOut, Store, UserCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MainLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div style={{ backgroundColor: '#064e3b', padding: '0.45rem', borderRadius: '0.5rem', display: 'flex' }}>
            <Store size={22} color="#34d399" />
          </div>
          <div>
            <div className="sidebar-title">Smart Retail</div>
            <div className="sidebar-subtitle">Analytics System</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Core Operations</div>
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/sales/daily" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <ShoppingCart size={18} />
            <span>Daily Sales Entry</span>
          </NavLink>

          <NavLink to="/sales" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
            <ReceiptText size={18} />
            <span>Sales History</span>
          </NavLink>

          <NavLink to="/purchases" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Truck size={18} />
            <span>Purchases</span>
          </NavLink>

          <div className="nav-section-title">Inventory & Stock</div>
          <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Package size={18} />
            <span>Product Catalog</span>
          </NavLink>

          <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Layers size={18} />
            <span>Inventory & Ledger</span>
          </NavLink>

          <NavLink to="/low-stock" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <AlertTriangle size={18} />
            <span>Low-Stock Alerts</span>
          </NavLink>

          <NavLink to="/wastage" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Trash2 size={18} />
            <span>Wastage & Spoilage</span>
          </NavLink>

          <div className="nav-section-title">Finance & Intelligence</div>
          <NavLink to="/expenses" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <DollarSign size={18} />
            <span>Operating Expenses</span>
          </NavLink>

          <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FileText size={18} />
            <span>Reports & Exports</span>
          </NavLink>

          {isAdmin && (
            <>
              <div className="nav-section-title">Administration</div>
              <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Users size={18} />
                <span>User Management</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <UserCircle size={24} color="#94a3b8" />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {user?.full_name || user?.username}
              </div>
              <div style={{ fontSize: '0.7rem', color: user?.role === 'ADMIN' ? '#34d399' : '#94a3b8' }}>
                {user?.role}
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            title="Sign Out"
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="main-content">
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Today: <strong>{new Date().toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</strong>
            </span>
            <span className="badge badge-success" style={{ gap: '0.35rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669', display: 'inline-block' }}></span>
              Oracle 10g XE Connected
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <NavLink to="/sales/daily" className="btn btn-primary btn-sm">
              <ShoppingCart size={15} />
              <span>Record Daily Sales</span>
            </NavLink>
          </div>
        </header>

        <main className="content-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
