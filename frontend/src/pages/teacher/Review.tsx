import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Eye,
  Edit3,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  User,
  Award,
  FileCode,
  ShieldAlert,
} from 'lucide-react';
import { TeacherShell } from '../../components/layout/AppShell';
import {
  getSubmissionsReview,
  overrideScore,
  releaseResults,
  type SubmissionReviewItem,
} from '../../api/reviews';
import { getAssessments } from '../../api/assessments';
import { getAttempt, type AttemptDetail } from '../../api/attempts';

export default function TeacherReview() {
  const queryClient = useQueryClient();
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [reviewAttemptId, setReviewAttemptId] = useState<string | null>(null);

  // Score override state
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [newScore, setNewScore] = useState<number>(0);
  const [overrideReason, setOverrideReason] = useState<string>('');

  const { data: assessments = [] } = useQuery({
    queryKey: ['teacher-assessments'],
    queryFn: getAssessments,
  });

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['teacher-submissions', selectedAssessmentId],
    queryFn: () =>
      getSubmissionsReview({
        assessment_id: selectedAssessmentId || undefined,
      }),
  });

  const { data: attemptDetail, isLoading: isAttemptLoading } = useQuery({
    queryKey: ['attempt-detail', reviewAttemptId],
    queryFn: () => getAttempt(reviewAttemptId!),
    enabled: Boolean(reviewAttemptId),
  });

  const overrideMutation = useMutation({
    mutationFn: overrideScore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['attempt-detail', reviewAttemptId] });
      setOverrideModalOpen(false);
      setOverrideReason('');
      alert('Score overridden successfully and audit log created.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to override score');
    },
  });

  const releaseMutation = useMutation({
    mutationFn: releaseResults,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-assessments'] });
      alert('Results status updated.');
    },
  });

  const openOverride = (attempt: SubmissionReviewItem | AttemptDetail) => {
    setNewScore(attempt.total_score || 0);
    setOverrideReason('');
    setOverrideModalOpen(true);
  };

  const currentAssessment = assessments.find((a) => a.id === selectedAssessmentId);

  return (
    <TeacherShell>
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)' }}>
              Submissions & Review
            </h1>
            <p className="text-secondary" style={{ marginTop: 'var(--space-1)' }}>
              Inspect student answers, code submissions, override marks with audit tracking, and release results.
            </p>
          </div>

          {selectedAssessmentId && currentAssessment && (
            <button
              className={`btn ${currentAssessment.results_released ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() =>
                releaseMutation.mutate({
                  assessment_id: selectedAssessmentId,
                  release: !currentAssessment.results_released,
                })
              }
              disabled={releaseMutation.isPending}
            >
              <Send size={16} />
              {currentAssessment.results_released ? 'Unrelease Results' : 'Release All Results'}
            </button>
          )}
        </div>
      </div>

      {/* Filter by assessment toolbar */}
      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', whiteSpace: 'nowrap' }}>
            Filter Assessment:
          </span>
          <select
            className="input"
            value={selectedAssessmentId}
            onChange={(e) => setSelectedAssessmentId(e.target.value)}
            style={{ maxWidth: 400 }}
          >
            <option value="">All Assessments</option>
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.state})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Submissions Table */}
      {isLoading ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <p className="text-secondary">Loading submissions...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
          <Award size={44} style={{ color: 'var(--color-text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', marginBottom: 8 }}>
            No submissions yet
          </h3>
          <p className="text-secondary" style={{ maxWidth: 420, margin: '0 auto' }}>
            Student attempts will appear here once they complete or submit their assessments.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-gray-50)', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Student</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Assessment</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Status</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Score</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Integrity</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Submitted At</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Results</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.attempt_id} style={{ borderBottom: '1px solid var(--color-border)' }} className="table-row-hover">
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <div style={{ fontWeight: 'var(--weight-medium)' }}>{sub.student_name}</div>
                      <div className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>{sub.student_email}</div>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      {sub.assessment_title}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <span className={`badge ${sub.status === 'submitted' || sub.status === 'evaluated' ? 'badge-success' : 'badge-warning'}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <strong>{sub.total_score ?? '-'}</strong> / {sub.max_possible_score ?? '-'}
                      {sub.passed != null && (
                        <span className={`badge ${sub.passed ? 'badge-success' : 'badge-error'}`} style={{ marginLeft: 8, fontSize: 10 }}>
                          {sub.passed ? 'Passed' : 'Failed'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <span
                        className={`badge ${
                          (sub as any).integrity_events_count ? 'badge-warning' : 'badge-success'
                        }`}
                        style={{ fontSize: 10 }}
                      >
                        {(sub as any).integrity_events_count
                          ? `${(sub as any).integrity_events_count} signals`
                          : 'Normal'}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'In Progress'}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <span className={`badge ${sub.results_released ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: 10 }}>
                        {sub.results_released ? 'Released' : 'Hidden'}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setReviewAttemptId(sub.attempt_id)}
                        >
                          <Eye size={14} /> Review
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setReviewAttemptId(sub.attempt_id);
                            openOverride(sub);
                          }}
                        >
                          <Edit3 size={14} /> Override
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Review Modal */}
      {reviewAttemptId && attemptDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            className="card"
            style={{
              width: '90%',
              maxWidth: 880,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 'var(--space-6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>
                  Submission Review: {attemptDetail.assessment?.title}
                </h3>
                <span className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
                  Attempt #{attemptDetail.attempt_number} · Total Score: <strong>{attemptDetail.total_score ?? '-'}</strong> / {attemptDetail.max_possible_score ?? '-'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => openOverride(attemptDetail)}>
                  <Edit3 size={14} /> Override Score
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setReviewAttemptId(null)}>
                  Close
                </button>
              </div>
            </div>

            {/* Answer Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
              {attemptDetail.answers?.map((ans, idx) => {
                const aq = attemptDetail.assessment?.questions?.find((q) => q.id === ans.assessment_question_id);
                return (
                  <div
                    key={ans.id}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-4)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                      <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>
                        Question {idx + 1}: {aq?.question?.title || aq?.problem?.title || 'Question'}
                      </span>
                      <span className="badge badge-secondary">
                        Score: {ans.score ?? 0} / {aq?.points ?? 10} pts
                      </span>
                    </div>

                    {/* Coding Answer */}
                    {ans.code_answer ? (
                      <div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                          Language: {ans.language || 'code'}
                        </div>
                        <pre
                          style={{
                            background: 'var(--color-gray-900)',
                            color: '#f8fafc',
                            padding: 'var(--space-3)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--text-xs)',
                            overflowX: 'auto',
                          }}
                        >
                          <code>{ans.code_answer}</code>
                        </pre>
                      </div>
                    ) : ans.selected_option_ids ? (
                      <div style={{ fontSize: 'var(--text-sm)' }}>
                        Selected Option: <strong>{ans.selected_option_ids}</strong>
                      </div>
                    ) : ans.text_answer ? (
                      <div style={{ fontSize: 'var(--text-sm)' }}>
                        Student text answer: <em>"{ans.text_answer}"</em>
                      </div>
                    ) : (
                      <span className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>No answer provided</span>
                    )}
                  </div>
                );
              })}

              {/* Examination Integrity Audit Section */}
              <div
                style={{
                  marginTop: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-gray-50)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-2)' }}>
                  <ShieldAlert size={16} style={{ color: 'var(--color-warning)' }} />
                  <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>
                    Browser Integrity Audit Trail ({(attemptDetail as any).integrity_events?.length || 0} events)
                  </span>
                </div>
                <p className="text-secondary" style={{ fontSize: 11, marginBottom: 8 }}>
                  Signals recorded automatically during the session (tab switches, fullscreen exits, focus loss).
                  These serve as indicators for instructor review, not automated proof of misconduct.
                </p>

                {(attemptDetail as any).integrity_events?.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(attemptDetail as any).integrity_events.map((ev: any) => (
                      <div
                        key={ev.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          background: 'var(--color-surface)',
                          borderRadius: 6,
                          fontSize: 11,
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <span>
                          <strong style={{ color: 'var(--color-warning)' }}>
                            {ev.event_type.replace('_', ' ').toUpperCase()}
                          </strong>
                          : {ev.details}
                        </span>
                        <span style={{ color: 'var(--color-text-muted)' }}>
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={12} /> No integrity signals or tab switches detected during this attempt.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Override Score Modal with Audit Requirement */}
      {overrideModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div className="card" style={{ width: 440, padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <ShieldAlert size={20} style={{ color: 'var(--color-warning)' }} />
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-bold)' }}>
                Manual Score Override
              </h3>
            </div>
            <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-4)' }}>
              Per institutional grading standards, manual score modifications require an audit reason.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>New Total Score</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  value={newScore}
                  onChange={(e) => setNewScore(Number(e.target.value))}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>

              <div>
                <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>
                  Reason for Override (Audit Log) *
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="e.g. Granted partial credit for correct algorithm logic in Q2..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button className="btn btn-secondary" onClick={() => setOverrideModalOpen(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!overrideReason.trim() || overrideMutation.isPending}
                  onClick={() =>
                    overrideMutation.mutate({
                      attempt_id: reviewAttemptId!,
                      new_score: Number(newScore),
                      reason: overrideReason.trim(),
                    })
                  }
                >
                  {overrideMutation.isPending ? 'Saving...' : 'Confirm Override'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TeacherShell>
  );
}
