import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/components.css';

export default function SignUpPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => nameRef.current?.focus(), []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2)
      e.fullName = 'Full name must be at least 2 characters.';
    if (!email.trim()) e.email = 'Email is required.';
    if (!password || password.length < 8)
      e.password = 'Password must be at least 8 characters.';
    else if (!/[A-Z]/.test(password))
      e.password = 'Password must include at least one uppercase letter.';
    else if (!/[0-9]/.test(password))
      e.password = 'Password must include at least one number.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    const fieldErrors = validate();
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;

    setIsLoading(true);
    try {
      await register(email.trim(), fullName.trim(), password, role);
      navigate(role === 'teacher' ? '/teacher' : '/student', { replace: true });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      let msg = 'Registration failed. Please try again.';
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      } else if (detail && typeof detail === 'object') {
        msg = JSON.stringify(detail);
      }
      setServerError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M3 8L7 4L11 8L7 12L3 8Z" fill="white" opacity="0.9" />
              <path d="M7 4L13 4L13 12L7 12" stroke="white" strokeWidth="1.5" fill="none" opacity="0.6" />
            </svg>
          </div>
          <span className="auth-logo-text">CodeArena</span>
        </div>

        <h1 className="auth-heading">Create account</h1>
        <p className="auth-subheading">Join CODEARENA as a student or teacher.</p>

        {serverError && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-5)' }}>
            <span className="alert-message">{serverError}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Role toggle */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}
            role="group"
            aria-label="Account type"
          >
            {(['student', 'teacher'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                style={{
                  padding: 'var(--space-3)',
                  border: 'none',
                  background: role === r ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: role === r ? 'white' : 'var(--color-text-secondary)',
                  fontWeight: role === r ? 600 : 400,
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                  transition: 'background var(--duration-fast)',
                  textTransform: 'capitalize',
                }}
                aria-pressed={role === r}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="field">
            <label htmlFor="signup-name" className="field-label field-label-required">
              Full name
            </label>
            <input
              ref={nameRef}
              id="signup-name"
              type="text"
              className={`input${errors.fullName ? ' input-error' : ''}`}
              placeholder="Your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              aria-required="true"
              aria-describedby={errors.fullName ? 'name-error' : undefined}
              disabled={isLoading}
            />
            {errors.fullName && (
              <span id="name-error" className="field-error" role="alert">
                {errors.fullName}
              </span>
            )}
          </div>

          <div className="field">
            <label htmlFor="signup-email" className="field-label field-label-required">
              Email address
            </label>
            <input
              id="signup-email"
              type="email"
              className={`input${errors.email ? ' input-error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-required="true"
              aria-describedby={errors.email ? 'email-error' : undefined}
              disabled={isLoading}
            />
            {errors.email && (
              <span id="email-error" className="field-error" role="alert">
                {errors.email}
              </span>
            )}
          </div>

          <div className="field">
            <label htmlFor="signup-password" className="field-label field-label-required">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                className={`input${errors.password ? ' input-error' : ''}`}
                placeholder="Min. 8 chars, 1 uppercase, 1 number"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                aria-required="true"
                aria-describedby={errors.password ? 'password-error' : undefined}
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
            {errors.password && (
              <span id="password-error" className="field-error" role="alert">
                {errors.password}
              </span>
            )}
          </div>

          <button
            type="submit"
            id="signup-submit"
            className={`btn btn-primary btn-lg${isLoading ? ' btn-loading' : ''}`}
            disabled={isLoading}
            style={{ width: '100%' }}
          >
            {isLoading ? '' : `Create ${role} account`}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/sign-in" className="auth-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
