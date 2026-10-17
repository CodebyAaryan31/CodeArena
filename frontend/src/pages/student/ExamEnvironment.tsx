import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Editor from '@monaco-editor/react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Flag,
  ArrowLeft,
  ArrowRight,
  Send,
  Play,
  RotateCcw,
  Check,
  X,
  Code2,
  Terminal,
  Layers,
  Upload,
  Maximize2,
  Minimize2,
  History,
  ShieldAlert,
} from 'lucide-react';
import {
  getAttempt,
  saveAnswer,
  submitAttempt,
  recordIntegrityEvent,
  type AttemptDetail,
  type AttemptAnswer,
} from '../../api/attempts';
import {
  runSampleTests,
  submitCode,
  listSubmissions,
  type QuickRunResponse,
  type SubmissionDetail,
} from '../../api/submissions';

export default function ExamEnvironment() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersState, setAnswersState] = useState<Record<string, any>>({});
  const [flagsState, setFlagsState] = useState<Record<string, boolean>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving'>('saved');
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  // Coding workspace state for coding questions
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [codeAnswers, setCodeAnswers] = useState<Record<string, string>>({});
  const [quickRunResults, setQuickRunResults] = useState<Record<string, QuickRunResponse | null>>({});
  const [gradedSubmissions, setGradedSubmissions] = useState<Record<string, SubmissionDetail | null>>({});
  const [submissionsHistory, setSubmissionsHistory] = useState<Record<string, SubmissionDetail[]>>({});
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [activeOutputTab, setActiveOutputTab] = useState<'results' | 'submission' | 'history'>('results');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Examination integrity state
  const [warningCount, setWarningCount] = useState<number>(0);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const { data: attempt, isLoading, error } = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: () => getAttempt(attemptId!),
    refetchOnWindowFocus: false,
  });


  // Initialize state once attempt is loaded
  useEffect(() => {
    if (attempt) {
      setTimeRemaining(attempt.time_remaining_seconds);

      const initialAns: Record<string, any> = {};
      const initialFlags: Record<string, boolean> = {};
      const initialCode: Record<string, string> = {};

      attempt.answers?.forEach((ans) => {
        initialFlags[ans.assessment_question_id] = ans.is_flagged;
        if (ans.selected_option_ids) {
          initialAns[ans.assessment_question_id] = ans.selected_option_ids;
        } else if (ans.text_answer) {
          initialAns[ans.assessment_question_id] = ans.text_answer;
        }

        if (ans.code_answer) {
          initialCode[ans.assessment_question_id] = ans.code_answer;
        }
      });

      // Default starter codes for coding problems
      attempt.assessment?.questions?.forEach((aq) => {
        if (aq.problem && !initialCode[aq.id]) {
          const defaultStarter =
            aq.problem.starter_codes?.find((sc: any) => sc.language === 'python')?.code ||
            '# Write your solution here\n';
          initialCode[aq.id] = defaultStarter;
        }
      });

      setAnswersState(initialAns);
      setFlagsState(initialFlags);
      setCodeAnswers(initialCode);
    }
  }, [attempt]);

  // Server-authoritative countdown timer tick
  useEffect(() => {
    if (timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining]);

  // Autosave mutation
  const saveMutation = useMutation({
    mutationFn: (payload: any) => saveAnswer(attemptId!, payload),
    onMutate: () => setAutosaveStatus('saving'),
    onSuccess: () => setAutosaveStatus('saved'),
  });

  const submitMutation = useMutation({
    mutationFn: () => submitAttempt(attemptId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attempt', attemptId] });
      navigate('/student/results');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to submit exam');
    },
  });

  const handleFinalSubmit = () => {
    submitMutation.mutate();
  };

  const handleSelectOption = (aqId: string, optionId: string, isMulti: boolean) => {
    let newVal: string;
    if (isMulti) {
      let currentArr: string[] = [];
      try {
        currentArr = JSON.parse(answersState[aqId] || '[]');
      } catch {
        currentArr = [];
      }
      if (currentArr.includes(optionId)) {
        currentArr = currentArr.filter((id) => id !== optionId);
      } else {
        currentArr.push(optionId);
      }
      newVal = JSON.stringify(currentArr);
    } else {
      newVal = optionId;
    }

    setAnswersState((prev) => ({ ...prev, [aqId]: newVal }));
    saveMutation.mutate({
      assessment_question_id: aqId,
      selected_option_ids: newVal,
      is_flagged: flagsState[aqId] || false,
    });
  };

  const handleTextAnswer = (aqId: string, text: string) => {
    setAnswersState((prev) => ({ ...prev, [aqId]: text }));
    saveMutation.mutate({
      assessment_question_id: aqId,
      text_answer: text,
      is_flagged: flagsState[aqId] || false,
    });
  };

  const handleCodeChange = (aqId: string, code: string | undefined) => {
    if (!code) return;
    setCodeAnswers((prev) => ({ ...prev, [aqId]: code }));
    saveMutation.mutate({
      assessment_question_id: aqId,
      code_answer: code,
      language: selectedLanguage,
      is_flagged: flagsState[aqId] || false,
    });
  };

  const toggleFlag = (aqId: string) => {
    const newVal = !flagsState[aqId];
    setFlagsState((prev) => ({ ...prev, [aqId]: newVal }));
    saveMutation.mutate({
      assessment_question_id: aqId,
      is_flagged: newVal,
    });
  };

  // Run Sample Tests for Coding Problem
  const handleRunSampleTests = async (aqId: string, problemId: string) => {
    const code = codeAnswers[aqId] || '';
    setIsRunningTests(true);
    setActiveOutputTab('results');
    try {
      const res = await runSampleTests({
        problem_id: problemId,
        language: selectedLanguage,
        source_code: code,
      });
      setQuickRunResults((prev) => ({ ...prev, [aqId]: res }));
    } catch (err: any) {
      alert('Runner error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsRunningTests(false);
    }
  };

  // Submit Code for Complete Evaluation (Public + Hidden Tests)
  const handleSubmitGradedCode = async (aqId: string, problemId: string) => {
    const code = codeAnswers[aqId] || '';
    if (!code.trim()) {
      alert('Cannot submit empty solution.');
      return;
    }
    setIsSubmittingCode(true);
    setActiveOutputTab('submission');
    try {
      const res = await submitCode({
        problem_id: problemId,
        language: selectedLanguage,
        source_code: code,
        attempt_id: attemptId,
      });
      setGradedSubmissions((prev) => ({ ...prev, [aqId]: res }));
      // Also update local answer score & refetch attempt
      queryClient.invalidateQueries({ queryKey: ['attempt', attemptId] });
      await fetchSubmissionsHistory(problemId);
    } catch (err: any) {
      alert('Evaluation error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsSubmittingCode(false);
    }
  };

  // Fetch Submissions History for this question
  const fetchSubmissionsHistory = async (problemId: string) => {
    try {
      const subs = await listSubmissions({ attempt_id: attemptId, problem_id: problemId });
      setSubmissionsHistory((prev) => ({ ...prev, [problemId]: subs }));
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    }
  };

  // Source Code File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, aqId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.py', '.cpp', '.c', '.js', '.ts', '.java'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) {
      alert(`Invalid file extension "${ext}". Allowed: ${validExtensions.join(', ')}`);
      return;
    }

    if (file.size > 500 * 1024) {
      alert('File exceeds maximum size limit of 500KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const source = event.target?.result as string;
      if (typeof source === 'string') {
        if (ext === '.py') setSelectedLanguage('python');
        else if (ext === '.cpp' || ext === '.c') setSelectedLanguage('cpp');
        else if (ext === '.js' || ext === '.ts') setSelectedLanguage('javascript');

        handleCodeChange(aqId, source);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Browser Integrity Event Handlers
  const handleIntegritySignal = async (eventType: string, details?: string) => {
    if (!attemptId || attempt?.status !== 'in_progress') return;
    try {
      await recordIntegrityEvent(attemptId, {
        event_type: eventType,
        details: details || `Integrity signal logged at ${new Date().toISOString()}`,
      });
      setWarningCount((c) => {
        const next = c + 1;
        setWarningMessage(
          `Integrity Signal Recorded: ${eventType.replace('_', ' ')}. Please stay focused on the exam window.`
        );
        return next;
      });
    } catch (err) {
      console.error('Failed to log integrity event:', err);
    }
  };

  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress') return;

    const onVisibilityChange = () => {
      if (document.hidden) {
        handleIntegritySignal('visibility_hidden', 'Tab switched or window minimized');
      }
    };

    const onBlur = () => {
      handleIntegritySignal('window_blur', 'Exam window lost focus');
    };

    const onFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isFull);
      if (!isFull) {
        handleIntegritySignal('fullscreen_exit', 'Student exited fullscreen mode');
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [attemptId, attempt?.status]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };


  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-secondary">Loading examination environment...</p>
      </div>
    );
  }

  if (!attempt || !attempt.assessment) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-secondary">Assessment not found or closed.</p>
      </div>
    );
  }

  const questionsList = attempt.assessment.questions || [];
  const currentSlot = questionsList[currentIndex];
  const currentAqId = currentSlot?.id;
  const isCodingQuestion = Boolean(currentSlot?.problem);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemaining < 300; // < 5 minutes

  const answeredCount = questionsList.filter((q) => {
    if (q.problem) return Boolean(codeAnswers[q.id]);
    return Boolean(answersState[q.id]);
  }).length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      {/* Top Distraction-Free Exam Header */}
      <header
        style={{
          height: 60,
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--space-6)',
          zIndex: 100,
        }}
      >
        <div>
          <span style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-md)' }}>
            {attempt.assessment.title}
          </span>
          <span className="text-secondary" style={{ marginLeft: 12, fontSize: 'var(--text-xs)' }}>
            Question {currentIndex + 1} of {questionsList.length}
          </span>
        </div>

        {/* Center: Server-Authoritative Timer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            background: isLowTime ? 'var(--color-danger-light)' : 'var(--color-gray-100)',
            color: isLowTime ? 'var(--color-danger)' : 'var(--color-text-primary)',
            fontWeight: 'var(--weight-bold)',
            fontSize: 'var(--text-md)',
          }}
        >
          <Clock size={16} />
          <span>{formatTimer(timeRemaining)}</span>
        </div>

        {/* Right: Fullscreen, Autosave status & Submit button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span style={{ fontSize: 'var(--text-xs)' }}>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>

          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <CheckCircle2 size={12} style={{ color: 'var(--color-success)' }} />
            {autosaveStatus === 'saving' ? 'Saving...' : 'Autosaved'}
          </span>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => setConfirmSubmitOpen(true)}
          >
            <Send size={14} /> Submit Exam
          </button>
        </div>
      </header>

      {/* Examination Integrity Alert Notice */}
      {warningMessage && (
        <div
          style={{
            background: 'var(--color-warning-subtle, #fefce8)',
            borderBottom: '1px solid var(--color-warning, #f59e0b)',
            padding: '8px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 'var(--text-xs)',
            color: '#92400e',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={14} />
            <span>
              <strong>Integrity Signal:</strong> {warningMessage} (Signals recorded: {warningCount}).
              All navigation events are logged for instructor review.
            </span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ padding: '2px 8px', height: 'auto', fontSize: 11 }}
            onClick={() => setWarningMessage(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Exam Workspace */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar: Question Navigation Grid */}
        <aside
          style={{
            width: 260,
            background: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
            Questions Overview ({answeredCount}/{questionsList.length})
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 'var(--space-6)' }}>
            {questionsList.map((q, idx) => {
              const isAnswered = q.problem ? Boolean(codeAnswers[q.id]) : Boolean(answersState[q.id]);
              const isFlagged = flagsState[q.id];
              const isCurrent = idx === currentIndex;

              let bg = 'var(--color-gray-100)';
              let color = 'var(--color-text-primary)';
              let borderColor = 'transparent';

              if (isAnswered) {
                bg = 'var(--color-success-light)';
                color = 'var(--color-success)';
              }
              if (isFlagged) {
                bg = 'var(--color-warning-light)';
                color = 'var(--color-warning)';
              }
              if (isCurrent) {
                borderColor = 'var(--color-primary)';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    height: 38,
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${borderColor}`,
                    background: bg,
                    color,
                    fontWeight: isCurrent ? 'bold' : 'normal',
                    fontSize: 'var(--text-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  {idx + 1}
                  {isFlagged && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--color-warning)',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 'auto', fontSize: 'var(--text-xs)', display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--color-text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-success)' }} /> Answered
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-warning)' }} /> Flagged for Review
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-gray-300)' }} /> Unanswered
            </span>
          </div>
        </aside>

        {/* Center / Right Content Area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: 'var(--space-6)' }}>
          {currentSlot && (
            <div style={{ maxWidth: isCodingQuestion ? '100%' : 840, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Question Top Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-primary">
                    Question {currentIndex + 1}
                  </span>
                  <span className="badge badge-secondary">
                    {currentSlot.points} Points
                  </span>
                  <span className="badge badge-secondary">
                    {isCodingQuestion ? 'Coding Challenge' : currentSlot.question?.type?.replace('_', ' ')}
                  </span>
                </div>

                <button
                  className={`btn btn-sm ${flagsState[currentAqId] ? 'btn-secondary' : 'btn-ghost'}`}
                  onClick={() => toggleFlag(currentAqId)}
                  style={{ color: flagsState[currentAqId] ? 'var(--color-warning)' : 'inherit' }}
                >
                  <Flag size={14} />
                  {flagsState[currentAqId] ? 'Flagged' : 'Flag for Review'}
                </button>
              </div>

              {/* CODING PROBLEM WORKSPACE */}
              {isCodingQuestion ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 'var(--space-4)', flex: 1, minHeight: 560 }}>
                  {/* Left: Problem statement & constraints */}
                  <div className="card" style={{ padding: 'var(--space-5)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-3)' }}>
                      {currentSlot.problem?.title}
                    </h2>
                    <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--color-text-secondary)', flex: 1 }}>
                      {currentSlot.problem?.description}
                    </div>

                    {/* Sample test cases displayed */}
                    <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', textTransform: 'uppercase' }}>
                        Sample Test Cases
                      </span>
                      {currentSlot.problem?.test_cases
                        ?.filter((tc: any) => !tc.is_hidden)
                        .map((tc: any, i: number) => (
                          <div key={i} style={{ marginTop: 8, padding: 8, background: 'var(--color-gray-50)', borderRadius: 6, fontSize: 12 }}>
                            <div><strong>Input:</strong> <code>{tc.input_data}</code></div>
                            <div><strong>Expected Output:</strong> <code>{tc.expected_output}</code></div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Right: Monaco Editor + Test Results Panel */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {/* Editor Toolbar */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--color-surface)',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <select
                          className="input"
                          value={selectedLanguage}
                          onChange={(e) => setSelectedLanguage(e.target.value)}
                          style={{ height: 30, fontSize: 12 }}
                        >
                          <option value="python">Python 3</option>
                          <option value="cpp">C++ 17</option>
                          <option value="javascript">JavaScript</option>
                        </select>

                        <input
                          type="file"
                          ref={fileInputRef}
                          style={{ display: 'none' }}
                          accept=".py,.cpp,.c,.js,.ts,.java"
                          onChange={(e) => handleFileUpload(e, currentAqId)}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => fileInputRef.current?.click()}
                          title="Upload source file (.py, .cpp, .js, max 500KB)"
                        >
                          <Upload size={12} /> Upload File
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={isRunningTests || isSubmittingCode}
                          onClick={() => handleRunSampleTests(currentAqId, currentSlot.problem!.id)}
                        >
                          <Play size={12} />
                          {isRunningTests ? 'Running...' : 'Run Sample Tests'}
                        </button>

                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={isRunningTests || isSubmittingCode}
                          onClick={() => handleSubmitGradedCode(currentAqId, currentSlot.problem!.id)}
                        >
                          <Send size={12} />
                          {isSubmittingCode ? 'Evaluating...' : 'Submit Code'}
                        </button>
                      </div>
                    </div>

                    {/* Monaco Editor Container */}
                    <div style={{ flex: 1, minHeight: 340, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                      <Editor
                        height="340px"
                        language={selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage === 'javascript' ? 'javascript' : 'python'}
                        value={codeAnswers[currentAqId] || ''}
                        onChange={(val) => handleCodeChange(currentAqId, val)}
                        theme="vs-light"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                        }}
                      />
                    </div>

                    {/* Test Results Output Panel with Tabs */}
                    <div className="card" style={{ padding: 'var(--space-4)', minHeight: 180, background: 'var(--color-surface)' }}>
                      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--color-border)', paddingBottom: 6, marginBottom: 8 }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${activeOutputTab === 'results' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setActiveOutputTab('results')}
                        >
                          <Play size={12} /> Sample Tests
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${activeOutputTab === 'submission' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setActiveOutputTab('submission')}
                        >
                          <CheckCircle2 size={12} /> Latest Evaluation
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${activeOutputTab === 'history' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => {
                            setActiveOutputTab('history');
                            if (currentSlot.problem) fetchSubmissionsHistory(currentSlot.problem.id);
                          }}
                        >
                          <History size={12} /> Previous Submissions
                        </button>
                      </div>

                      {/* Tab 1: Sample Tests Output */}
                      {activeOutputTab === 'results' && (
                        <div>
                          {quickRunResults[currentAqId] ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span
                                  className={`badge ${
                                    quickRunResults[currentAqId]!.overall_verdict === 'accepted'
                                      ? 'badge-success'
                                      : 'badge-error'
                                  }`}
                                >
                                  Verdict: {quickRunResults[currentAqId]!.overall_verdict.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {quickRunResults[currentAqId]!.results?.map((res, rIdx) => (
                                  <div
                                    key={rIdx}
                                    style={{
                                      padding: 8,
                                      borderRadius: 6,
                                      background: res.passed ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                                      fontSize: 12,
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                    }}
                                  >
                                    <div>
                                      <span>Test #{rIdx + 1}: <strong>{res.passed ? 'PASSED' : 'FAILED'}</strong> ({res.verdict})</span>
                                      {res.actual_output && (
                                        <div style={{ marginTop: 4, fontFamily: 'monospace' }}>
                                          Output: {res.actual_output.trim()}
                                        </div>
                                      )}
                                      {res.stderr && (
                                        <div style={{ marginTop: 4, color: 'var(--color-danger)', fontFamily: 'monospace' }}>
                                          Stderr: {res.stderr}
                                        </div>
                                      )}
                                    </div>
                                    <span style={{ color: 'var(--color-text-muted)' }}>{res.execution_time_ms}ms</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginTop: 8 }}>
                              Click "Run Sample Tests" to test against public test cases before submitting.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Tab 2: Graded Submission Output */}
                      {activeOutputTab === 'submission' && (
                        <div>
                          {gradedSubmissions[currentAqId] ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span
                                    className={`badge ${
                                      gradedSubmissions[currentAqId]!.verdict === 'accepted'
                                        ? 'badge-success'
                                        : 'badge-error'
                                    }`}
                                  >
                                    Verdict: {gradedSubmissions[currentAqId]!.verdict?.replace('_', ' ').toUpperCase()}
                                  </span>
                                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>
                                    Score: {Math.round(gradedSubmissions[currentAqId]!.score || 0)}%
                                  </span>
                                </div>
                                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                  Total time: {gradedSubmissions[currentAqId]!.execution_time_ms}ms
                                </span>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {gradedSubmissions[currentAqId]!.test_results?.map((tr, tIdx) => (
                                  <div
                                    key={tIdx}
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
                                    <div>
                                      <span>
                                        Test #{tIdx + 1} {tr.is_hidden ? '(Hidden)' : '(Public)'}:{' '}
                                        <strong>{tr.passed ? 'PASSED' : 'FAILED'}</strong> ({tr.verdict})
                                      </span>
                                      {tr.actual_output && !tr.is_hidden && (
                                        <div style={{ marginTop: 2, fontFamily: 'monospace', fontSize: 11 }}>
                                          Output: {tr.actual_output.trim()}
                                        </div>
                                      )}
                                      {tr.error_message && !tr.is_hidden && (
                                        <div style={{ marginTop: 2, color: 'var(--color-danger)', fontFamily: 'monospace', fontSize: 11 }}>
                                          Error: {tr.error_message}
                                        </div>
                                      )}
                                    </div>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                                      {tr.execution_time_ms}ms
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginTop: 8 }}>
                              No submission evaluated yet. Click "Submit Code" to run against all test cases and record your score.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Tab 3: Previous Submissions History */}
                      {activeOutputTab === 'history' && (
                        <div>
                          {currentSlot.problem && submissionsHistory[currentSlot.problem.id]?.length ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {submissionsHistory[currentSlot.problem.id].map((sub, sIdx) => (
                                <div
                                  key={sub.id || sIdx}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '6px 10px',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 6,
                                    fontSize: 12,
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span
                                      className={`badge ${
                                        sub.verdict === 'accepted' ? 'badge-success' : 'badge-error'
                                      }`}
                                      style={{ fontSize: 10 }}
                                    >
                                      {sub.verdict || 'evaluated'}
                                    </span>
                                    <span>
                                      <strong>{sub.language}</strong> · Score: {Math.round(sub.score || 0)}%
                                    </span>
                                  </div>
                                  <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                                    {new Date(sub.created_at).toLocaleTimeString()} ({sub.execution_time_ms}ms)
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginTop: 8 }}>
                              No previous attempts recorded for this question yet.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* OBJECTIVE QUESTION CARD (MCQ, Output Prediction, Debugging) */
                <div className="card" style={{ padding: 'var(--space-6)' }}>
                  <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-3)' }}>
                    {currentSlot.question?.title}
                  </h2>
                  <p style={{ fontSize: 'var(--text-md)', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
                    {currentSlot.question?.prompt}
                  </p>

                  {/* Code snippet if present */}
                  {currentSlot.question?.code_snippet && (
                    <pre
                      style={{
                        background: 'var(--color-gray-900)',
                        color: '#f8fafc',
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-xs)',
                        overflowX: 'auto',
                        marginBottom: 'var(--space-5)',
                      }}
                    >
                      <code>{currentSlot.question.code_snippet}</code>
                    </pre>
                  )}

                  {/* Multiple Choice Options */}
                  {['single_mcq', 'multi_mcq', 'debugging'].includes(currentSlot.question?.type) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      {currentSlot.question.options?.map((opt: any) => {
                        const isMulti = currentSlot.question.type === 'multi_mcq';
                        let isSelected = false;
                        if (isMulti) {
                          try {
                            const arr = JSON.parse(answersState[currentAqId] || '[]');
                            isSelected = arr.includes(opt.id);
                          } catch {
                            isSelected = false;
                          }
                        } else {
                          isSelected = answersState[currentAqId] === opt.id;
                        }

                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleSelectOption(currentAqId, opt.id, isMulti)}
                            style={{
                              padding: 'var(--space-4)',
                              borderRadius: 'var(--radius-md)',
                              border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                              background: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-3)',
                              transition: 'border-color var(--duration-fast)',
                            }}
                          >
                            <input
                              type={isMulti ? 'checkbox' : 'radio'}
                              name={`question-${currentAqId}`}
                              checked={isSelected}
                              onChange={() => {}}
                            />
                            <span style={{ fontSize: 'var(--text-sm)', fontWeight: isSelected ? 600 : 400 }}>
                              {opt.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Text / Output Prediction answer box */}
                  {['output_prediction', 'short_answer'].includes(currentSlot.question?.type) && (
                    <div style={{ marginTop: 'var(--space-4)' }}>
                      <label className="label" style={{ fontWeight: 'var(--weight-medium)', marginBottom: 4 }}>
                        Your Output / Answer:
                      </label>
                      <input
                        type="text"
                        className="input font-mono"
                        placeholder="Type exact output..."
                        value={answersState[currentAqId] || ''}
                        onChange={(e) => handleTextAnswer(currentAqId, e.target.value)}
                        style={{ width: '100%', fontSize: 'var(--text-md)' }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Nav: Previous / Next buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-6)' }}>
                <button
                  className="btn btn-secondary"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                >
                  <ArrowLeft size={16} /> Previous Question
                </button>

                {currentIndex < questionsList.length - 1 ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => setCurrentIndex((prev) => Math.min(questionsList.length - 1, prev + 1))}
                  >
                    Next Question <ArrowRight size={16} />
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => setConfirmSubmitOpen(true)}>
                    <Send size={16} /> Review & Submit
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Confirmation Modal Before Submission */}
      {confirmSubmitOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(2px)',
          }}
        >
          <div className="card" style={{ width: 440, padding: 'var(--space-6)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)' }}>
              Submit Assessment?
            </h3>
            <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
              You have answered <strong>{answeredCount}</strong> out of <strong>{questionsList.length}</strong> questions.
              {answeredCount < questionsList.length && (
                <span style={{ color: 'var(--color-warning)', display: 'block', marginTop: 4 }}>
                  ⚠️ You still have {questionsList.length - answeredCount} unanswered questions!
                </span>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmSubmitOpen(false)}>
                Continue Exam
              </button>
              <button
                className="btn btn-primary"
                disabled={submitMutation.isPending}
                onClick={handleFinalSubmit}
              >
                {submitMutation.isPending ? 'Submitting...' : 'Yes, Submit Final Answers'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
