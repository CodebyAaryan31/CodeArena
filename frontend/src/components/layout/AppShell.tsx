import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Code2,
  History,
  BarChart2,
  User,
  LogOut,
  ChevronRight,
  BookOpen,
  Users,
  Settings,
  FileQuestion,
  SquarePen,
  Inbox,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// ── Logo ───────────────────────────────────────────────────
function SidebarLogo() {
  return (
    <div className="sidebar-logo">
      <NavLink to="/" className="sidebar-logo-mark">
        <div className="sidebar-logo-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8L7 4L11 8L7 12L3 8Z" fill="white" opacity="0.9" />
            <path d="M7 4L13 4L13 12L7 12" stroke="white" strokeWidth="1.5" fill="none" opacity="0.6" />
          </svg>
        </div>
        <span className="sidebar-logo-text">CodeArena</span>
      </NavLink>
    </div>
  );
}

// ── NavItem ────────────────────────────────────────────────
interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  badge?: number;
}

function NavItem({ to, icon, label, disabled, badge }: NavItemProps) {
  if (disabled) {
    return (
      <span className="nav-item nav-item-disabled">
        <span className="nav-item-icon">{icon}</span>
        {label}
        <span className="text-xs text-muted" style={{ marginLeft: 'auto', fontSize: 10 }}>
          Soon
        </span>
      </span>
    );
  }
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
    >
      <span className="nav-item-icon">{icon}</span>
      {label}
      {badge != null && badge > 0 && (
        <span className="nav-item-badge">{badge}</span>
      )}
    </NavLink>
  );
}

// ── Student Sidebar ────────────────────────────────────────
export function StudentSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/sign-in');
  };

  const initials = (user?.full_name || user?.email || 'Student')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'S';

  return (
    <aside className="app-sidebar">
      <SidebarLogo />

      <nav className="sidebar-nav" role="navigation" aria-label="Student navigation">
        <NavItem to="/student" icon={<LayoutDashboard size={18} />} label="Dashboard" />
        <NavItem to="/student/assessments" icon={<ClipboardList size={18} />} label="Assessments" />
        <NavItem to="/student/practice" icon={<Code2 size={18} />} label="Practice" disabled />
        <NavItem to="/student/submissions" icon={<History size={18} />} label="Submissions" />
        <NavItem to="/student/results" icon={<Trophy size={18} />} label="Results" />
        <NavItem to="/student/profile" icon={<User size={18} />} label="Profile" />
      </nav>

      <div className="sidebar-footer">
        <button className="user-menu-trigger" onClick={handleLogout} aria-label="Sign out">
          <div className="user-avatar" aria-hidden="true">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.full_name || user?.email}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <LogOut size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        </button>
      </div>
    </aside>
  );
}

// ── Teacher Sidebar ────────────────────────────────────────
export function TeacherSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/sign-in');
  };

  const initials = (user?.full_name || user?.email || 'Teacher')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'T';

  return (
    <aside className="app-sidebar">
      <SidebarLogo />

      <nav className="sidebar-nav" role="navigation" aria-label="Teacher navigation">
        <NavItem to="/teacher" icon={<LayoutDashboard size={18} />} label="Dashboard" />
        <NavItem to="/teacher/assessments" icon={<ClipboardList size={18} />} label="Assessments" />
        <NavItem to="/teacher/question-bank" icon={<FileQuestion size={18} />} label="Question Bank" />
        <NavItem to="/teacher/problems" icon={<SquarePen size={18} />} label="Problem Authoring" />
        <NavItem to="/teacher/submissions" icon={<Inbox size={18} />} label="Submissions & Review" />
        <NavItem to="/teacher/results" icon={<BarChart2 size={18} />} label="Results & Analytics" />
        <NavItem to="/teacher/classes" icon={<Users size={18} />} label="Classes & Students" />
        <NavItem to="/teacher/settings" icon={<Settings size={18} />} label="Settings" />
      </nav>

      <div className="sidebar-footer">
        <button className="user-menu-trigger" onClick={handleLogout} aria-label="Sign out">
          <div className="user-avatar" aria-hidden="true">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.full_name || user?.email}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <LogOut size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        </button>
      </div>
    </aside>
  );
}

// ── App Shell Wrappers ─────────────────────────────────────
export function StudentShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <StudentSidebar />
      <main className="app-main">
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}

export function TeacherShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <TeacherSidebar />
      <main className="app-main">
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}
