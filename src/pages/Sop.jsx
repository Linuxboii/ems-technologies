import { useState } from 'react';
import { ChevronDown, FileText, MessageSquare, Code, Eye, Rocket, CheckCircle } from 'lucide-react';

const steps = [
  {
    icon: <FileText size={20} />,
    title: '1. Discovery & Briefing',
    subtitle: 'We align on vision, scope, and goals',
    duration: 'Days 1-3',
    details: [
      'Kickoff call to understand your business objectives',
      'Define target audience and key messaging',
      'Scope finalization and resource allocation',
      'Document all requirements in the project brief',
    ],
    status: 'completed',
  },
  {
    icon: <MessageSquare size={20} />,
    title: '2. Strategy & Planning',
    subtitle: 'Roadmap creation and milestone planning',
    duration: 'Days 4-6',
    details: [
      'Information architecture and sitemap creation',
      'Content strategy and wireframing',
      'Tech stack finalization',
      'MVP scope definition',
    ],
    status: 'completed',
  },
  {
    icon: <Code size={20} />,
    title: '3. Design & Development',
    subtitle: 'Bringing the vision to life',
    duration: 'Days 7-28',
    details: [
      'UI/UX design with 2 revision rounds',
      'Frontend & backend development in parallel',
      'Weekly progress demos every Friday',
      'Internal QA and performance optimization',
    ],
    status: 'active',
  },
  {
    icon: <Eye size={20} />,
    title: '4. Review & Revisions',
    subtitle: 'Your feedback shapes the final product',
    duration: 'Days 29-35',
    details: [
      'Client review of the staging environment',
      '2 rounds of revision included',
      'Bug fixes and polish pass',
      'Content population and final checks',
    ],
    status: 'pending',
  },
  {
    icon: <Rocket size={20} />,
    title: '5. Launch & Handover',
    subtitle: 'Going live with full support',
    duration: 'Days 36-42',
    details: [
      'Final deployment to production',
      'DNS and domain configuration',
      'Admin training session (1 hour)',
      '30 days post-launch support included',
    ],
    status: 'pending',
  },
];

const statusCfg = {
  completed: { color: 'var(--color-success)', bg: 'var(--color-success-bg)', border: 'rgba(22,101,52,0.15)', label: 'Completed' },
  active:    { color: 'var(--color-accent)', bg: 'var(--color-surface)', border: 'var(--color-border)', label: 'In Progress' },
  pending:   { color: 'var(--color-text-muted)', bg: 'transparent', border: 'var(--color-border)', label: 'Upcoming' },
};

export default function SopPage() {
  const [openIndex, setOpenIndex] = useState(2);

  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="page-container" style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div className="section-label">Standard Operating Procedure</div>
          <h2 className="section-title" style={{ marginBottom: 12 }}>
            How We Work Together
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            A transparent, step-by-step breakdown of our process. No surprises — just clarity at every stage.
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
            <span>Overall Progress</span>
            <span>40%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: '40%' }} />
          </div>
        </div>

        {/* Steps */}
        <div className="stagger">
          {steps.map((step, idx) => (
            <div key={idx} style={{ marginBottom: 10 }}>
              <div
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="card"
                style={{
                  cursor: 'pointer',
                  background: statusCfg[step.status].bg,
                  borderColor: statusCfg[step.status].border,
                  userSelect: 'none',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {step.status === 'active' && (
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                    background: 'var(--color-accent)',
                  }} />
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 8,
                    background: step.status === 'active' ? 'var(--color-surface)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: step.status === 'completed' ? 'var(--color-success)' : step.status === 'active' ? 'var(--color-text)' : 'var(--color-text-muted)',
                    flexShrink: 0,
                  }}>
                    {step.status === 'completed' ? <CheckCircle size={20} /> : step.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: step.status === 'pending' ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                        {step.title}
                      </span>
                      <span className={`badge ${step.status === 'completed' ? 'badge-success' : step.status === 'active' ? 'badge-info' : 'badge-muted'}`}>
                        {statusCfg[step.status].label}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, color: step.status === 'pending' ? 'var(--color-text-muted)' : 'var(--color-text-secondary)', marginTop: 2 }}>
                      {step.subtitle}
                      <span style={{ marginLeft: 8, color: 'var(--color-text-muted)', fontSize: 13 }}>— {step.duration}</span>
                    </div>
                  </div>

                  <ChevronDown size={18} style={{
                    color: 'var(--color-text-muted)', flexShrink: 0,
                    transition: 'transform 0.25s ease',
                    transform: openIndex === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                  }} />
                </div>

                {/* Expanded details */}
                <div style={{
                  maxHeight: openIndex === idx ? 300 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.35s ease, opacity 0.25s ease, margin 0.25s ease',
                  opacity: openIndex === idx ? 1 : 0,
                  marginTop: openIndex === idx ? 16 : 0,
                }}>
                  <div style={{ paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
                    {step.details.map((detail, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0',
                        color: step.status === 'pending' ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
                        fontSize: 14,
                      }}>
                        <div style={{
                          width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                          background: step.status === 'completed' ? 'var(--color-success)' : step.status === 'active' ? 'var(--color-text)' : 'var(--color-border)',
                        }} />
                        {detail}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
