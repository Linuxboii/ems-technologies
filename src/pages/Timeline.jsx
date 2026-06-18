import { useEffect, useState } from 'react';
import { Calendar, CheckCircle, Circle } from 'lucide-react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

const PHASE_STATUS_OPTIONS = ['upcoming', 'active', 'completed'];
const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'];

function PhaseForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, progress: form.progress === '' ? null : Number(form.progress) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
      <input placeholder="Phase label e.g. Sprint 1" value={form.phase_label} onChange={e => update('phase_label', e.target.value)} required
        style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }} />
      <input placeholder="Title" value={form.title} onChange={e => update('title', e.target.value)} required
        style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }} />
      <input placeholder="Date range e.g. Jan 15 — Jan 28" value={form.date_range} onChange={e => update('date_range', e.target.value)} required
        style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <select value={form.status} onChange={e => update('status', e.target.value)} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
          {PHASE_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="number" placeholder="Progress %" value={form.progress} onChange={e => update('progress', e.target.value)}
          style={{ width: 120, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function TimelinePage() {
  const { user } = useAuth();
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPhaseId, setEditingPhaseId] = useState(null);
  const [newItemLabel, setNewItemLabel] = useState({});

  function load() {
    api.get('/timeline')
      .then(setPhases)
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load timeline'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleUpdatePhase(id, form) {
    const existing = phases.find(p => p.id === id);
    const updated = await api.put(`/timeline/phases/${id}`, {
      order_index: existing.order_index,
      phase_label: form.phase_label,
      title: form.title,
      date_range: form.date_range,
      status: form.status,
      progress: form.progress,
    });
    setPhases(prev => prev.map(p => p.id === id ? { ...updated, items: p.items } : p));
    setEditingPhaseId(null);
  }

  async function toggleItemDone(phaseId, item) {
    const updated = await api.patch(`/timeline/items/${item.id}/done`, { done: !item.done });
    setPhases(prev => prev.map(p => p.id === phaseId
      ? { ...p, items: p.items.map(i => i.id === item.id ? updated : i) }
      : p));
  }

  async function handleAddItem(phase) {
    const label = (newItemLabel[phase.id] || '').trim();
    if (!label) return;
    const created = await api.post('/timeline/items', {
      phase_id: phase.id, order_index: phase.items.length, label, done: false,
    });
    setPhases(prev => prev.map(p => p.id === phase.id ? { ...p, items: [...p.items, created] } : p));
    setNewItemLabel(prev => ({ ...prev, [phase.id]: '' }));
  }

  async function handleDeleteItem(phaseId, itemId) {
    await api.delete(`/timeline/items/${itemId}`);
    setPhases(prev => prev.map(p => p.id === phaseId ? { ...p, items: p.items.filter(i => i.id !== itemId) } : p));
  }

  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="page-container" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div className="section-label">Project Timeline</div>
          <h2 className="section-title" style={{ marginBottom: 12 }}>
            Your 8-Week Roadmap
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            A sprint-by-sprint breakdown of our journey. Each phase builds on the last, with milestones clearly mapped.
          </p>
        </div>

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
              <div style={{
                position: 'absolute', top: 6, left: '7%', right: '7%', height: 1.5,
                background: 'var(--color-border)', zIndex: 0,
              }}>
                <div style={{ width: '45%', height: '100%', background: 'var(--color-accent)' }} />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 24, padding: '12px 16px', borderRadius: 8, background: 'var(--color-warning-bg)', color: 'var(--color-warning)', fontSize: 14 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
        ) : (
          <div className="stagger" style={{ display: 'grid', gap: 16 }}>
            {phases.map((sprint) => (
              <div key={sprint.id} className="card" style={{
                background: sprint.status === 'active' ? 'var(--color-surface)' : 'var(--color-bg)',
                borderColor: sprint.status === 'active' ? 'var(--color-text)' : sprint.status === 'completed' ? 'var(--color-success-bg)' : 'var(--color-border)',
              }}>
                {editingPhaseId === sprint.id ? (
                  <PhaseForm
                    initial={{ ...sprint, progress: sprint.progress ?? '' }}
                    onSave={(form) => handleUpdatePhase(sprint.id, form)}
                    onCancel={() => setEditingPhaseId(null)}
                  />
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                            color: sprint.status === 'completed' ? 'var(--color-success)' : sprint.status === 'active' ? 'var(--color-text)' : 'var(--color-text-muted)',
                          }}>
                            {sprint.phase_label}
                          </span>
                          <span className={`badge ${sprint.status === 'completed' ? 'badge-success' : sprint.status === 'active' ? 'badge-info' : 'badge-muted'}`}>
                            {sprint.status === 'completed' ? 'Done' : sprint.status === 'active' ? 'In Progress' : 'Upcoming'}
                          </span>
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: sprint.status === 'upcoming' ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                          {sprint.title}
                        </h3>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                        <Calendar size={14} />
                        <span>{sprint.date_range}</span>
                      </div>
                    </div>

                    {sprint.progress != null && (
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
                      {sprint.items.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => toggleItemDone(sprint.id, item)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                            color: item.done ? 'var(--color-text-secondary)' : sprint.status === 'upcoming' ? 'var(--color-text-muted)' : 'var(--color-text)',
                            fontSize: 14, cursor: 'pointer',
                          }}
                        >
                          {item.done
                            ? <CheckCircle size={16} color="var(--color-success)" style={{ flexShrink: 0 }} />
                            : <Circle size={16} color="var(--color-border)" style={{ flexShrink: 0 }} />}
                          <span style={{ flex: 1 }}>{item.label}</span>
                          {user?.role === 'admin' && (
                            <button
                              className="btn-secondary"
                              style={{ fontSize: 11, padding: '4px 8px' }}
                              onClick={(e) => { e.stopPropagation(); handleDeleteItem(sprint.id, item.id); }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {user?.role === 'admin' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <input
                          placeholder="New item label"
                          value={newItemLabel[sprint.id] || ''}
                          onChange={e => setNewItemLabel(prev => ({ ...prev, [sprint.id]: e.target.value }))}
                          style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13 }}
                        />
                        <button className="btn-secondary" onClick={() => handleAddItem(sprint)}>Add item</button>
                        <button className="btn-secondary" onClick={() => setEditingPhaseId(sprint.id)}>Edit phase</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
