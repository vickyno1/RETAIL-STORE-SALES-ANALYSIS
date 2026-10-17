import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f1f5f9',
      padding: '1.5rem'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '1rem',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Header Banner */}
        <div style={{
          backgroundColor: '#0f172a',
          padding: '2.25rem 2rem 1.75rem',
          textAlign: 'center',
          color: '#ffffff'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '1rem',
            backgroundColor: '#064e3b',
            marginBottom: '0.85rem'
          }}>
            <Store size={30} color="#34d399" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.25rem' }}>
            Smart Retail Analytics
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            Sales, Inventory & Profit Intelligence System
          </p>
        </div>

        {/* Form Body */}
        <div style={{ padding: '2rem' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#fff1f2',
              color: '#e11d48',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
              border: '1px solid #fecdd3'
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={15} color="#64748b" />
                <span>Username</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={15} color="#64748b" />
                <span>Password</span>
              </label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
            >
              <span>{loading ? 'Authenticating with Oracle...' : 'Sign In to Store Workspace'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Quick Demo Accounts
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setDemoCredentials('admin', 'Admin@123')}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, fontSize: '0.75rem', justifyContent: 'center' }}
              >
                Owner (Admin)
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('staff', 'Staff@123')}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, fontSize: '0.75rem', justifyContent: 'center' }}
              >
                Cashier (Staff)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
