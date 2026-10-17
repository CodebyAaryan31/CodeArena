import { useQuery } from '@tanstack/react-query';
import { Award, CheckCircle2, XCircle, Clock, AlertCircle, FileText, MessageSquare } from 'lucide-react';
import { StudentShell } from '../../components/layout/AppShell';
import { getAssessments, type Assessment } from '../../api/assessments';
import { listAttempts, type AttemptDetail } from '../../api/attempts';

export default function StudentResults() {
  const { data: assessments = [] } = useQuery<Assessment[]>({
    queryKey: ['student-assessments'],
    queryFn: getAssessments,
  });

  const { data: attempts = [], isLoading } = useQuery<AttemptDetail[]>({
    queryKey: ['student-attempts'],
    queryFn: () => listAttempts(),
  });

  const assessmentMap = new Map<string, Assessment>();
  assessments.forEach((a) => assessmentMap.set(a.id, a));

  return (
    <StudentShell>
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)' }}>
            Exam Results & Feedback
          </h1>
          <p className="text-secondary" style={{ marginTop: 'var(--space-1)' }}>
            Official grades, scores, and instructor feedback released for your examination attempts.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <p className="text-secondary">Loading your results...</p>
        </div>
      ) : attempts.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
          <Award size={44} style={{ color: 'var(--color-text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', marginBottom: 8 }}>
            No exam attempts found
          </h3>
          <p className="text-secondary" style={{ maxWidth: 420, margin: '0 auto' }}>
            Complete an assessment to view your results, automated test scores, and teacher evaluations.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {attempts.map((att) => {
            const assessment = assessmentMap.get(att.assessment_id);
            const isReleased = Boolean(assessment?.results_released);

            return (
              <div key={att.id} className="card" style={{ padding: 'var(--space-6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 6 }}>
                      <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>
                        Attempt #{att.attempt_number} · {att.status}
                      </span>
                      {att.submitted_at && (
                        <span className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
                          Submitted: {new Date(att.submitted_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', marginBottom: 6 }}>
                      {assessment?.title || 'Assessment'}
                    </h3>
                    <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>
                      {assessment?.description || 'No description provided.'}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {isReleased ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 4 }}>
                          <span
                            className={`badge ${att.passed ? 'badge-success' : 'badge-error'}`}
                            style={{ fontSize: 12 }}
                          >
                            {att.passed ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>
                          {att.total_score ?? 0} / {att.max_possible_score ?? 100} pts
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                          Passing mark: {assessment?.pass_percentage}%
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="badge badge-secondary" style={{ fontSize: 12 }}>
                          Evaluation Under Review
                        </span>
                        <div style={{ marginTop: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                          Grades will appear once published by instructor
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Teacher Feedback Note if released */}
                {isReleased && att.feedback && (
                  <div
                    style={{
                      marginTop: 'var(--space-4)',
                      padding: 'var(--space-3) var(--space-4)',
                      background: 'var(--color-primary-subtle, #f0f9ff)',
                      border: '1px solid var(--color-primary, #0284c7)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'var(--weight-semibold)', color: '#0369a1', marginBottom: 2 }}>
                      <MessageSquare size={14} /> Teacher Feedback:
                    </div>
                    <p style={{ margin: 0, color: '#0c4a6e' }}>{att.feedback}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </StudentShell>
  );
}

