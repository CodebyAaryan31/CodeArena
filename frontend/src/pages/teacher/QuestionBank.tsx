import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  FileQuestion,
  CheckCircle2,
  HelpCircle,
  Code,
  Tag,
  Check,
} from 'lucide-react';
import { TeacherShell } from '../../components/layout/AppShell';
import {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  type Question,
  type QuestionType,
  type Difficulty,
  type QuestionOption,
} from '../../api/questions';

export default function QuestionBank() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [diffFilter, setDiffFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [qType, setQType] = useState<QuestionType>('single_mcq');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [topic, setTopic] = useState('General');
  const [tags, setTags] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [solutionExplanation, setSolutionExplanation] = useState('');
  const [options, setOptions] = useState<QuestionOption[]>([
    { text: 'Option A', is_correct: true, order_index: 0 },
    { text: 'Option B', is_correct: false, order_index: 1 },
    { text: 'Option C', is_correct: false, order_index: 2 },
    { text: 'Option D', is_correct: false, order_index: 3 },
  ]);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['questions', typeFilter, diffFilter, search],
    queryFn: () =>
      getQuestions({
        type: typeFilter === 'all' ? undefined : (typeFilter as QuestionType),
        difficulty: diffFilter === 'all' ? undefined : (diffFilter as Difficulty),
        search: search.trim() || undefined,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Partial<Question> = {
        title,
        prompt,
        type: qType,
        difficulty,
        topic,
        tags,
        code_snippet: codeSnippet || undefined,
        solution_explanation: solutionExplanation || undefined,
        options: ['single_mcq', 'multi_mcq', 'debugging'].includes(qType) ? options : [],
      };

      if (editingQuestion) {
        return updateQuestion(editingQuestion.id, payload);
      } else {
        return createQuestion(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions'] }),
  });

  const resetForm = () => {
    setEditingQuestion(null);
    setTitle('');
    setPrompt('');
    setQType('single_mcq');
    setDifficulty('easy');
    setTopic('General');
    setTags('');
    setCodeSnippet('');
    setSolutionExplanation('');
    setOptions([
      { text: 'Option A', is_correct: true, order_index: 0 },
      { text: 'Option B', is_correct: false, order_index: 1 },
      { text: 'Option C', is_correct: false, order_index: 2 },
      { text: 'Option D', is_correct: false, order_index: 3 },
    ]);
  };

  const openEdit = (q: Question) => {
    setEditingQuestion(q);
    setTitle(q.title);
    setPrompt(q.prompt);
    setQType(q.type);
    setDifficulty(q.difficulty);
    setTopic(q.topic);
    setTags(q.tags || '');
    setCodeSnippet(q.code_snippet || '');
    setSolutionExplanation(q.solution_explanation || '');
    setOptions(
      q.options?.length > 0
        ? q.options
        : [
            { text: 'Option A', is_correct: true, order_index: 0 },
            { text: 'Option B', is_correct: false, order_index: 1 },
          ]
    );
    setIsModalOpen(true);
  };

  return (
    <TeacherShell>
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)' }}>
              Question Bank
            </h1>
            <p className="text-secondary" style={{ marginTop: 'var(--space-1)' }}>
              Create reusable MCQs, code debugging, output prediction, and conceptual questions.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} />
            Create Question
          </button>
        </div>
      </div>

      {/* Filter bar */}
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
            placeholder="Search questions by prompt or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, width: '100%' }}
          />
        </div>

        <select
          className="input"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ width: 170 }}
        >
          <option value="all">All Types</option>
          <option value="single_mcq">Single MCQ</option>
          <option value="multi_mcq">Multi MCQ</option>
          <option value="output_prediction">Output Prediction</option>
          <option value="debugging">Debugging</option>
          <option value="short_answer">Short Answer</option>
        </select>

        <select
          className="input"
          value={diffFilter}
          onChange={(e) => setDiffFilter(e.target.value)}
          style={{ width: 140 }}
        >
          <option value="all">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {/* Questions list */}
      {isLoading ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div className="skeleton" style={{ height: 24, width: 200, margin: '0 auto 12px' }} />
          <p className="text-secondary">Loading question bank...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
          <FileQuestion size={44} style={{ color: 'var(--color-text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', marginBottom: 8 }}>
            No questions found
          </h3>
          <p className="text-secondary" style={{ maxWidth: 420, margin: '0 auto 20px' }}>
            Build your repository of questions to quickly compose quizzes and assessments.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} />
            Create First Question
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {questions.map((q) => (
            <div key={q.id} className="card" style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <span className="badge badge-secondary" style={{ textTransform: 'uppercase', fontSize: 10 }}>
                      {q.type.replace('_', ' ')}
                    </span>
                    <span
                      className={`badge ${
                        q.difficulty === 'easy'
                          ? 'badge-success'
                          : q.difficulty === 'medium'
                          ? 'badge-warning'
                          : 'badge-error'
                      }`}
                      style={{ fontSize: 10 }}
                    >
                      {q.difficulty}
                    </span>
                    <span className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
                      Topic: <strong>{q.topic}</strong>
                    </span>
                  </div>

                  <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-2)' }}>
                    {q.title}
                  </h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
                    {q.prompt}
                  </p>

                  {q.code_snippet && (
                    <pre
                      style={{
                        background: 'var(--color-gray-900)',
                        color: '#f8fafc',
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-xs)',
                        overflowX: 'auto',
                        marginBottom: 'var(--space-3)',
                      }}
                    >
                      <code>{q.code_snippet}</code>
                    </pre>
                  )}

                  {q.options && q.options.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          style={{
                            padding: 'var(--space-2) var(--space-3)',
                            borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${opt.is_correct ? 'var(--color-success-border)' : 'var(--color-border)'}`,
                            background: opt.is_correct ? 'var(--color-success-light)' : 'var(--color-surface)',
                            fontSize: 'var(--text-xs)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          {opt.is_correct && <Check size={12} style={{ color: 'var(--color-success)', flexShrink: 0 }} />}
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-1)', marginLeft: 'var(--space-4)' }}>
                  <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(q)}>
                    <Edit size={14} />
                  </button>
                  <button
                    className="btn btn-danger-outline btn-icon btn-sm"
                    onClick={() => {
                      if (window.confirm('Delete this question?')) {
                        deleteMutation.mutate(q.id);
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Question Create/Edit Modal */}
      {isModalOpen && (
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
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>
                {editingQuestion ? 'Edit Question' : 'Create New Question'}
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>Question Title *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Binary Search Time Complexity"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: '100%', marginTop: 'var(--space-1)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>Type</label>
                  <select
                    className="input"
                    value={qType}
                    onChange={(e) => setQType(e.target.value as QuestionType)}
                    style={{ width: '100%', marginTop: 'var(--space-1)' }}
                  >
                    <option value="single_mcq">Single MCQ</option>
                    <option value="multi_mcq">Multi MCQ</option>
                    <option value="output_prediction">Output Prediction</option>
                    <option value="debugging">Debugging</option>
                    <option value="short_answer">Short Answer</option>
                  </select>
                </div>
                <div>
                  <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>Difficulty</label>
                  <select
                    className="input"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    style={{ width: '100%', marginTop: 'var(--space-1)' }}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>Topic</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Algorithms"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    style={{ width: '100%', marginTop: 'var(--space-1)' }}
                  />
                </div>
              </div>

              <div>
                <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>Prompt / Question Text *</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="State the problem clearly..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  style={{ width: '100%', marginTop: 'var(--space-1)', resize: 'vertical' }}
                />
              </div>

              <div>
                <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>Optional Code Snippet</label>
                <textarea
                  className="input font-mono"
                  rows={3}
                  placeholder="Optional code snippet for students to analyze..."
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  style={{ width: '100%', marginTop: 'var(--space-1)', resize: 'vertical' }}
                />
              </div>

              {/* Options for MCQ / Debugging */}
              {['single_mcq', 'multi_mcq', 'debugging'].includes(qType) && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>
                      Answer Options (check correct ones)
                    </label>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        setOptions((prev) => [
                          ...prev,
                          { text: `Option ${prev.length + 1}`, is_correct: false, order_index: prev.length },
                        ])
                      }
                    >
                      <Plus size={12} /> Add Option
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {options.map((opt, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <input
                          type={qType === 'single_mcq' ? 'radio' : 'checkbox'}
                          name="correct-opt"
                          checked={opt.is_correct}
                          onChange={(e) => {
                            if (qType === 'single_mcq') {
                              setOptions((prev) =>
                                prev.map((o, i) => ({ ...o, is_correct: i === idx }))
                              );
                            } else {
                              setOptions((prev) =>
                                prev.map((o, i) => (i === idx ? { ...o, is_correct: e.target.checked } : o))
                              );
                            }
                          }}
                        />
                        <input
                          type="text"
                          className="input"
                          value={opt.text}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOptions((prev) =>
                              prev.map((o, i) => (i === idx ? { ...o, text: val } : o))
                            );
                          }}
                          style={{ flex: 1 }}
                        />
                        {options.length > 2 && (
                          <button
                            className="btn btn-danger-outline btn-icon btn-sm"
                            onClick={() => setOptions((prev) => prev.filter((_, i) => i !== idx))}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Solution explanation / expected string */}
              <div>
                <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>
                  {['output_prediction', 'short_answer'].includes(qType)
                    ? 'Expected Output / Answer Text *'
                    : 'Solution Explanation'}
                </label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder={
                    ['output_prediction', 'short_answer'].includes(qType)
                      ? 'Exact expected output to compare against student response...'
                      : 'Explanation shown to students after results release...'
                  }
                  value={solutionExplanation}
                  onChange={(e) => setSolutionExplanation(e.target.value)}
                  style={{ width: '100%', marginTop: 'var(--space-1)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!title.trim() || !prompt.trim() || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TeacherShell>
  );
}
