import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Code2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/components.css';

export default function SignInPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => emailRef.current?.focus(), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      // AuthContext sets the user; GuestRoute redirects based on role
      const role = localStorage.getItem('user_role');
      navigate(role === 'teacher' ? '/teacher' : '/student', { replace: true });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      let msg = 'Sign-in failed. Please check your credentials.';
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      } else if (detail && typeof detail === 'object') {
        msg = JSON.stringify(detail);
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M3 8L7 4L11 8L7 12L3 8Z" fill="white" opacity="0.9" />
              <path d="M7 4L13 4L13 12L7 12" stroke="white" strokeWidth="1.5" fill="none" opacity="0.6" />
            </svg>
          </div>
          <span className="auth-logo-text">CodeArena</span>
        </div>

        <h1 className="auth-heading">Welcome back</h1>
        <p className="auth-subheading">Sign in to your account to continue.</p>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-5)' }}>
            <span className="alert-message">{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="signin-email" className="field-label field-label-required">
              Email address
            </label>
            <input
              ref={emailRef}
              id="signin-email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-required="true"
              disabled={isLoading}
            />
          </div>

          <div className="field">
            <label htmlFor="signin-password" className="field-label field-label-required">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                className="input"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                aria-required="true"
                disabled={isLoading}
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  padding: 2,
                  display: 'flex',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="signin-submit"
            className={`btn btn-primary btn-lg${isLoading ? ' btn-loading' : ''}`}
            disabled={isLoading}
            style={{ width: '100%' }}
          >
            {isLoading ? '' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to="/sign-up" className="auth-link">
            Create account
          </Link>
        </p>

        {/* Dev hint */}
        {import.meta.env.DEV && (
          <details
            style={{
              marginTop: 'var(--space-6)',
              borderTop: '1px solid var(--color-border)',
              paddingTop: 'var(--space-4)',
            }}
          >
            <summary
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              Dev credentials
            </summary>
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {[
                { label: 'Teacher (Priya Sharma)', email: 'priya.sharma@codearena.dev', pass: 'Teacher1234' },
                { label: 'Student (Aaryan Patidar)', email: 'aaryan.patidar@codearena.dev', pass: 'Student1234' },
                { label: 'Teacher (Legacy)', email: 'teacher@codearena.test', pass: 'Teacher1234' },
                { label: 'Student (Legacy)', email: 'student@codearena.test', pass: 'Student1234' },
              ].map(({ label, email: e, pass }) => (
                <button
                  key={label}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setEmail(e); setPassword(pass); }}
                  style={{ justifyContent: 'flex-start', gap: 'var(--space-2)' }}
                >
                  <Code2 size={13} />
                  {label}: {e}
                </button>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
