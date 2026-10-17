import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Eye,
  Send,
  Archive,
  Copy,
  Trash2,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  FileQuestion,
} from 'lucide-react';
import { TeacherShell } from '../../components/layout/AppShell';
import {
  getAssessments,
  publishAssessment,
  archiveAssessment,
  duplicateAssessment,
  deleteAssessment,
  type Assessment,
  type AssessmentState,
} from '../../api/assessments';

export default function TeacherAssessments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState<string>('all');
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const { data: assessments = [], isLoading, error } = useQuery({
    queryKey: ['teacher-assessments'],
    queryFn: getAssessments,
  });

  const publishMutation = useMutation({
    mutationFn: publishAssessment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-assessments'] }),
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : 'Failed to publish assessment.';
      alert(`Publication Rejected: ${message}`);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveAssessment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-assessments'] }),
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to archive assessment.');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateAssessment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-assessments'] }),
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to duplicate assessment.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAssessment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-assessments'] }),
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to delete assessment.');
    },
  });

  const filteredAssessments = assessments.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      (a.description && a.description.toLowerCase().includes(search.toLowerCase()));
    const matchesState = filterState === 'all' || a.state === filterState;
    return matchesSearch && matchesState;
  });

  const getStateBadge = (state: AssessmentState) => {
    switch (state) {
      case 'published':
        return <span className="badge badge-success">Published</span>;
      case 'draft':
        return <span className="badge badge-secondary">Draft</span>;
      case 'scheduled':
        return <span className="badge badge-warning">Scheduled</span>;
      case 'archived':
        return <span className="badge badge-error">Archived</span>;
      default:
        return <span className="badge">{state}</span>;
    }
  };

  return (
    <TeacherShell>
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)' }}>
              Assessments
            </h1>
            <p className="text-secondary" style={{ marginTop: 'var(--space-1)' }}>
              Create, configure, and manage exams, quizzes, and coding contests.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/teacher/assessments/new')}
          >
            <Plus size={16} />
            Create Assessment
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div
        className="card"
        style={{
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          gap: 'var(--space-4)',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
            }}
          />
          <input
            type="text"
            className="input"
            placeholder="Search assessments by title or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {['all', 'published', 'draft', 'archived'].map((st) => (
            <button
              key={st}
              className={`btn btn-sm ${filterState === st ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterState(st)}
              style={{ textTransform: 'capitalize' }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Assessments List / Table */}
      {isLoading ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div className="skeleton" style={{ height: 24, width: 200, margin: '0 auto 12px' }} />
          <p className="text-secondary">Loading assessments...</p>
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
          <FileQuestion size={44} style={{ color: 'var(--color-text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', marginBottom: 8 }}>
            No assessments found
          </h3>
          <p className="text-secondary" style={{ maxWidth: 420, margin: '0 auto 20px' }}>
            {search
              ? 'Try adjusting your search criteria or filters.'
              : 'Get started by creating your first exam or contest with customized questions and automated grading.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/teacher/assessments/new')}
          >
            <Plus size={16} />
            Create First Assessment
          </button>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-gray-50)', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Title</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Status</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Questions</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Duration</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Total Marks</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Results</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssessments.map((a) => (
                  <tr
                    key={a.id}
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <div style={{ fontWeight: 'var(--weight-medium)' }}>{a.title}</div>
                      {a.description && (
                        <div className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                          {a.description.slice(0, 70)}...
                        </div>
                      )}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      {getStateBadge(a.state)}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      {a.question_count} questions
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
                        {a.duration_minutes} min
                      </span>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Award size={14} style={{ color: 'var(--color-text-muted)' }} />
                        {a.total_points} pts
                      </span>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      {a.results_released ? (
                        <span className="badge badge-success" style={{ fontSize: 11 }}>Released</span>
                      ) : (
                        <span className="badge badge-secondary" style={{ fontSize: 11 }}>Unreleased</span>
                      )}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Edit Assessment"
                          onClick={() => navigate(`/teacher/assessments/${a.id}/edit`)}
                        >
                          <Edit size={14} />
                        </button>
                        {a.state === 'draft' && (
                          <button
                            className="btn btn-success btn-sm"
                            title="Publish Assessment"
                            onClick={() => publishMutation.mutate(a.id)}
                            disabled={publishMutation.isPending}
                          >
                            <Send size={14} />
                            Publish
                          </button>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Duplicate"
                          onClick={() => duplicateMutation.mutate(a.id)}
                        >
                          <Copy size={14} />
                        </button>
                        {a.state !== 'archived' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            title="Archive"
                            onClick={() => archiveMutation.mutate(a.id)}
                          >
                            <Archive size={14} />
                          </button>
                        )}
                        {a.state === 'draft' && (
                          <button
                            className="btn btn-danger-outline btn-sm"
                            title="Delete Draft"
                            onClick={() => {
                              if (window.confirm('Delete this draft assessment?')) {
                                deleteMutation.mutate(a.id);
                              }
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </TeacherShell>
  );
}
