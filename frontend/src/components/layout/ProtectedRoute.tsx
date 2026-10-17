import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// ── Generic protected route ────────────────────────────────
export function ProtectedRoute({
  allowedRoles,
}: {
  allowedRoles?: Array<'student' | 'teacher' | 'admin'>;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="skeleton" style={{ width: 200, height: 16, borderRadius: 8 }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

// ── Redirect away if already authenticated ─────────────────
export function GuestRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return null;

  if (isAuthenticated) {
    const destination = user?.role === 'teacher' ? '/teacher' : '/student';
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}
