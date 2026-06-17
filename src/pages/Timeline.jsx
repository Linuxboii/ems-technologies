import { Calendar, CheckCircle, Circle } from 'lucide-react';

const phases = [
  {
    phase: 'Sprint 1', title: 'Foundation',
    dateRange: 'Jan 15 — Jan 28', status: 'completed',
    items: [
      { label: 'Project kickoff & onboarding', done: true },
      { label: 'Requirements finalization', done: true },
      { label: 'UI/UX wireframes (v1)', done: true },
      { label: 'Design system setup', done: true },
      { label: 'Core architecture setup', done: true },
    ],
  },
  {
    phase: 'Sprint 2', title: 'Core Build',
    dateRange: 'Jan 29 — Feb 11', status: 'active',
    items: [
      { label: 'Frontend: main pages', done: true },
      { label: 'Backend: API endpoints', done: true },
      { label: 'Database schema & migrations', done: false },
      { label: 'Authentication system', done: false },
      { label: 'Integration testing', done: false },
    ],
    progress: 60,
  },
  {
    phase: 'Sprint 3', title: 'Feature Complete',
    dateRange: 'Feb 12 — Feb 25', status: 'upcoming',
    items: [
      { label: 'Admin dashboard', done: false },
      { label: 'Search & filtering', done: false },
      { label: 'Notifications system', done: false },
      { label: 'Performance optimization', done: false },
      { label: 'Security audit', done: false },
    ],
  },
  {
    phase: 'Sprint 4', title: 'Polish & Launch',
    dateRange: 'Feb 26 — Mar 10', status: 'upcoming',
    items: [
      { label: 'Client review & revisions', done: false },
      { label: 'QA & bug fixes', done: false },
      { label: 'Staging deployment', done: false },
      { label: 'Production launch', done: false },
      { label: 'Handover & documentation', done: false },
    ],
  },
];

const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'];

export default function TimelinePage() {
  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="page-container" style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div className="section-label">Project Timeline</div>
          <h2 className="section-title" style={{ marginBottom: 12 }}>
            Your 8-Week Roadmap
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            A sprint-by-sprint breakdown of our journey. Each phase builds on the last, with milestones clearly mapped.
          </p>
        </div>

        {/* Week bar */}
        <div style={{ marginBottom: 48 }}>
          <div className="card" style={{ padding: '24px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
              {weeks.map((week, i) => {
                const isPast = i < 3;
                const isCurrent = i === 3;
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1, position: 'relative' }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: isPast ? 'var(--color-success)' : isCurrent ? 'var(--color-text)' : 'var(--color-border)',
                      position: 'relative', zIndex: 2,
                    }} />
                    <span style={{
                      fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                      color: isPast ? 'var(--color-success)' : isCurrent ? 'var(--color-text)' : 'var(--color-text-muted)',
                    }}>
                      {week}
                    </span>
                  </div>
                );
              })}
              {/* Connecting line */}
              <div style={{
                position: 'absolute', top: 6, left: '7%', right: '7%', height: 1.5,
                background: 'var(--color-border)', zIndex: 0,
              }}>
                <div style={{
                  width: '45%', height: '100%',
                  background: 'var(--color-accent)',
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Sprint cards */}
        <div className="stagger" style={{ display: 'grid', gap: 16 }}>
          {phases.map((sprint, idx) => (
            <div key={idx} className="card" style={{
              background: sprint.status === 'active' ? 'var(--color-surface)' : 'var(--color-bg)',
              borderColor: sprint.status === 'active' ? 'var(--color-text)' : sprint.status === 'completed' ? 'var(--color-success-bg)' : 'var(--color-border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                      color: sprint.status === 'completed' ? 'var(--color-success)' : sprint.status === 'active' ? 'var(--color-text)' : 'var(--color-text-muted)',
                    }}>
                      {sprint.phase}
                    </span>
                    <span className={`badge ${sprint.status === 'completed' ? 'badge-success' : sprint.status === 'active' ? 'badge-info' : 'badge-muted'}`}>
                      {sprint.status === 'completed' ? 'Done' : sprint.status === 'active' ? 'In Progress' : 'Upcoming'}
                    </span>
                  </div>
                  <h3 style={{
                    fontSize: 18, fontWeight: 800,
                    color: sprint.status === 'upcoming' ? 'var(--color-text-muted)' : 'var(--color-text)',
                  }}>
                    {sprint.title}
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                  <Calendar size={14} />
                  <span>{sprint.dateRange}</span>
                </div>
              </div>

              {sprint.progress !== undefined && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    <span>Sprint Progress</span>
                    <span>{sprint.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${sprint.progress}%` }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gap: 8 }}>
                {sprint.items.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                    color: item.done ? 'var(--color-text-secondary)' : sprint.status === 'upcoming' ? 'var(--color-text-muted)' : 'var(--color-text)',
                    fontSize: 14,
                  }}>
                    {item.done
                      ? <CheckCircle size={16} color="var(--color-success)" style={{ flexShrink: 0 }} />
                      : <Circle size={16} color="var(--color-border)" style={{ flexShrink: 0 }} />
                    }
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
