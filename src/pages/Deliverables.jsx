import { useEffect, useState } from 'react';
import { FileText, Smartphone, Globe, Palette, Settings, BookOpen, CheckCircle, Clock } from 'lucide-react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

const ICONS = { FileText, Smartphone, Globe, Palette, Settings, BookOpen };
const ICON_KEYS = Object.keys(ICONS);
const STATUS_OPTIONS = ['upcoming', 'in-progress', 'completed'];

const statDefs = {
  completed:   { dot: 'var(--color-success)', label: 'Delivered' },
  'in-progress': { dot: 'var(--color-text)', label: 'In Progress' },
  upcoming:    { dot: 'var(--color-text-muted)', label: 'Upcoming' },
};

const emptyForm = { icon_key: 'Globe', title: '', description: '', status: 'upcoming', date: '', files: 0, progress: '' };

function DeliverableForm({ initial, onSave, onCancel }) {
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
        files: Number(form.files) || 0,
        progress: form.progress === '' ? null : Number(form.progress),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 16, display: 'grid', gap: 10 }}>
      <input placeholder="Title" value={form.title} onChange={e => update('title', e.target.value)} required
        style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }} />
      <textarea placeholder="Description" value={form.description} onChange={e => update('description', e.target.value)} required
        style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', minHeight: 60 }} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select value={form.icon_key} onChange={e => update('icon_key', e.target.value)} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
          {ICON_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={form.status} onChange={e => update('status', e.target.value)} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input placeholder="Date e.g. Jan 20, 2026" value={form.date} onChange={e => update('date', e.target.value)} required
          style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }} />
        <input type="number" placeholder="Files" value={form.files} onChange={e => update('files', e.target.value)}
          style={{ width: 90, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }} />
        <input type="number" placeholder="Progress %" value={form.progress} onChange={e => update('progress', e.target.value)}
          style={{ width: 110, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function DeliverablesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  function load() {
    api.get('/deliverables')
      .then(setItems)
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load deliverables'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(form) {
    try {
      const created = await api.post('/deliverables', { ...form, order_index: items.length });
      setItems(prev => [...prev, created]);
      setCreating(false);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create deliverable');
    }
  }

  async function handleUpdate(id, form) {
    try {
      const existing = items.find(i => i.id === id);
      const updated = await api.put(`/deliverables/${id}`, { ...existing, ...form, order_index: existing.order_index });
      setItems(prev => prev.map(i => i.id === id ? updated : i));
      setEditingId(null);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update deliverable');
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/deliverables/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete deliverable');
    }
  }

  async function handleAcknowledge(id) {
    try {
      const updated = await api.patch(`/deliverables/${id}/acknowledge`);
      setItems(prev => prev.map(i => i.id === id ? updated : i));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to acknowledge deliverable');
    }
  }

  const counts = {
    total: items.length,
    completed: items.filter(i => i.status === 'completed').length,
    inProgress: items.filter(i => i.status === 'in-progress').length,
    upcoming: items.filter(i => i.status === 'upcoming').length,
  };

  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div className="section-label">Deliverables</div>
          <h2 className="section-title" style={{ marginBottom: 12 }}>
            Everything You'll Receive
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            A complete catalog of every asset, codebase, and document we deliver. Track progress in real-time.
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 40 }}>
              {[
                { label: 'Total Items', value: counts.total, color: 'var(--color-text)' },
                { label: 'Delivered', value: counts.completed, color: 'var(--color-success)' },
                { label: 'In Progress', value: counts.inProgress, color: 'var(--color-warning)' },
                { label: 'Upcoming', value: counts.upcoming, color: 'var(--color-text-muted)' },
              ].map((s, i) => (
                <div key={i} className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {user?.role === 'admin' && (
              <div style={{ marginBottom: 16 }}>
                {creating ? (
                  <DeliverableForm initial={emptyForm} onSave={handleCreate} onCancel={() => setCreating(false)} />
                ) : (
                  <button className="btn-secondary" onClick={() => setCreating(true)}>+ Add deliverable</button>
                )}
              </div>
            )}

            <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 16 }}>
              {items.map((item) => {
                const Icon = ICONS[item.icon_key] || FileText;
                if (editingId === item.id) {
                  return (
                    <DeliverableForm
                      key={item.id}
                      initial={{ ...item, progress: item.progress ?? '' }}
                      onSave={(form) => handleUpdate(item.id, form)}
                      onCancel={() => setEditingId(null)}
                    />
                  );
                }
                return (
                  <div key={item.id} className="card" style={{
                    position: 'relative',
                    opacity: item.status === 'upcoming' ? 0.6 : 1,
                  }}>
                    <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: statDefs[item.status].dot, display: 'inline-block' }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: statDefs[item.status].dot }}>
                        {statDefs[item.status].label}
                      </span>
                    </div>

                    <div style={{
                      width: 48, height: 48, borderRadius: 8,
                      background: item.status === 'completed' ? 'var(--color-success-bg)' : item.status === 'in-progress' ? 'var(--color-surface)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: item.status === 'completed' ? 'var(--color-success)' : item.status === 'in-progress' ? 'var(--color-text)' : 'var(--color-text-muted)',
                      marginBottom: 16,
                    }}>
                      <Icon size={22} />
                    </div>

                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                      {item.description}
                    </p>

                    {item.status === 'in-progress' && item.progress != null && (
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {item.status === 'completed' ? <CheckCircle size={14} color="var(--color-success)" /> : <Clock size={14} />}
                        <span>{item.status === 'completed' ? `Delivered ${item.date}` : `Due ${item.date}`}</span>
                      </div>
                      <span style={{ fontSize: 12, color: item.status === 'completed' ? 'var(--color-success)' : 'var(--color-text-muted)', fontWeight: 500 }}>
                        {item.status === 'completed' ? `${item.files} files` : item.status === 'in-progress' ? 'Preview' : '—'}
                      </span>
                    </div>

                    {user?.role === 'admin' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => setEditingId(item.id)}>Edit</button>
                        <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => handleDelete(item.id)}>Delete</button>
                      </div>
                    )}

                    {user?.role === 'client' && (
                      <div style={{ marginTop: 12 }}>
                        {item.client_acknowledged ? (
                          <span className="badge badge-success">Reviewed by you</span>
                        ) : (
                          <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => handleAcknowledge(item.id)}>
                            Mark reviewed
                          </button>
                        )}
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
