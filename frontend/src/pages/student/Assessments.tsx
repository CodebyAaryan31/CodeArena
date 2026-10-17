import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Clock,
  Award,
  Play,
  RotateCcw,
  CheckCircle2,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { StudentShell } from '../../components/layout/AppShell';
import { getAssessments, type Assessment } from '../../api/assessments';
import { startAttempt } from '../../api/attempts';

export default function StudentAssessments() {
  const navigate = useNavigate();

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
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)' }}>
            My Assessments
          </h1>
          <p className="text-secondary" style={{ marginTop: 'var(--space-1)' }}>
            Available tests, midterm exams, quizzes, and programming contests.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <p className="text-secondary">Loading your assessments...</p>
        </div>
      ) : assessments.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
          <ClipboardList size={44} style={{ color: 'var(--color-text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', marginBottom: 8 }}>
            No active assessments
          </h3>
          <p className="text-secondary" style={{ maxWidth: 420, margin: '0 auto' }}>
            There are currently no published exams open for submission. Check back soon!
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-5)' }}>
          {assessments.map((a) => (
            <div
              key={a.id}
              className="card"
              style={{
                padding: 'var(--space-6)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  {a.is_closed ? (
                    <span className="badge badge-error" style={{ fontSize: 11 }}>
                      Closed
                    </span>
                  ) : a.is_upcoming ? (
                    <span className="badge badge-warning" style={{ fontSize: 11 }}>
                      Scheduled
                    </span>
                  ) : (
                    <span className="badge badge-success" style={{ fontSize: 11 }}>
                      Active
                    </span>
                  )}
                  <span className="text-secondary" style={{ fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} /> {a.duration_minutes} minutes
                  </span>
                </div>

                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-2)' }}>
                  {a.title}
                </h3>

                <p
                  className="text-secondary"
                  style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}
                >
                  {a.description || 'No description provided.'}
                </p>

                {a.start_time && a.is_upcoming && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning-dark)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} />
                    <span>Opens: {new Date(a.start_time).toLocaleString()}</span>
                  </div>
                )}

                {a.end_time && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={13} />
                    <span>Deadline: {new Date(a.end_time).toLocaleString()}</span>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    gap: 'var(--space-4)',
                    padding: 'var(--space-3)',
                    background: 'var(--color-gray-50)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--space-6)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Award size={14} style={{ color: 'var(--color-primary)' }} />
                    <strong>{a.total_points}</strong> Points
                  </span>
                  <span>
                    <strong>{a.question_count}</strong> Questions
                  </span>
                  <span>
                    Passing: <strong>{a.pass_percentage}%</strong>
                  </span>
                </div>
              </div>

              <div>
                {a.is_closed ? (
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed' }}
                    disabled
                  >
                    <AlertCircle size={16} />
                    Assessment Closed
                  </button>
                ) : a.is_upcoming ? (
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', opacity: 0.85, cursor: 'not-allowed' }}
                    disabled
                  >
                    <Calendar size={16} />
                    Scheduled (Opens Soon)
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    disabled={startMutation.isPending}
                    onClick={() => startMutation.mutate(a.id)}
                  >
                    <Play size={16} />
                    Start Assessment
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </StudentShell>
  );
}
