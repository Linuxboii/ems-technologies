import { useEffect, useState } from 'react';
import { CreditCard, Wallet, Calendar, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = ['upcoming', 'pending', 'submitted', 'paid'];
const emptyForm = { installment_label: '', label: '', amount: '', due_date: '', status: 'upcoming' };

function PaymentForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, amount: Number(form.amount) || 0 });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 16, display: 'grid', gap: 10 }}>
      <input placeholder="Installment e.g. 1st" value={form.installment_label} onChange={e => update('installment_label', e.target.value)} required
        style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }} />
      <input placeholder="Label e.g. Down Payment" value={form.label} onChange={e => update('label', e.target.value)} required
        style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input type="number" placeholder="Amount (INR)" value={form.amount} onChange={e => update('amount', e.target.value)} required
          style={{ width: 160, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }} />
        <input placeholder="Due date e.g. Jan 15, 2026" value={form.due_date} onChange={e => update('due_date', e.target.value)} required
          style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }} />
        <select value={form.status} onChange={e => update('status', e.target.value)} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function PaymentPage() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  function load() {
    api.get('/payments')
      .then(setSchedule)
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load payments'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(form) {
    try {
      const created = await api.post('/payments', { ...form, order_index: schedule.length });
      setSchedule(prev => [...prev, created]);
      setCreating(false);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create installment');
    }
  }

  async function handleUpdate(id, form) {
    try {
      const existing = schedule.find(p => p.id === id);
      const updated = await api.put(`/payments/${id}`, { ...form, order_index: existing.order_index });
      setSchedule(prev => prev.map(p => p.id === id ? updated : p));
      setEditingId(null);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update installment');
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/payments/${id}`);
      setSchedule(prev => prev.filter(p => p.id !== id));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete installment');
    }
  }

  async function handleSubmitPayment(id) {
    try {
      const updated = await api.patch(`/payments/${id}/submit`);
      setSchedule(prev => prev.map(p => p.id === id ? updated : p));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit payment');
    }
  }

  async function handleConfirmPaid(id) {
    try {
      const updated = await api.patch(`/payments/${id}/confirm-paid`);
      setSchedule(prev => prev.map(p => p.id === id ? updated : p));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to confirm payment');
    }
  }

  const totalPaid = schedule.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalDue = schedule.reduce((sum, p) => sum + p.amount, 0);
  const paymentProgress = totalDue ? (totalPaid / totalDue) * 100 : 0;
  const next = schedule.find(p => p.status === 'pending' || p.status === 'submitted');

  function formatInr(amount) {
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="page-container" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div className="section-label">Billing & Payments</div>
          <h2 className="section-title" style={{ marginBottom: 12 }}>
            Next Payment Due
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            Transparent payment schedule. Track what's been paid, what's due, and when.
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
            <div style={{ marginBottom: 32 }}>
              <div className="card" style={{ borderColor: '#92400e', borderWidth: '1.5px', background: 'var(--color-warning-bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Wallet size={20} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Next Payment
                      </span>
                    </div>
                    <div style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 4 }}>
                      {next ? formatInr(next.amount) : '₹0'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                      <Calendar size={16} />
                      <span>Due <strong style={{ color: 'var(--color-warning)' }}>{next ? next.due_date : '—'}</strong></span>
                      <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                      <span>{next ? next.label : 'No pending'}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {next && user?.role === 'client' && next.status !== 'submitted' && (
                      <button className="btn-primary" onClick={() => handleSubmitPayment(next.id)}>
                        <CreditCard size={18} />
                        Submit Payment
                        <ArrowRight size={16} />
                      </button>
                    )}
                    {next && next.status === 'submitted' && (
                      <span className="badge badge-info">Awaiting confirmation</span>
                    )}
                    {next && user?.role === 'admin' && next.status === 'submitted' && (
                      <button className="btn-primary" style={{ marginLeft: 8 }} onClick={() => handleConfirmPaid(next.id)}>
                        Confirm Paid
                      </button>
                    )}
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
                      Secure via Razorpay / Stripe
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Payment Progress</span>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {formatInr(totalPaid)} paid of {formatInr(totalDue)}
                    </div>
                  </div>
                  <span style={{ fontSize: 22, fontWeight: 900 }}>{Math.round(paymentProgress)}%</span>
                </div>
                <div className="progress-bar" style={{ height: 8, borderRadius: 4 }}>
                  <div className="progress-bar-fill" style={{ width: `${paymentProgress}%`, height: 8, borderRadius: 4 }} />
                </div>
              </div>
            </div>

            {user?.role === 'admin' && (
              <div style={{ marginBottom: 16 }}>
                {creating ? (
                  <PaymentForm initial={emptyForm} onSave={handleCreate} onCancel={() => setCreating(false)} />
                ) : (
                  <button className="btn-secondary" onClick={() => setCreating(true)}>+ Add installment</button>
                )}
              </div>
            )}

            <div style={{ marginBottom: 32 }}>
              <div style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '70px 1fr 120px 120px 140px 100px',
                  padding: '14px 20px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)',
                  fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  <span>#</span>
                  <span>Installment</span>
                  <span style={{ textAlign: 'right' }}>Amount</span>
                  <span style={{ textAlign: 'right' }}>Due Date</span>
                  <span style={{ textAlign: 'center' }}>Status</span>
                  <span style={{ textAlign: 'center' }}>Actions</span>
                </div>
                {schedule.map((p, i) =>
                  editingId === p.id ? (
                    <div key={p.id} style={{ padding: 16 }}>
                      <PaymentForm initial={p} onSave={(form) => handleUpdate(p.id, form)} onCancel={() => setEditingId(null)} />
                    </div>
                  ) : (
                    <div key={p.id} style={{
                      display: 'grid', gridTemplateColumns: '70px 1fr 120px 120px 140px 100px',
                      padding: '16px 20px', borderBottom: i < schedule.length - 1 ? '1px solid var(--color-border)' : 'none',
                      background: p.status === 'pending' ? 'var(--color-warning-bg)' : 'transparent',
                      fontSize: 14, alignItems: 'center',
                    }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-text-muted)' }}>{p.installment_label}</span>
                      <span style={{ fontWeight: 600, color: p.status === 'upcoming' ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                        {p.label}
                      </span>
                      <span style={{ fontWeight: 700, textAlign: 'right', color: p.status === 'upcoming' ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                        {formatInr(p.amount)}
                      </span>
                      <span style={{ textAlign: 'right', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                        {p.due_date || '—'}
                      </span>
                      <span style={{ textAlign: 'center' }}>
                        {p.status === 'paid' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-success)', fontWeight: 600, fontSize: 13 }}>
                            <CheckCircle size={14} /> Paid
                          </span>
                        ) : p.status === 'submitted' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-text)', fontWeight: 600, fontSize: 13 }}>
                            Submitted
                          </span>
                        ) : p.status === 'pending' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-warning)', fontWeight: 600, fontSize: 13 }}>
                            <AlertCircle size={14} /> Due
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontWeight: 500, fontSize: 13 }}>—</span>
                        )}
                      </span>
                      <span style={{ textAlign: 'center', display: 'flex', gap: 6, justifyContent: 'center' }}>
                        {user?.role === 'client' && (p.status === 'upcoming' || p.status === 'pending') && (
                          <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => handleSubmitPayment(p.id)}>Submit</button>
                        )}
                        {user?.role === 'admin' && p.status === 'submitted' && (
                          <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => handleConfirmPaid(p.id)}>Confirm</button>
                        )}
                        {user?.role === 'admin' && (
                          <>
                            <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setEditingId(p.id)}>Edit</button>
                            <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => handleDelete(p.id)}>Delete</button>
                          </>
                        )}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['Visa', 'Mastercard', 'UPI', 'Net Banking', 'Razorpay'].map((method, i) => (
                <div key={i} className="card" style={{ padding: '10px 18px', fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)' }}>
                  {method}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
