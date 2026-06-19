import { useEffect, useState } from 'react';
import { Mail, Share2, Megaphone, KeyRound, ClipboardCheck, FileText } from 'lucide-react';
import { api, ApiError } from '../api/client';

const ICONS = { Mail, Share2, Megaphone, KeyRound, ClipboardCheck, FileText };

export default function RequirementsPage() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/requirements')
      .then(setSections)
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load requirements'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="page-container" style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div className="section-label">Project Requirements</div>
          <h2 className="section-title" style={{ marginBottom: 12 }}>
            What We'll Need From You
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            To set up and automate the requested workflows, here's the information and access required to get started.
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: 24, padding: '12px 16px', borderRadius: 8, background: 'var(--color-warning-bg)', color: 'var(--color-warning)', fontSize: 14 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
        ) : sections.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No requirements have been added yet.</div>
        ) : (
          <div className="stagger" style={{ display: 'grid', gap: 20 }}>
            {sections.map((section) => {
              const Icon = ICONS[section.icon_key] || FileText;
              return (
                <div key={section.id} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: section.intro ? 12 : 18 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                      background: 'var(--color-surface)', color: 'var(--color-text)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={20} />
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                      {section.title}
                    </h3>
                  </div>

                  {section.intro && (
                    <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 18px', lineHeight: 1.6 }}>
                      {section.intro}
                    </p>
                  )}

                  <div style={{ display: 'grid', gap: 18 }}>
                    {(section.groups || []).map((group, gi) => (
                      <div key={gi}>
                        {group.heading && (
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                            {group.heading}
                          </div>
                        )}
                        {group.note && (
                          <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                            {group.note}
                          </div>
                        )}
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 7 }}>
                          {(group.items || []).map((item, ii) => (
                            <li key={ii} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                              {group.ordered ? (
                                <span style={{ fontWeight: 600, color: 'var(--color-text-muted)', flexShrink: 0, minWidth: 16 }}>{ii + 1}.</span>
                              ) : (
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-text-muted)', flexShrink: 0, marginTop: 7 }} />
                              )}
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
