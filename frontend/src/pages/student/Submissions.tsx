import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Code2, Clock, CheckCircle2, XCircle, AlertCircle, Terminal, Eye, FileCode } from 'lucide-react';
import { StudentShell } from '../../components/layout/AppShell';
import { listSubmissions, type SubmissionDetail } from '../../api/submissions';

export default function StudentSubmissions() {
  const [selectedSub, setSelectedSub] = useState<SubmissionDetail | null>(null);

  const { data: submissions = [], isLoading } = useQuery<SubmissionDetail[]>({
    queryKey: ['student-submissions'],
    queryFn: () => listSubmissions(),
  });

  return (
    <StudentShell>
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)' }}>
            Code Submissions
          </h1>
          <p className="text-secondary" style={{ marginTop: 'var(--space-1)' }}>
            Audit history of your program submissions, test execution verdicts, and runtimes.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <p className="text-secondary">Loading submissions...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
          <Terminal size={44} style={{ color: 'var(--color-text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', marginBottom: 8 }}>
            No submissions recorded yet
          </h3>
          <p className="text-secondary" style={{ maxWidth: 420, margin: '0 auto' }}>
            When you solve and submit coding challenges in an assessment, your execution history and verdicts will appear here.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-gray-50)', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Verdict</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Language</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Score</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Runtime</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Tests Passed</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Submitted At</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => {
                  const passedTests = sub.test_results?.filter((t) => t.passed).length || 0;
                  const totalTests = sub.test_results?.length || 0;

                  return (
                    <tr key={sub.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="table-row-hover">
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <span
                          className={`badge ${
                            sub.verdict === 'accepted' ? 'badge-success' : 'badge-error'
                          }`}
                          style={{ textTransform: 'capitalize' }}
                        >
                          {sub.verdict ? sub.verdict.replace('_', ' ') : 'Evaluated'}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-medium)' }}>
                        {sub.language}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <strong>{Math.round(sub.score ?? 0)}%</strong>
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {sub.execution_time_ms ?? 0}ms
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)' }}>
                        {passedTests} / {totalTests} passed
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {new Date(sub.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedSub(sub)}
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submission Detail Modal */}
      {selectedSub && (
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
              maxWidth: 720,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 'var(--space-6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>
                  Submission Evaluation
                </h3>
                <span className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
                  Submitted on {new Date(selectedSub.created_at).toLocaleString()}
                </span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedSub(null)}>
                Close
              </button>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <span className={`badge ${selectedSub.verdict === 'accepted' ? 'badge-success' : 'badge-error'}`}>
                {selectedSub.verdict?.replace('_', ' ').toUpperCase()}
              </span>
              <span className="badge badge-secondary">Score: {Math.round(selectedSub.score ?? 0)}%</span>
              <span className="badge badge-secondary">Time: {selectedSub.execution_time_ms}ms</span>
            </div>

            {/* Test results breakdown */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                Test Case Breakdown
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {selectedSub.test_results?.map((tr, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 8,
                      borderRadius: 6,
                      background: tr.passed ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                      fontSize: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>
                      Test #{idx + 1} {tr.is_hidden ? '(Hidden)' : '(Public)'}: <strong>{tr.passed ? 'PASSED' : 'FAILED'}</strong>
                    </span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{tr.execution_time_ms}ms</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Source code if available */}
            {selectedSub.source_code && (
              <div>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  Submitted Source Code ({selectedSub.language})
                </span>
                <pre
                  style={{
                    background: 'var(--color-gray-900)',
                    color: '#f8fafc',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-xs)',
                    overflowX: 'auto',
                    marginTop: 8,
                  }}
                >
                  <code>{selectedSub.source_code}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </StudentShell>
  );
}

