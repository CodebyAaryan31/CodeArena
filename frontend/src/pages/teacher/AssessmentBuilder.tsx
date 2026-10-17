import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Send,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Clock,
  Award,
  CheckCircle2,
  FileQuestion,
  Code2,
  Layers,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { TeacherShell } from '../../components/layout/AppShell';
import {
  getAssessment,
  createAssessment,
  updateAssessment,
  publishAssessment,
} from '../../api/assessments';
import { getQuestions, type Question } from '../../api/questions';
import { getCodingProblems, type CodingProblem } from '../../api/coding';

export default function AssessmentBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id && id !== 'new');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passPercentage, setPassPercentage] = useState(50.0);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [slots, setSlots] = useState<
    Array<{
      question_id?: string;
      problem_id?: string;
      points: number;
      itemData?: any;
    }>
  >([]);

  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [selectTab, setSelectTab] = useState<'questions' | 'problems'>('questions');
  const [previewOpen, setPreviewOpen] = useState(false);

  // Load existing assessment if editing
  const { data: existingAssessment, isLoading: isAssessmentLoading } = useQuery({
    queryKey: ['assessment', id],
    queryFn: () => getAssessment(id!),
    enabled: isEditing,
  });

  // Load questions and coding problems for selector
  const { data: bankQuestions = [] } = useQuery({
    queryKey: ['bank-questions'],
    queryFn: () => getQuestions(),
  });

  const { data: bankProblems = [] } = useQuery({
    queryKey: ['bank-problems'],
    queryFn: () => getCodingProblems(),
  });

  useEffect(() => {
    if (existingAssessment) {
      setTitle(existingAssessment.title);
      setDescription(existingAssessment.description || '');
      setDurationMinutes(existingAssessment.duration_minutes);
      setPassPercentage(existingAssessment.pass_percentage);
      setMaxAttempts(existingAssessment.max_attempts);
      setShuffleQuestions(existingAssessment.shuffle_questions);
      if (existingAssessment.start_time) {
        setStartTime(new Date(existingAssessment.start_time).toISOString().slice(0, 16));
      }
      if (existingAssessment.end_time) {
        setEndTime(new Date(existingAssessment.end_time).toISOString().slice(0, 16));
      }
      if (existingAssessment.questions) {
        setSlots(
          existingAssessment.questions.map((q) => ({
            question_id: q.question_id,
            problem_id: q.problem_id,
            points: q.points,
            itemData: q.question || q.problem,
          }))
        );
      }
    }
  }, [existingAssessment]);

  const saveMutation = useMutation({
    mutationFn: async (publishAfter: boolean = false) => {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        duration_minutes: Number(durationMinutes),
        pass_percentage: Number(passPercentage),
        max_attempts: Number(maxAttempts),
        shuffle_questions: shuffleQuestions,
        start_time: startTime ? new Date(startTime).toISOString() : null,
        end_time: endTime ? new Date(endTime).toISOString() : null,
        questions: slots.map((s, idx) => ({
          question_id: s.question_id,
          problem_id: s.problem_id,
          points: Number(s.points) || 10,
          order_index: idx,
        })),
      };

      let savedId = id;
      if (isEditing) {
        await updateAssessment(id!, payload);
      } else {
        const created = await createAssessment(payload);
        savedId = created.id;
      }

      if (publishAfter && savedId) {
        await publishAssessment(savedId);
      }
      return savedId;
    },
    onSuccess: (savedId, publishAfter) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assessments'] });
      queryClient.invalidateQueries({ queryKey: ['assessment', savedId] });
      navigate('/teacher/assessments');
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ') : 'Failed to save or publish assessment');
      alert(`Validation Notice: ${message}`);
    },
  });

  const totalPoints = slots.reduce((acc, s) => acc + (Number(s.points) || 0), 0);

  const addSlot = (type: 'question' | 'problem', item: any) => {
    const isAlreadyAdded = slots.some(
      (s) => (type === 'question' && s.question_id === item.id) || (type === 'problem' && s.problem_id === item.id)
    );
    if (isAlreadyAdded) return;

    setSlots((prev) => [
      ...prev,
      {
        question_id: type === 'question' ? item.id : undefined,
        problem_id: type === 'problem' ? item.id : undefined,
        points: type === 'problem' ? 30 : 10,
        itemData: item,
      },
    ]);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, idx) => idx !== index));
  };

  const moveSlot = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= slots.length) return;
    setSlots((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const updateSlotPoints = (index: number, points: number) => {
    setSlots((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], points };
      return copy;
    });
  };

  return (
    <TeacherShell>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/teacher/assessments')}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)' }}>
              {isEditing ? 'Edit Assessment' : 'New Assessment'}
            </h1>
            <p className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
              Configure parameters, add questions from bank, and publish for students.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setPreviewOpen(true)}
            disabled={slots.length === 0}
          >
            <Eye size={16} />
            Preview
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => saveMutation.mutate(false)}
            disabled={saveMutation.isPending || !title.trim()}
          >
            <Save size={16} />
            Save Draft
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (slots.length === 0) {
                alert('Add at least one question before publishing.');
                return;
              }
              saveMutation.mutate(true);
            }}
            disabled={saveMutation.isPending || !title.trim() || slots.length === 0}
          >
            <Send size={16} />
            Publish Assessment
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-6)' }}>
        {/* Left Column: Title, Description & Questions List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* General Information Card */}
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-4)' }}>
              General Information
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>
                  Assessment Title *
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. CS101: Midterm Algorithms & Complexity"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: '100%', marginTop: 'var(--space-1)' }}
                />
              </div>

              <div>
                <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>
                  Instructions / Description
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Guidelines for students regarding time limits, allowed languages, calculator policies, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', marginTop: 'var(--space-1)', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* Assessment Questions Card */}
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)' }}>
                  Questions ({slots.length})
                </h2>
                <span className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
                  Total Points: <strong>{totalPoints} pts</strong>
                </span>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIsSelectModalOpen(true)}
              >
                <Plus size={14} />
                Add from Bank
              </button>
            </div>

            {slots.length === 0 ? (
              <div
                style={{
                  border: '2px dashed var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-8)',
                  textAlign: 'center',
                }}
              >
                <Layers size={36} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 'var(--weight-medium)', marginBottom: 4 }}>No questions attached yet</p>
                <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginBottom: 16 }}>
                  Select MCQs, output predictions, debugging items, or coding problems.
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsSelectModalOpen(true)}
                >
                  <Plus size={14} />
                  Browse Question Bank
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {slots.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3) var(--space-4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--color-surface)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: 'var(--color-gray-100)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 'var(--weight-bold)',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span className="badge badge-secondary" style={{ fontSize: 10 }}>
                            {s.problem_id ? 'Coding Problem' : (s.itemData?.type || 'Question')}
                          </span>
                          <span style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)' }}>
                            {s.itemData?.title || (s.problem_id ? 'Coding Problem' : 'Question')}
                          </span>
                        </div>
                        {s.itemData?.topic && (
                          <div className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                            Topic: {s.itemData.topic}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <input
                          type="number"
                          className="input"
                          min={1}
                          max={500}
                          value={s.points}
                          onChange={(e) => updateSlotPoints(idx, Number(e.target.value))}
                          style={{ width: 64, height: 30, textAlign: 'center', fontSize: 'var(--text-xs)' }}
                        />
                        <span className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>pts</span>
                      </div>

                      <div style={{ display: 'flex', gap: 2 }}>
                        <button
                          className="btn btn-secondary btn-icon btn-sm"
                          disabled={idx === 0}
                          onClick={() => moveSlot(idx, 'up')}
                          title="Move up"
                        >
                          <MoveUp size={12} />
                        </button>
                        <button
                          className="btn btn-secondary btn-icon btn-sm"
                          disabled={idx === slots.length - 1}
                          onClick={() => moveSlot(idx, 'down')}
                          title="Move down"
                        >
                          <MoveDown size={12} />
                        </button>
                        <button
                          className="btn btn-danger-outline btn-icon btn-sm"
                          onClick={() => removeSlot(idx)}
                          title="Remove question"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Exam Parameters & Policies */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-4)' }}>
              Configuration
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label className="label" style={{ fontWeight: 'var(--weight-medium)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} style={{ color: 'var(--color-primary)' }} />
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  className="input"
                  min={5}
                  max={600}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  style={{ width: '100%', marginTop: 'var(--space-1)' }}
                />
              </div>

              <div>
                <label className="label" style={{ fontWeight: 'var(--weight-medium)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Award size={14} style={{ color: 'var(--color-primary)' }} />
                  Passing Percentage (%)
                </label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  max={100}
                  value={passPercentage}
                  onChange={(e) => setPassPercentage(Number(e.target.value))}
                  style={{ width: '100%', marginTop: 'var(--space-1)' }}
                />
              </div>

              <div>
                <label className="label" style={{ fontWeight: 'var(--weight-medium)' }}>
                  Max Attempts per Student
                </label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  max={10}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  style={{ width: '100%', marginTop: 'var(--space-1)' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <input
                  type="checkbox"
                  id="shuffle"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                />
                <label htmlFor="shuffle" style={{ fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                  Shuffle questions per attempt
                </label>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-3)' }}>
                  Availability Schedule
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="label" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)' }}>
                      Start Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      style={{ width: '100%', fontSize: 'var(--text-xs)' }}
                    />
                    <span className="text-secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                      If set in the future, publication will schedule the exam.
                    </span>
                  </div>

                  <div>
                    <label className="label" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)' }}>
                      End Time / Deadline (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      style={{ width: '100%', fontSize: 'var(--text-xs)' }}
                    />
                    <span className="text-secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                      Submissions are rejected once this deadline passes.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Select From Question Bank Modal */}
      {isSelectModalOpen && (
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
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 'var(--space-6)',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>
                Select Questions from Bank
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsSelectModalOpen(false)}>
                Close
              </button>
            </div>

            {/* Selector Tabs */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <button
                className={`btn btn-sm ${selectTab === 'questions' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectTab('questions')}
              >
                <FileQuestion size={14} />
                Question Bank ({bankQuestions.length})
              </button>
              <button
                className={`btn btn-sm ${selectTab === 'problems' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectTab('problems')}
              >
                <Code2 size={14} />
                Coding Problems ({bankProblems.length})
              </button>
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {selectTab === 'questions' ? (
                bankQuestions.length === 0 ? (
                  <p className="text-secondary" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                    No questions in question bank. Go to Question Bank to create questions.
                  </p>
                ) : (
                  bankQuestions.map((q) => {
                    const isAdded = slots.some((s) => s.question_id === q.id);
                    return (
                      <div
                        key={q.id}
                        style={{
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: 'var(--space-3) var(--space-4)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: isAdded ? 'var(--color-gray-50)' : 'var(--color-surface)',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <span className="badge badge-secondary" style={{ fontSize: 10 }}>{q.type}</span>
                            <span style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)' }}>
                              {q.title}
                            </span>
                          </div>
                          <div className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                            {q.topic} · {q.difficulty}
                          </div>
                        </div>
                        <button
                          className={`btn btn-sm ${isAdded ? 'btn-secondary' : 'btn-primary'}`}
                          disabled={isAdded}
                          onClick={() => addSlot('question', q)}
                        >
                          {isAdded ? 'Added' : 'Add'}
                        </button>
                      </div>
                    );
                  })
                )
              ) : bankProblems.length === 0 ? (
                <p className="text-secondary" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  No coding problems authored yet.
                </p>
              ) : (
                bankProblems.map((p) => {
                  const isAdded = slots.some((s) => s.problem_id === p.id);
                  return (
                    <div
                      key={p.id}
                      style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-3) var(--space-4)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: isAdded ? 'var(--color-gray-50)' : 'var(--color-surface)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span className="badge badge-secondary" style={{ fontSize: 10 }}>Coding</span>
                          <span style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)' }}>
                            {p.title}
                          </span>
                        </div>
                        <div className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                          {p.topic} · {p.difficulty} · {p.test_cases?.length || 0} test cases
                        </div>
                      </div>
                      <button
                        className={`btn btn-sm ${isAdded ? 'btn-secondary' : 'btn-primary'}`}
                        disabled={isAdded}
                        onClick={() => addSlot('problem', p)}
                      >
                        {isAdded ? 'Added' : 'Add'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ marginTop: 'var(--space-4)', textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={() => setIsSelectModalOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewOpen && (
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
              maxWidth: 800,
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 'var(--space-6)',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>{title || 'Untitled Assessment'}</h3>
                <span className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
                  {durationMinutes} min · {totalPoints} pts · {slots.length} questions
                </span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setPreviewOpen(false)}>
                Close Preview
              </button>
            </div>

            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
              {description || 'No instructions provided.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {slots.map((s, idx) => (
                <div key={idx} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <span style={{ fontWeight: 'var(--weight-bold)' }}>
                      Question {idx + 1} ({s.points} pts)
                    </span>
                    <span className="badge badge-secondary" style={{ fontSize: 10 }}>
                      {s.problem_id ? 'Coding Problem' : s.itemData?.type}
                    </span>
                  </div>
                  <h4 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-2)' }}>
                    {s.itemData?.title}
                  </h4>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
                    {s.itemData?.prompt || s.itemData?.description?.slice(0, 200)}
                  </p>
                  {s.itemData?.options && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginLeft: 'var(--space-4)' }}>
                      {s.itemData.options.map((opt: any, oIdx: number) => (
                        <div key={oIdx} style={{ fontSize: 'var(--text-sm)' }}>
                          • {opt.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </TeacherShell>
  );
}
