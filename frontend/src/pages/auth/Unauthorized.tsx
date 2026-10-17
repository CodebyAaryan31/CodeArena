import { ShieldOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const home = user?.role === 'teacher' ? '/teacher' : '/student';
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 'var(--space-8)' }}>
        <ShieldOff size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto var(--space-4)' }} />
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          Access Denied
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
          You don't have permission to view this page.
        </p>
        <Link to={home} className="btn btn-primary">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
