import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, UserCheck, UserX, 
  RefreshCw, CheckCircle, AlertTriangle, KeyRound 
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'STAFF'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/users');
      setUsers(res.data.users || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch user accounts.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.full_name) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/auth/users', formData);
      setSuccessMsg(`User "${formData.username}" created successfully.`);
      setIsModalOpen(false);
      setFormData({
        username: '',
        password: '',
        full_name: '',
        role: 'STAFF'
      });
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (user) => {
    const newStatus = user.STATUS === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionWord = newStatus === 'ACTIVE' ? 'activate' : 'deactivate';
    
    if (!window.confirm(`Are you sure you want to ${actionWord} the account "${user.USERNAME}"?`)) {
      return;
    }

    try {
      await api.put(`/auth/users/${user.USER_ID}/status`, { status: newStatus });
      setSuccessMsg(`User "${user.USERNAME}" is now ${newStatus.toLowerCase()}.`);
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to update status for ${user.USERNAME}.`);
    }
  };

  return (
    <div className="page-container">
      {/* Top Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users className="text-primary" /> User Accounts & Access Control
          </h1>
          <p className="text-muted">Manage Shop Owner (Admin) and Cashier/Staff accounts and operational permissions</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={fetchUsers}>
            <RefreshCw size={18} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <UserPlus size={18} /> Add New User
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

      {/* Role Explanations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #059669' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Shield size={20} color="#059669" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Shop Owner (Admin Role)</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
            Unrestricted access: manage product catalog, record purchases, reverse transactions, adjust physical inventory, manage staff accounts, and view profit reports & business intelligence.
          </p>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <UserCheck size={20} color="#2563eb" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Cashier / Floor Staff (Staff Role)</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
            Operational access: enter end-of-day sales, view current stock levels and product catalog, record perishable wastage. Cannot edit product master pricing, adjust inventory, or view confidential financial profit statements.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Registered Shop Personnel</h3>
          <span className="text-muted" style={{ fontSize: '0.875rem' }}>{users.length} registered accounts</span>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Username</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Account Status</th>
                <th>Created Date</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isSelf = currentUser && currentUser.user_id === u.USER_ID;
                const isActive = u.STATUS === 'ACTIVE';

                return (
                  <tr key={u.USER_ID}>
                    <td>#{u.USER_ID}</td>
                    <td style={{ fontWeight: 600 }}>
                      {u.USERNAME} {isSelf && <span style={{ fontSize: '0.75rem', color: '#059669' }}>(You)</span>}
                    </td>
                    <td>{u.FULL_NAME}</td>
                    <td>
                      <span className={`badge ${u.ROLE === 'ADMIN' ? 'badge-primary' : 'badge-info'}`}>
                        {u.ROLE}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                        {u.STATUS}
                      </span>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{u.CREATED_AT}</td>
                    <td style={{ textAlign: 'center' }}>
                      {isSelf ? (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Protected</span>
                      ) : (
                        <button 
                          className={`btn btn-sm ${isActive ? 'btn-danger' : 'btn-outline'}`}
                          onClick={() => toggleStatus(u)}
                        >
                          {isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                          <span style={{ marginLeft: '0.35rem' }}>{isActive ? 'Deactivate' : 'Activate'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={20} className="text-primary" /> Create Shop User Account
              </h3>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Full Name *</label>
                  <input 
                    type="text" 
                    name="full_name" 
                    required 
                    className="form-control"
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.full_name}
                    onChange={handleInputChange}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Username *</label>
                    <input 
                      type="text" 
                      name="username" 
                      required 
                      className="form-control"
                      placeholder="e.g. ramesh"
                      value={formData.username}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role *</label>
                    <select 
                      name="role" 
                      required 
                      className="form-select"
                      value={formData.role}
                      onChange={handleInputChange}
                    >
                      <option value="STAFF">Staff (Cashier)</option>
                      <option value="ADMIN">Shop Owner (Admin)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Password *</label>
                  <input 
                    type="password" 
                    name="password" 
                    required 
                    minLength={6}
                    className="form-control"
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                  <small className="text-muted">Passwords are hashed securely with scrypt before storing in Oracle.</small>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
