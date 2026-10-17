import { useState } from 'react';
import { TeacherShell } from '../../components/layout/AppShell';
import { Users, Plus, Mail, BookOpen, GraduationCap } from 'lucide-react';

export default function TeacherClasses() {
  const [classes, setClasses] = useState([
    {
      id: '1',
      name: 'CS 101: Introduction to Computer Science',
      code: 'CS101-F26',
      students_count: 42,
      active_assessments: 2,
    },
    {
      id: '2',
      name: 'CS 201: Data Structures & Algorithms',
      code: 'DSA201-F26',
      students_count: 38,
      active_assessments: 1,
    },
    {
      id: '3',
      name: 'CS 301: Systems Programming',
      code: 'SYS301-F26',
      students_count: 29,
      active_assessments: 0,
    },
  ]);

  return (
    <TeacherShell>
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)' }}>
              Classes & Students
            </h1>
            <p className="text-secondary" style={{ marginTop: 'var(--space-1)' }}>
              Manage class sections, enrollment invite codes, and student cohorts.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              const name = prompt('Enter new class name:');
              if (name) {
                setClasses((prev) => [
                  ...prev,
                  {
                    id: String(Date.now()),
                    name,
                    code: name.slice(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900),
                    students_count: 0,
                    active_assessments: 0,
                  },
                ]);
              }
            }}
          >
            <Plus size={16} />
            Create Class
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
        {classes.map((cls) => (
          <div key={cls.id} className="card" style={{ padding: 'var(--space-5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BookOpen size={20} />
              </div>
              <span className="badge badge-secondary" style={{ fontSize: 11 }}>
                Code: <strong>{cls.code}</strong>
              </span>
            </div>

            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-2)' }}>
              {cls.name}
            </h3>

            <div
              style={{
                display: 'flex',
                gap: 'var(--space-4)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)',
                marginTop: 'var(--space-4)',
                paddingTop: 'var(--space-3)',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Users size={14} /> {cls.students_count} Students
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <GraduationCap size={14} /> {cls.active_assessments} Active Exams
              </span>
            </div>
          </div>
        ))}
      </div>
    </TeacherShell>
  );
}
