import { useEffect, useState } from 'react';
import { ChevronDown, FileText, MessageSquare, Code, Eye, Rocket, CheckCircle } from 'lucide-react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

const ICONS = { FileText, MessageSquare, Code, Eye, Rocket };
const ICON_KEYS = Object.keys(ICONS);
const STATUS_OPTIONS = ['pending', 'active', 'completed'];

const statusCfg = {
  completed: { color: 'var(--color-success)', bg: 'var(--color-success-bg)', border: 'rgba(22,101,52,0.15)', label: 'Completed' },
  active:    { color: 'var(--color-accent)', bg: 'var(--color-surface)', border: 'var(--color-border)', label: 'In Progress' },
  pending:   { color: 'var(--color-text-muted)', bg: 'transparent', border: 'var(--color-border)', label: 'Upcoming' },
};

const emptyForm = { icon_key: 'FileText', title: '', subtitle: '', duration: '', details: '', status: 'pending' };

function StepForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        details: form.details.split('\n').map(s => s.trim()).filter(Boolean),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 16, display: 'grid', gap: 10 }}>
      <input placeholder="Title" value={form.title} onChange={e => update('title', e.target.value)} required
        style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }} />
      <input placeholder="Subtitle" value={form.subtitle} onChange={e => update('subtitle', e.target.value)} required
        style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input placeholder="Duration e.g. Days 1-3" value={form.duration} onChange={e => update('duration', e.target.value)} required
          style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }} />
        <select value={form.icon_key} onChange={e => update('icon_key', e.target.value)} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
          {ICON_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={form.status} onChange={e => update('status', e.target.value)} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <textarea placeholder="One detail per line" value={form.details} onChange={e => update('details', e.target.value)} required
        style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', minHeight: 80 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function SopPage() {
  const { user } = useAuth();
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openIndex, setOpenIndex] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  function load() {
    api.get('/sop')
      .then(data => { setSteps(data); setOpenIndex(data.findIndex(s => s.status === 'active')); })
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load SoP'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(form) {
    try {
      const created = await api.post('/sop', { ...form, order_index: steps.length });
      setSteps(prev => [...prev, created]);
      setCreating(false);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create step');
    }
  }

  async function handleUpdate(id, form) {
    try {
      const existing = steps.find(s => s.id === id);
      const updated = await api.put(`/sop/${id}`, { ...form, order_index: existing.order_index });
      setSteps(prev => prev.map(s => s.id === id ? updated : s));
      setEditingId(null);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update step');
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/sop/${id}`);
      setSteps(prev => prev.filter(s => s.id !== id));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete step');
    }
  }

  const overallProgress = steps.length
    ? Math.round((steps.filter(s => s.status === 'completed').length / steps.length) * 100)
    : 0;

  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="page-container" style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div className="section-label">Standard Operating Procedure</div>
          <h2 className="section-title" style={{ marginBottom: 12 }}>
            How We Work Together
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            A transparent, step-by-step breakdown of our process. No surprises — just clarity at every stage.
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: 24, padding: '12px 16px', borderRadius: 8, background: 'var(--color-warning-bg)', color: 'var(--color-warning)', fontSize: 14 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
        ) : (
          <>
            <div style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                <span>Overall Progress</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${overallProgress}%` }} />
              </div>
            </div>

            {user?.role === 'admin' && (
              <div style={{ marginBottom: 16 }}>
                {creating ? (
                  <StepForm initial={emptyForm} onSave={handleCreate} onCancel={() => setCreating(false)} />
                ) : (
                  <button className="btn-secondary" onClick={() => setCreating(true)}>+ Add step</button>
                )}
              </div>
            )}

            <div className="stagger">
              {steps.map((step, idx) => {
                const Icon = ICONS[step.icon_key] || FileText;
                if (editingId === step.id) {
                  return (
                    <div key={step.id} style={{ marginBottom: 10 }}>
                      <StepForm
                        initial={{ ...step, details: step.details.join('\n') }}
                        onSave={(form) => handleUpdate(step.id, form)}
                        onCancel={() => setEditingId(null)}
                      />
                    </div>
                  );
                }
                return (
                  <div key={step.id} style={{ marginBottom: 10 }}>
                    <div
                      onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                      className="card"
                      style={{
                        cursor: 'pointer', background: statusCfg[step.status].bg,
                        borderColor: statusCfg[step.status].border, userSelect: 'none',
                        position: 'relative', overflow: 'hidden',
                      }}
                    >
                      {step.status === 'active' && (
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--color-accent)' }} />
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 8,
                          background: step.status === 'active' ? 'var(--color-surface)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: step.status === 'completed' ? 'var(--color-success)' : step.status === 'active' ? 'var(--color-text)' : 'var(--color-text-muted)',
                          flexShrink: 0,
                        }}>
                          {step.status === 'completed' ? <CheckCircle size={20} /> : <Icon size={20} />}
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

                      <div style={{
                        maxHeight: openIndex === idx ? 300 : 0, overflow: 'hidden',
                        transition: 'max-height 0.35s ease, opacity 0.25s ease, margin 0.25s ease',
                        opacity: openIndex === idx ? 1 : 0, marginTop: openIndex === idx ? 16 : 0,
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
                    {user?.role === 'admin' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, marginLeft: 8 }}>
                        <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 10px' }} onClick={(e) => { e.stopPropagation(); setEditingId(step.id); }}>Edit</button>
                        <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 10px' }} onClick={(e) => { e.stopPropagation(); handleDelete(step.id); }}>Delete</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
