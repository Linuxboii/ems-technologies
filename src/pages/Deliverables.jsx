import { FileText, Smartphone, Globe, Palette, Settings, BookOpen, CheckCircle, Clock } from 'lucide-react';

const deliverables = [
  {
    icon: <Globe size={22} />,
    title: 'Responsive Website',
    description: 'Fully responsive, cross-browser compatible web application.',
    status: 'completed',
    date: 'Jan 20, 2026',
    files: 24,
  },
  {
    icon: <Palette size={22} />,
    title: 'Design System & UI Kit',
    description: 'Complete component library with typography, colors, icons.',
    status: 'completed',
    date: 'Jan 22, 2026',
    files: 8,
  },
  {
    icon: <Settings size={22} />,
    title: 'Admin Dashboard',
    description: 'Full-featured admin panel with analytics and user management.',
    status: 'in-progress',
    date: 'Feb 15, 2026',
    files: 16,
    progress: 65,
  },
  {
    icon: <FileText size={22} />,
    title: 'Technical Documentation',
    description: 'Comprehensive docs covering architecture, API, deployment.',
    status: 'in-progress',
    date: 'Feb 20, 2026',
    files: 5,
    progress: 30,
  },
  {
    icon: <Smartphone size={22} />,
    title: 'Mobile App (iOS & Android)',
    description: 'Cross-platform with push notifications and offline support.',
    status: 'upcoming',
    date: 'Mar 10, 2026',
    files: 12,
  },
  {
    icon: <BookOpen size={22} />,
    title: 'User Guide & Manual',
    description: 'End-user documentation with screenshots and video tutorials.',
    status: 'upcoming',
    date: 'Mar 20, 2026',
    files: 3,
  },
];

const statDefs = {
  completed:   { dot: 'var(--color-success)', label: 'Delivered', bar: 'var(--color-success)' },
  'in-progress': { dot: 'var(--color-text)', label: 'In Progress', bar: 'var(--color-accent)' },
  upcoming:    { dot: 'var(--color-text-muted)', label: 'Upcoming', bar: 'var(--color-border)' },
};

export default function DeliverablesPage() {
  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div className="section-label">Deliverables</div>
          <h2 className="section-title" style={{ marginBottom: 12 }}>
            Everything You'll Receive
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            A complete catalog of every asset, codebase, and document we deliver. Track progress in real-time.
          </p>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 40 }}>
          {[
            { label: 'Total Items', value: '12', color: 'var(--color-text)' },
            { label: 'Delivered', value: '2', color: 'var(--color-success)' },
            { label: 'In Progress', value: '2', color: 'var(--color-warning)' },
            { label: 'Upcoming', value: '2', color: 'var(--color-text-muted)' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 16 }}>
          {deliverables.map((item, idx) => (
            <div key={idx} className="card" style={{
              position: 'relative',
              borderColor: item.status === 'upcoming' ? 'var(--color-border)' : 'var(--color-border)',
              opacity: item.status === 'upcoming' ? 0.6 : 1,
            }}>
              {/* Status dot */}
              <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: statDefs[item.status].dot, display: 'inline-block',
                }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: statDefs[item.status].dot }}>
                  {statDefs[item.status].label}
                </span>
              </div>

              {/* Icon */}
              <div style={{
                width: 48, height: 48, borderRadius: 8,
                background: item.status === 'completed' ? 'var(--color-success-bg)' : item.status === 'in-progress' ? 'var(--color-surface)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: item.status === 'completed' ? 'var(--color-success)' : item.status === 'in-progress' ? 'var(--color-text)' : 'var(--color-text-muted)',
                marginBottom: 16,
              }}>
                {item.icon}
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>
                {item.title}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                {item.description}
              </p>

              {item.status === 'in-progress' && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                    <span>Progress</span>
                    <span>{item.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
              )}

              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingTop: 14, borderTop: '1px solid var(--color-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {item.status === 'completed' ? <CheckCircle size={14} color="var(--color-success)" /> : <Clock size={14} />}
                  <span>{item.status === 'completed' ? `Delivered ${item.date}` : `Due ${item.date}`}</span>
                </div>
                <span style={{ fontSize: 12, color: item.status === 'completed' ? 'var(--color-success)' : 'var(--color-text-muted)', fontWeight: 500 }}>
                  {item.status === 'completed' ? `${item.files} files` : item.status === 'in-progress' ? 'Preview' : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
