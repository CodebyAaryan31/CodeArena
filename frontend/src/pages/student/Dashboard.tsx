import { useAuth } from '../../contexts/AuthContext';
import { StudentShell } from '../../components/layout/AppShell';
import { ClipboardList, History, Trophy, AlertCircle, Play, Clock, Award, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getAssessments } from '../../api/assessments';
import { startAttempt } from '../../api/attempts';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const timeOfDay = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['student-assessments'],
    queryFn: getAssessments,
  });

  const startMutation = useMutation({
    mutationFn: startAttempt,
    onSuccess: (data) => {
      navigate(`/student/exam/${data.id}`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Unable to start assessment');
    },
  });

  return (
    <StudentShell>
      {/* Page header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 className="page-title">
            {timeOfDay()}, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="page-description">Welcome to your CodeArena portal. Your active tests and exams appear below.</p>
        </div>
      </div>

      {/* Quick Links */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 'var(--space-5)',
          marginBottom: 'var(--space-8)',
        }}
      >
        <QuickLink
          to="/student/assessments"
          icon={<ClipboardList size={20} />}
          title="Assessments"
          description={`${assessments.length} active exam${assessments.length === 1 ? '' : 's'}`}
          color="var(--color-primary)"
          bg="var(--color-primary-light)"
        />
        <QuickLink
          to="/student/submissions"
          icon={<History size={20} />}
          title="Submissions"
          description="Review code execution history"
          color="var(--color-success)"
          bg="var(--color-success-light)"
        />
        <QuickLink
          to="/student/results"
          icon={<Trophy size={20} />}
          title="Results & Feedback"
          description="View grades & score breakdowns"
          color="var(--color-warning)"
          bg="var(--color-warning-light)"
        />
      </div>

      {/* Active Assessments */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div
          className="card-header"
          style={{
            padding: 'var(--space-4) var(--space-6)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span className="card-title" style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-md)' }}>
            Available Assessments
          </span>
          <Link to="/student/assessments" className="btn btn-ghost btn-sm">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {assessments.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
            <AlertCircle size={36} className="empty-state-icon" style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px' }} />
            <p className="empty-state-title" style={{ fontWeight: 'var(--weight-semibold)', marginBottom: 4 }}>
              No active assessments
            </p>
            <p className="empty-state-description" style={{ color: 'var(--color-text-secondary)' }}>
              When your instructor schedules an exam or contest, it will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {assessments.map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--space-5) var(--space-6)',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-md)' }}>{a.title}</span>
                    <span className="badge badge-success" style={{ fontSize: 10 }}>Active</span>
                  </div>
                  <div className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginTop: 4, display: 'flex', gap: 16 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> {a.duration_minutes} mins
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Award size={12} /> {a.total_points} pts
                    </span>
                    <span>{a.question_count} questions</span>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  disabled={startMutation.isPending}
                  onClick={() => startMutation.mutate(a.id)}
                >
                  <Play size={14} /> Start Exam
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentShell>
  );
}

function QuickLink({
  to,
  icon,
  title,
  description,
  color,
  bg,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  bg: string;
}) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-4)',
        padding: 'var(--space-5)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xs)',
        textDecoration: 'none',
        transition: 'box-shadow var(--duration-fast), border-color var(--duration-fast)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)';
        (e.currentTarget as HTMLElement).style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-xs)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-lg)',
          background: bg,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: 'var(--text-md)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: 2,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          {description}
        </div>
      </div>
    </Link>
  );
}
