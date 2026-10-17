import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Code2,
  Trash2,
  Edit,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  Eye,
  EyeOff,
  Play,
  FileCheck,
} from 'lucide-react';
import { TeacherShell } from '../../components/layout/AppShell';
import {
  getCodingProblems,
  createCodingProblem,
  updateCodingProblem,
  deleteCodingProblem,
  validateProblem,
  type CodingProblem,
  type TestCase,
  type ProblemValidationResponse,
} from '../../api/coding';
import type { Difficulty } from '../../api/questions';

export default function ProblemEditor() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<CodingProblem | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'starter' | 'tests' | 'solution'>('details');

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [topic, setTopic] = useState('Algorithms');
  const [tags, setTags] = useState('');
  const [timeLimitMs, setTimeLimitMs] = useState(2000);
  const [memoryLimitMb, setMemoryLimitMb] = useState(256);

  // New authoring fields
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [constraints, setConstraints] = useState('');
  const [exampleInput, setExampleInput] = useState('');
  const [exampleOutput, setExampleOutput] = useState('');
  const [referenceSolution, setReferenceSolution] = useState('');
  const [referenceSolutionLanguage, setReferenceSolutionLanguage] = useState('python');

  // Starter code & tests
  const [pythonStarter, setPythonStarter] = useState('import sys\n\ndef solve():\n    pass\n\nif __name__ == "__main__":\n    solve()\n');
  const [cppStarter, setCppStarter] = useState('#include <iostream>\nusing namespace std;\n\nint main() {\n    // Code here\n    return 0;\n}\n');
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input_data: '1 2\n', expected_output: '3\n', is_hidden: false, weight: 10, order_index: 0 },
    { input_data: '100 200\n', expected_output: '300\n', is_hidden: true, weight: 15, order_index: 1 },
  ]);

  // Validation state
  const [validationResult, setValidationResult] = useState<ProblemValidationResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: problems = [], isLoading } = useQuery({
    queryKey: ['coding-problems', search],
    queryFn: () => getCodingProblems({ search: search.trim() || undefined }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      const payload: Partial<CodingProblem> = {
        title,
        description,
        difficulty,
        topic,
        tags,
        time_limit_ms: Number(timeLimitMs),
        memory_limit_mb: Number(memoryLimitMb),
        input_format: inputFormat || undefined,
        output_format: outputFormat || undefined,
        constraints: constraints || undefined,
        example_input: exampleInput || undefined,
        example_output: exampleOutput || undefined,
        reference_solution: referenceSolution || undefined,
        reference_solution_language: referenceSolutionLanguage || 'python',
        starter_codes: [
          { language: 'python', code: pythonStarter },
          { language: 'cpp', code: cppStarter },
        ],
        test_cases: testCases.map((tc, idx) => ({
          input_data: tc.input_data || '',
          expected_output: tc.expected_output || '',
          is_hidden: tc.is_hidden,
          weight: Number(tc.weight) || 10,
          order_index: idx,
        })),
      };

      if (editingProblem) {
        return updateCodingProblem(editingProblem.id, payload);
      } else {
        return createCodingProblem(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coding-problems'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.message || 'Failed to save coding problem';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCodingProblem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coding-problems'] }),
  });

  const resetForm = () => {
    setEditingProblem(null);
    setTitle('');
    setDescription('');
    setDifficulty('easy');
    setTopic('Algorithms');
    setTags('');
    setTimeLimitMs(2000);
    setMemoryLimitMb(256);
    setInputFormat('');
    setOutputFormat('');
    setConstraints('');
    setExampleInput('');
    setExampleOutput('');
    setReferenceSolution('');
    setReferenceSolutionLanguage('python');
    setPythonStarter('import sys\n\ndef solve():\n    pass\n\nif __name__ == "__main__":\n    solve()\n');
    setCppStarter('#include <iostream>\nusing namespace std;\n\nint main() {\n    // Code here\n    return 0;\n}\n');
    setTestCases([
      { input_data: '1 2\n', expected_output: '3\n', is_hidden: false, weight: 10, order_index: 0 },
      { input_data: '100 200\n', expected_output: '300\n', is_hidden: true, weight: 15, order_index: 1 },
    ]);
    setActiveTab('details');
    setValidationResult(null);
    setErrorMessage(null);
  };

  const openEdit = (p: CodingProblem) => {
    setEditingProblem(p);
    setTitle(p.title);
    setDescription(p.description);
    setDifficulty(p.difficulty);
    setTopic(p.topic);
    setTags(p.tags || '');
    setTimeLimitMs(p.time_limit_ms);
    setMemoryLimitMb(p.memory_limit_mb);
    setInputFormat(p.input_format || '');
    setOutputFormat(p.output_format || '');
    setConstraints(p.constraints || '');
    setExampleInput(p.example_input || '');
    setExampleOutput(p.example_output || '');
    setReferenceSolution(p.reference_solution || '');
    setReferenceSolutionLanguage(p.reference_solution_language || 'python');

    const py = p.starter_codes?.find((sc) => sc.language === 'python')?.code;
    const cpp = p.starter_codes?.find((sc) => sc.language === 'cpp')?.code;
    if (py) setPythonStarter(py);
    if (cpp) setCppStarter(cpp);

    if (p.test_cases?.length) {
      setTestCases(p.test_cases);
    }
    setActiveTab('details');
    setValidationResult(null);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleValidateReferenceSolution = async () => {
    if (!editingProblem?.id) {
      // Must save first or inform
      setErrorMessage('Please save the problem once before validating reference solution against runner.');
      return;
    }
    try {
      setIsValidating(true);
      setErrorMessage(null);
      // First save current updates to ensure latest reference code and test cases are on server
      await saveMutation.mutateAsync();
      const res = await validateProblem(editingProblem.id);
      setValidationResult(res);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || err.message || 'Reference solution validation failed.');
    } finally {
      setIsValidating(false);
    }
  };


  return (
    <TeacherShell>
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)' }}>
              Problem Authoring
            </h1>
            <p className="text-secondary" style={{ marginTop: 'var(--space-1)' }}>
              Design coding challenges, define constraints, and configure public and hidden test cases.
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
            Create Coding Problem
          </button>
        </div>
      </div>

      {/* Filter / Search */}
      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div style={{ position: 'relative' }}>
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
            placeholder="Search problems by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, width: '100%' }}
          />
        </div>
      </div>

      {/* Problems List */}
      {isLoading ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div className="skeleton" style={{ height: 24, width: 200, margin: '0 auto 12px' }} />
          <p className="text-secondary">Loading problems...</p>
        </div>
      ) : problems.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
          <Code2 size={44} style={{ color: 'var(--color-text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', marginBottom: 8 }}>
            No coding problems yet
          </h3>
          <p className="text-secondary" style={{ maxWidth: 420, margin: '0 auto 20px' }}>
            Author your first programming challenge with starter code and test cases.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} />
            Create Problem
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-4)' }}>
          {problems.map((p) => {
            const publicCount = p.test_cases?.filter((tc) => !tc.is_hidden).length || 0;
            const hiddenCount = p.test_cases?.filter((tc) => tc.is_hidden).length || 0;

            return (
              <div key={p.id} className="card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <span
                      className={`badge ${
                        p.difficulty === 'easy'
                          ? 'badge-success'
                          : p.difficulty === 'medium'
                          ? 'badge-warning'
                          : 'badge-error'
                      }`}
                      style={{ fontSize: 10, textTransform: 'capitalize' }}
                    >
                      {p.difficulty}
                    </span>
                    <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)', marginTop: 6 }}>
                      {p.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                    <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(p)}>
                      <Edit size={14} />
                    </button>
                    <button
                      className="btn btn-danger-outline btn-icon btn-sm"
                      onClick={() => {
                        if (window.confirm('Delete this problem?')) {
                          deleteMutation.mutate(p.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', flex: 1, marginBottom: 'var(--space-4)' }}>
                  {p.description.slice(0, 110)}...
                </p>

                <div
                  style={{
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: 'var(--space-3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} /> {p.time_limit_ms}ms
                  </span>
                  <span>
                    <strong>{publicCount}</strong> public · <strong>{hiddenCount}</strong> hidden tests
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Problem Modal */}
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
              maxWidth: 840,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 'var(--space-6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>
                {editingProblem ? 'Edit Coding Problem' : 'Create Coding Problem'}
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-2)' }}>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'details' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('details')}
              >
                1. General Details
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'specs' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('specs')}
              >
                2. Specs & Constraints
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'starter' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('starter')}
              >
                3. Starter Code
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'tests' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('tests')}
              >
                4. Test Cases ({testCases.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'solution' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('solution')}
              >
                5. Reference Solution & Test
              </button>
            </div>

            {errorMessage && (
              <div
                style={{
                  background: 'var(--color-danger-subtle, #fef2f2)',
                  border: '1px solid var(--color-danger, #ef4444)',
                  color: 'var(--color-danger, #ef4444)',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-4)',
                  fontSize: 'var(--text-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB 1: General Details */}
            {activeTab === 'details' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>Problem Title *</label>
                    <input
                      type="text"
                      className="input"
                      value={title}
                      placeholder="e.g. Two Sum, Balanced Binary Tree"
                      onChange={(e) => setTitle(e.target.value)}
                      style={{ width: '100%', marginTop: 'var(--space-1)' }}
                    />
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
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      style={{ width: '100%', marginTop: 'var(--space-1)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>Time Limit (ms)</label>
                    <input
                      type="number"
                      className="input"
                      min={500}
                      max={10000}
                      step={500}
                      value={timeLimitMs}
                      onChange={(e) => setTimeLimitMs(Number(e.target.value))}
                      style={{ width: '100%', marginTop: 'var(--space-1)' }}
                    />
                  </div>
                  <div>
                    <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>Memory Limit (MB)</label>
                    <input
                      type="number"
                      className="input"
                      min={64}
                      max={1024}
                      step={64}
                      value={memoryLimitMb}
                      onChange={(e) => setMemoryLimitMb(Number(e.target.value))}
                      style={{ width: '100%', marginTop: 'var(--space-1)' }}
                    />
                  </div>
                  <div>
                    <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>Tags (comma-separated)</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="arrays, hash-map, math"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      style={{ width: '100%', marginTop: 'var(--space-1)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>Description (Markdown) *</label>
                  <textarea
                    className="input font-mono"
                    rows={8}
                    placeholder="Provide a clear, detailed problem statement..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ width: '100%', marginTop: 'var(--space-1)', resize: 'vertical' }}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Specs & Constraints */}
            {activeTab === 'specs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>Input Format</label>
                    <textarea
                      className="input font-mono"
                      rows={3}
                      placeholder="e.g. First line contains integer N, followed by N space-separated integers."
                      value={inputFormat}
                      onChange={(e) => setInputFormat(e.target.value)}
                      style={{ width: '100%', marginTop: 'var(--space-1)' }}
                    />
                  </div>
                  <div>
                    <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>Output Format</label>
                    <textarea
                      className="input font-mono"
                      rows={3}
                      placeholder="e.g. Print single integer representing the maximum subarray sum."
                      value={outputFormat}
                      onChange={(e) => setOutputFormat(e.target.value)}
                      style={{ width: '100%', marginTop: 'var(--space-1)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>Constraints</label>
                  <textarea
                    className="input font-mono"
                    rows={3}
                    placeholder="e.g. 1 <= N <= 10^5, -10^9 <= A[i] <= 10^9"
                    value={constraints}
                    onChange={(e) => setConstraints(e.target.value)}
                    style={{ width: '100%', marginTop: 'var(--space-1)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>Example Input</label>
                    <textarea
                      className="input font-mono"
                      rows={3}
                      placeholder="e.g. 5&#10;1 2 3 4 5"
                      value={exampleInput}
                      onChange={(e) => setExampleInput(e.target.value)}
                      style={{ width: '100%', marginTop: 'var(--space-1)' }}
                    />
                  </div>
                  <div>
                    <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>Example Output</label>
                    <textarea
                      className="input font-mono"
                      rows={3}
                      placeholder="e.g. 15"
                      value={exampleOutput}
                      onChange={(e) => setExampleOutput(e.target.value)}
                      style={{ width: '100%', marginTop: 'var(--space-1)' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Starter Code */}
            {activeTab === 'starter' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div>
                  <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>Python Starter Code</label>
                  <textarea
                    className="input font-mono"
                    rows={6}
                    value={pythonStarter}
                    onChange={(e) => setPythonStarter(e.target.value)}
                    style={{ width: '100%', marginTop: 'var(--space-1)' }}
                  />
                </div>
                <div>
                  <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>C++ Starter Code</label>
                  <textarea
                    className="input font-mono"
                    rows={6}
                    value={cppStarter}
                    onChange={(e) => setCppStarter(e.target.value)}
                    style={{ width: '100%', marginTop: 'var(--space-1)' }}
                  />
                </div>
              </div>
            )}

            {/* TAB 4: Test Cases */}
            {activeTab === 'tests' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <label className="label" style={{ fontWeight: 'var(--weight-bold)' }}>
                      Test Cases ({testCases.length})
                    </label>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 8 }}>
                      Public tests are visible to students. Hidden tests are graded privately.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      setTestCases((prev) => [
                        ...prev,
                        { input_data: '', expected_output: '', is_hidden: true, weight: 10, order_index: prev.length },
                      ])
                    }
                  >
                    <Plus size={14} /> Add Test Case
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {testCases.map((tc, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-3)',
                        background: 'var(--color-surface)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                        <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-xs)' }}>
                          Test Case #{idx + 1}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={tc.is_hidden}
                              onChange={(e) => {
                                const val = e.target.checked;
                                setTestCases((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, is_hidden: val } : item))
                                );
                              }}
                            />
                            {tc.is_hidden ? (
                              <span style={{ color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 2 }}>
                                <EyeOff size={12} /> Hidden
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Eye size={12} /> Public
                              </span>
                            )}
                          </label>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Score Weight:</span>
                            <input
                              type="number"
                              className="input"
                              min={1}
                              max={100}
                              value={tc.weight}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setTestCases((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, weight: val } : item))
                                );
                              }}
                              style={{ width: 60, height: 28, fontSize: 'var(--text-xs)', textAlign: 'center' }}
                            />
                          </div>

                          {testCases.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-danger-outline btn-icon btn-sm"
                              onClick={() => setTestCases((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                        <div>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Input (stdin)</span>
                          <textarea
                            className="input font-mono"
                            rows={2}
                            value={tc.input_data || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTestCases((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, input_data: val } : item))
                              );
                            }}
                            style={{ width: '100%', fontSize: 'var(--text-xs)' }}
                          />
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Expected Output (stdout)</span>
                          <textarea
                            className="input font-mono"
                            rows={2}
                            value={tc.expected_output || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTestCases((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, expected_output: val } : item))
                              );
                            }}
                            style={{ width: '100%', fontSize: 'var(--text-xs)' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: Reference Solution & Validation */}
            {activeTab === 'solution' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <label className="label" style={{ fontWeight: 'var(--weight-bold)' }}>Reference Solution</label>
                    <p className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
                      Authoritative solution used to verify test case correctness before publication. Private to instructors.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <select
                      className="input"
                      value={referenceSolutionLanguage}
                      onChange={(e) => setReferenceSolutionLanguage(e.target.value)}
                      style={{ fontSize: 'var(--text-xs)' }}
                    >
                      <option value="python">Python</option>
                      <option value="cpp">C++</option>
                      <option value="javascript">JavaScript</option>
                    </select>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={isValidating || !referenceSolution.trim() || testCases.length === 0}
                      onClick={handleValidateReferenceSolution}
                    >
                      <Play size={14} />
                      {isValidating ? 'Validating on Runner...' : 'Validate Test Cases'}
                    </button>
                  </div>
                </div>

                <textarea
                  className="input font-mono"
                  rows={8}
                  placeholder="Provide reference implementation that produces expected outputs for all test cases..."
                  value={referenceSolution}
                  onChange={(e) => setReferenceSolution(e.target.value)}
                  style={{ width: '100%', fontSize: 'var(--text-xs)' }}
                />

                {validationResult && (
                  <div
                    style={{
                      border: `1px solid ${validationResult.all_passed ? 'var(--color-success)' : 'var(--color-danger)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-4)',
                      background: validationResult.all_passed
                        ? 'var(--color-success-subtle, #f0fdf4)'
                        : 'var(--color-danger-subtle, #fef2f2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                      {validationResult.all_passed ? (
                        <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
                      ) : (
                        <AlertCircle size={18} style={{ color: 'var(--color-danger)' }} />
                      )}
                      <strong style={{ fontSize: 'var(--text-sm)' }}>
                        Validation Summary: {validationResult.passed_tests}/{validationResult.total_tests} test cases passed.
                      </strong>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {validationResult.results.map((r, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: 'var(--color-surface)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--text-xs)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          <span>
                            <strong>Test #{r.order_index + 1}</strong> ({r.is_hidden ? 'Hidden' : 'Public'}):{' '}
                            <span style={{ color: r.verdict === 'Passed' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                              {r.verdict}
                            </span>
                          </span>
                          <span style={{ color: 'var(--color-text-muted)' }}>
                            {r.runtime_ms}ms {r.message ? `· ${r.message}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!title.trim() || !description.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Problem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </TeacherShell>
  );
}
