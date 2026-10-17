import { useAuth } from '../../contexts/AuthContext';
import { TeacherShell } from '../../components/layout/AppShell';
import {
  ClipboardList,
  FileQuestion,
  SquarePen,
  Users,
  AlertCircle,
  Plus,
  ArrowRight,
  Clock,
  Award,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAssessments } from '../../api/assessments';
import { getQuestions } from '../../api/questions';
import { getCodingProblems } from '../../api/coding';

export default function TeacherDashboard() {
  const { user } = useAuth();

  const { data: assessments = [] } = useQuery({
    queryKey: ['teacher-assessments'],
    queryFn: getAssessments,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions-count'],
    queryFn: () => getQuestions(),
  });

  const { data: problems = [] } = useQuery({
    queryKey: ['problems-count'],
    queryFn: () => getCodingProblems(),
  });

  const publishedCount = assessments.filter((a) => a.state === 'published').length;

  return (
    <TeacherShell>
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Teacher Dashboard</h1>
            <p className="page-description">
              Welcome back, {user?.full_name}. Oversee your courses, manage assessments, and review results.
            </p>
          </div>
          <Link to="/teacher/assessments/new" className="btn btn-primary">
            <Plus size={16} />
            New Assessment
          </Link>
        </div>
      </div>

      {/* Quick stats / actions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-8)',
        }}
      >
        <ActionCard
          to="/teacher/assessments"
          icon={<ClipboardList size={20} />}
          label="Assessments"
          sublabel={`${publishedCount} published · ${assessments.length} total`}
          color="var(--color-primary)"
          bg="var(--color-primary-light)"
        />
        <ActionCard
          to="/teacher/problems"
          icon={<SquarePen size={20} />}
          label="Coding Problems"
          sublabel={`${problems.length} challenges ready`}
          color="#7C3AED"
          bg="#F3EEFF"
        />
        <ActionCard
          to="/teacher/question-bank"
          icon={<FileQuestion size={20} />}
          label="Question Bank"
          sublabel={`${questions.length} questions available`}
          color="var(--color-success)"
          bg="var(--color-success-light)"
        />
        <ActionCard
          to="/teacher/classes"
          icon={<Users size={20} />}
          label="Classes"
          sublabel="3 active cohorts"
          color="var(--color-warning)"
          bg="var(--color-warning-light)"
        />
      </div>

      {/* Active Assessments list */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', overflow: 'hidden' }}>
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
            Recent Assessments
          </span>
          <Link to="/teacher/assessments" className="btn btn-ghost btn-sm">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {assessments.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
            <AlertCircle size={36} className="empty-state-icon" style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px' }} />
            <p className="empty-state-title" style={{ fontWeight: 'var(--weight-semibold)', marginBottom: 4 }}>No assessments yet</p>
            <p className="empty-state-description" style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              Create your first assessment to evaluate student performance.
            </p>
            <Link to="/teacher/assessments/new" className="btn btn-primary btn-sm">
              <Plus size={14} /> Create assessment
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {assessments.slice(0, 4).map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--space-4) var(--space-6)',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)' }}>{a.title}</span>
                    <span
                      className={`badge ${
                        a.state === 'published'
                          ? 'badge-success'
                          : a.state === 'draft'
                          ? 'badge-secondary'
                          : 'badge-error'
                      }`}
                      style={{ fontSize: 10, textTransform: 'capitalize' }}
                    >
                      {a.state}
                    </span>
                  </div>
                  <div className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginTop: 2, display: 'flex', gap: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> {a.duration_minutes} min
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Award size={12} /> {a.total_points} pts
                    </span>
                    <span>{a.question_count} questions</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Link to={`/teacher/assessments/${a.id}/edit`} className="btn btn-secondary btn-sm">
                    Configure
                  </Link>
                  <Link to={`/teacher/results`} className="btn btn-secondary btn-sm">
                    Results
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TeacherShell>
  );
}

function ActionCard({
  to,
  icon,
  label,
  sublabel,
  color,
  bg,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  color: string;
  bg: string;
}) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
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
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-md)',
          background: bg,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {label}
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          {sublabel}
        </div>
      </div>
    </Link>
  );
}
