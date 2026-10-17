import { StudentShell, TeacherShell } from '../components/layout/AppShell';
import { useAuth } from '../contexts/AuthContext';

interface Props { title: string; }

export default function ComingSoon({ title }: Props) {
  const { user } = useAuth();

  const content = (
    <>
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-20) var(--space-8)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            background: 'var(--color-primary-light)',
            borderRadius: 'var(--radius-xl)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-4)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h2
          style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 600,
            marginBottom: 'var(--space-2)',
            color: 'var(--color-text-primary)',
          }}
        >
          Coming in Phase {getPhase(title)}
        </h2>
        <p
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-sm)',
            maxWidth: 340,
            lineHeight: 'var(--leading-relaxed)',
          }}
        >
          This feature is being implemented as part of the CODEARENA development roadmap.
        </p>
      </div>
    </>
  );

  if (user?.role === 'teacher' || user?.role === 'admin') {
    return <TeacherShell>{content}</TeacherShell>;
  }
  return <StudentShell>{content}</StudentShell>;
}

function getPhase(title: string): string {
  const map: Record<string, string> = {
    Assessments: '2',
    'New Assessment': '2',
    'Question Bank': '4',
    'Problem Authoring': '3',
    'Submissions & Review': '7',
    'Results & Analytics': '8',
    'Classes & Students': '1',
    Settings: '2',
    Submissions: '5',
    Results: '7',
    Profile: '1',
  };
  return map[title] ?? '2+';
}
