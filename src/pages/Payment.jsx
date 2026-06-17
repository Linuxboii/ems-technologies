import { CreditCard, Wallet, Calendar, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

const paymentSchedule = [
  { installment: '1st', label: 'Down Payment', amount: '₹1,50,000', due: 'Jan 15, 2026', status: 'paid' },
  { installment: '2nd', label: 'Mid-Project Milestone', amount: '₹1,00,000', due: 'Feb 10, 2026', status: 'pending' },
  { installment: '3rd', label: 'Pre-Launch Payment', amount: '₹1,00,000', due: 'Feb 28, 2026', status: 'upcoming' },
  { installment: '4th', label: 'Final Payment', amount: '₹50,000', due: 'Mar 10, 2026', status: 'upcoming' },
];

const totalPaid = 150000;
const totalDue = 400000;
const paymentProgress = (totalPaid / totalDue) * 100;

export default function PaymentPage() {
  const next = paymentSchedule.find(p => p.status === 'pending');

  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="page-container" style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div className="section-label">Billing & Payments</div>
          <h2 className="section-title" style={{ marginBottom: 12 }}>
            Next Payment Due
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            Transparent payment schedule. Track what's been paid, what's due, and when.
          </p>
        </div>

        {/* Next Payment card */}
        <div style={{ marginBottom: 32 }}>
          <div className="card" style={{
            borderColor: '#92400e', borderWidth: '1.5px',
            background: 'var(--color-warning-bg)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Wallet size={20} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Next Payment
                  </span>
                </div>
                <div style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 4 }}>
                  {next ? next.amount : '₹0'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  <Calendar size={16} />
                  <span>Due <strong style={{ color: 'var(--color-warning)' }}>{next ? next.due : '—'}</strong></span>
                  <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                  <span>{next ? next.label : 'No pending'}</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <button className="btn-primary">
                  <CreditCard size={18} />
                  Pay Now
                  <ArrowRight size={16} />
                </button>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Secure via Razorpay / Stripe
                </div>
              </div>
            </div>

            {next && (
              <div style={{
                marginTop: 20, padding: '12px 16px', borderRadius: 8,
                background: 'var(--color-warning-bg)', border: '1px solid rgba(146,64,14,0.15)',
                display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--color-warning)', fontWeight: 500,
              }}>
                <AlertCircle size={18} />
                <span>Due in <strong>12 days</strong>. Early payment keeps the project on schedule.</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 32 }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Payment Progress</span>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  ₹{totalPaid.toLocaleString('en-IN')} paid of ₹{totalDue.toLocaleString('en-IN')}
                </div>
              </div>
              <span style={{ fontSize: 22, fontWeight: 900 }}>{Math.round(paymentProgress)}%</span>
            </div>
            <div className="progress-bar" style={{ height: 8, borderRadius: 4 }}>
              <div className="progress-bar-fill" style={{ width: `${paymentProgress}%`, height: 8, borderRadius: 4 }} />
            </div>
          </div>
        </div>

        {/* Schedule table */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid var(--color-border)' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '70px 1fr 120px 120px 100px',
              padding: '14px 20px',
              background: 'var(--color-surface)',
              borderBottom: '1px solid var(--color-border)',
              fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              <span>#</span>
              <span>Installment</span>
              <span style={{ textAlign: 'right' }}>Amount</span>
              <span style={{ textAlign: 'right' }}>Due Date</span>
              <span style={{ textAlign: 'center' }}>Status</span>
            </div>
            {paymentSchedule.map((p, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '70px 1fr 120px 120px 100px',
                padding: '16px 20px',
                borderBottom: i < paymentSchedule.length - 1 ? '1px solid var(--color-border)' : 'none',
                background: p.status === 'pending' ? 'var(--color-warning-bg)' : 'transparent',
                fontSize: 14, alignItems: 'center',
              }}>
                <span style={{ fontWeight: 700, color: 'var(--color-text-muted)' }}>{p.installment}</span>
                <span style={{ fontWeight: 600, color: p.status === 'upcoming' ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                  {p.label}
                </span>
                <span style={{ fontWeight: 700, textAlign: 'right', color: p.status === 'upcoming' ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                  {p.amount}
                </span>
                <span style={{ textAlign: 'right', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                  {p.due || '—'}
                </span>
                <span style={{ textAlign: 'center' }}>
                  {p.status === 'paid' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-success)', fontWeight: 600, fontSize: 13 }}>
                      <CheckCircle size={14} /> Paid
                    </span>
                  ) : p.status === 'pending' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-warning)', fontWeight: 600, fontSize: 13 }}>
                      <AlertCircle size={14} /> Due
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 500, fontSize: 13 }}>—</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment methods */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['Visa', 'Mastercard', 'UPI', 'Net Banking', 'Razorpay'].map((method, i) => (
            <div key={i} className="card" style={{
              padding: '10px 18px',
              fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)',
            }}>
              {method}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
