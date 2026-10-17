import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { StudentShell, TeacherShell } from '../components/layout/AppShell';
import { User, Mail, Shield, Calendar, CheckCircle2, LogOut, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const Shell = user?.role === 'teacher' || user?.role === 'admin' ? TeacherShell : StudentShell;

  const handleLogout = async () => {
    await logout();
    navigate('/sign-in');
  };

  const initials = (user?.full_name || user?.email || 'User')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Shell>
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 className="page-title">User Profile</h1>
          <p className="page-description">
            Manage your personal identity, academic credentials, and session settings.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-6)', maxWidth: 1000 }}>
        {/* User Identity Card */}
        <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', height: 'fit-content' }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              fontSize: 'var(--text-2xl)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
              border: '2px solid var(--color-primary-border, #BFDBFE)',
            }}
          >
            {initials}
          </div>

          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            {user?.full_name || 'Anonymous User'}
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            {user?.email}
          </p>

          <span
            className="badge badge-primary"
            style={{ textTransform: 'capitalize', fontSize: 12, padding: '4px 12px' }}
          >
            {user?.role}
          </span>

          <div
            style={{
              marginTop: 'var(--space-6)',
              paddingTop: 'var(--space-6)',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              textAlign: 'left',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Shield size={14} color="var(--color-primary)" />
              <span>Authentication: Local Bearer JWT</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <CheckCircle2 size={14} color="var(--color-success)" />
              <span>Status: Active Verified</span>
            </div>
          </div>
        </div>

        {/* Detailed Information & Preferences */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
              Account Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={13} /> Full Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={user?.full_name || ''}
                  disabled
                  style={{ background: 'var(--color-bg-subtle, #F8FAFC)' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={13} /> Email Address
                </label>
                <input
                  type="email"
                  className="form-input"
                  value={user?.email || ''}
                  disabled
                  style={{ background: 'var(--color-bg-subtle, #F8FAFC)' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Award size={13} /> Academic Role
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={user?.role ? user.role.toUpperCase() : ''}
                  disabled
                  style={{ background: 'var(--color-bg-subtle, #F8FAFC)' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={13} /> Department / Cohort
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={user?.role === 'teacher' ? 'Computer Science & Engineering' : 'Batch 2026 — CS Major'}
                  disabled
                  style={{ background: 'var(--color-bg-subtle, #F8FAFC)' }}
                />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
              Session & Sign Out
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
              Securely terminate your current session on this device.
            </p>

            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ color: 'var(--color-danger, #DC2626)', borderColor: '#FCA5A5' }}
            >
              <LogOut size={15} /> Sign Out of CodeArena
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
