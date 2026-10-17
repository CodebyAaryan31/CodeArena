import { useState } from 'react';
import { TeacherShell } from '../components/layout/AppShell';
import { Settings as SettingsIcon, Terminal, Sliders, ShieldCheck, Check } from 'lucide-react';

export default function Settings() {
  const [tabSize, setTabSize] = useState('4');
  const [autoRunSample, setAutoRunSample] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <TeacherShell>
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 className="page-title">Instructor Settings</h1>
          <p className="page-description">
            Configure system execution defaults, editor preferences, and runner options.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Runner Status Banner */}
        <div className="card" style={{ padding: 'var(--space-5)', borderLeft: '4px solid var(--color-success, #16A34A)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-success-light, #DCFCE7)',
                color: 'var(--color-success, #16A34A)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                Code Execution Runner Connected
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                Runner Microservice active at <code>http://127.0.0.1:8001</code> with isolated sandbox timeouts and memory limits.
              </div>
            </div>
          </div>
        </div>

        {/* Editor Defaults Form */}
        <form onSubmit={handleSave} className="card" style={{ padding: 'var(--space-6)' }}>
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sliders size={18} /> Editor & Execution Preferences
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label className="form-label">Editor Indentation (Tab Size)</label>
              <select
                className="form-input"
                value={tabSize}
                onChange={(e) => setTabSize(e.target.value)}
                style={{ maxWidth: 200 }}
              >
                <option value="2">2 Spaces</option>
                <option value="4">4 Spaces</option>
              </select>
              <p className="form-help">Default tab indentation applied to student code templates.</p>
            </div>

            <div>
              <label className="form-label">Default Execution Timeout</label>
              <input
                type="text"
                className="form-input"
                value="2000 ms (2.0s)"
                disabled
                style={{ maxWidth: 200, background: 'var(--color-bg-subtle, #F8FAFC)' }}
              />
              <p className="form-help">Configured per-problem in the Problem Authoring workspace.</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <input
                type="checkbox"
                id="autoRun"
                checked={autoRunSample}
                onChange={(e) => setAutoRunSample(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="autoRun" style={{ fontSize: 'var(--text-sm)', cursor: 'pointer', userSelect: 'none' }}>
                Require students to run public sample tests before final submission
              </label>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button type="submit" className="btn btn-primary">
              Save Preferences
            </button>
            {saved && (
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={16} /> Preferences updated successfully!
              </span>
            )}
          </div>
        </form>
      </div>
    </TeacherShell>
  );
}
