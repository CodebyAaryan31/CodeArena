import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Download,
  Users,
  Award,
  TrendingUp,
  Percent,
  CheckCircle2,
  Trophy,
} from 'lucide-react';
import { TeacherShell } from '../../components/layout/AppShell';
import { getAssessments } from '../../api/assessments';
import {
  getAssessmentAnalytics,
  getLeaderboard,
  type AssessmentAnalytics,
} from '../../api/analytics';

export default function TeacherAnalytics() {
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');

  const { data: assessments = [] } = useQuery({
    queryKey: ['teacher-assessments'],
    queryFn: getAssessments,
  });

  // Set default selected assessment if not set
  const effectiveId = selectedAssessmentId || (assessments.length > 0 ? assessments[0].id : '');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['assessment-analytics', effectiveId],
    queryFn: () => getAssessmentAnalytics(effectiveId),
    enabled: Boolean(effectiveId),
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['assessment-leaderboard', effectiveId],
    queryFn: () => getLeaderboard(effectiveId),
    enabled: Boolean(effectiveId),
  });

  const exportCSV = () => {
    if (!leaderboard || leaderboard.length === 0) {
      alert('No submission data to export.');
      return;
    }

    const headers = ['Rank', 'Student Name', 'Score', 'Max Score', 'Percentage', 'Duration (Minutes)'];
    const rows = leaderboard.map((l) => [
      l.rank,
      `"${l.student_name}"`,
      l.score,
      l.max_score,
      `${l.percentage}%`,
      l.completion_time_minutes,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `assessment_${effectiveId}_scores.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <TeacherShell>
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)' }}>
              Results & Analytics
            </h1>
            <p className="text-secondary" style={{ marginTop: 'var(--space-1)' }}>
              Comprehensive performance statistics, score distributions, and exportable grade reports.
            </p>
          </div>

          <button className="btn btn-secondary" onClick={exportCSV} disabled={leaderboard.length === 0}>
            <Download size={16} />
            Export Grades (CSV)
          </button>
        </div>
      </div>

      {/* Select Assessment Toolbar */}
      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>
            Assessment:
          </span>
          <select
            className="input"
            value={effectiveId}
            onChange={(e) => setSelectedAssessmentId(e.target.value)}
            style={{ maxWidth: 420 }}
          >
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.question_count} questions)
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <p className="text-secondary">Loading analytics...</p>
        </div>
      ) : !analytics ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <p className="text-secondary">No analytics available.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Key Metrics KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
            <div className="card" style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                <Users size={14} /> Submissions
              </div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', marginTop: 4 }}>
                {analytics.total_submissions}
              </div>
              <span className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
                {analytics.completion_rate}% completion
              </span>
            </div>

            <div className="card" style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                <TrendingUp size={14} /> Average Score
              </div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', marginTop: 4 }}>
                {analytics.average_score} pts
              </div>
              <span className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
                High: {analytics.highest_score} · Low: {analytics.lowest_score}
              </span>
            </div>

            <div className="card" style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                <Percent size={14} /> Pass Rate
              </div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', marginTop: 4, color: analytics.pass_rate >= 50 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {analytics.pass_rate}%
              </div>
              <span className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
                Institutional cutoff applied
              </span>
            </div>
          </div>

          {/* Chart: Score Distribution */}
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-4)' }}>
              Score Distribution
            </h3>
            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.score_distribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="range_label" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface)',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" name="Students" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Trophy size={16} style={{ color: '#EAB308' }} /> Student Leaderboard
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-gray-50)', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', width: 60 }}>Rank</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Student</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Score</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Percentage</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Time Taken</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        No submissions evaluated yet for leaderboard.
                      </td>
                    </tr>
                  ) : (
                    leaderboard.map((item) => (
                      <tr key={item.student_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-bold)' }}>
                          #{item.rank}
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-medium)' }}>
                          {item.student_name}
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                          <strong>{item.score}</strong> / {item.max_score}
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                          <span className={`badge ${item.percentage >= 60 ? 'badge-success' : 'badge-warning'}`}>
                            {item.percentage}%
                          </span>
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                          {item.completion_time_minutes} min
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </TeacherShell>
  );
}
