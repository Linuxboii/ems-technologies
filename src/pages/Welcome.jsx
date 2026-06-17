import { Link } from 'react-router-dom';
import { useRef, useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';

export default function Welcome() {
  const headlineRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="page-section" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: 0 }}>
      <div className="page-container" style={{ width: '100%' }}>
        <div style={{
          maxWidth: 800,
          paddingTop: 80,
          paddingBottom: 80,
        }}>
          {/* Exaggerated Minimalism — oversized hero typography */}
          <div className={`fade-in-up ${visible ? 'visible' : ''}`} style={{ marginBottom: 32 }}>
            <p style={{
              fontSize: 'clamp(3rem, 8vw, 7rem)',
              fontWeight: 900,
              lineHeight: 1.0,
              letterSpacing: '-0.05em',
              color: 'var(--color-text)',
              marginBottom: 0,
              maxWidth: 'none',
            }}>
              Welcome to
              <br />
              <span style={{ color: 'var(--color-text)', borderBottom: '4px solid var(--color-text)' }}>
                Project Atlas
              </span>
            </p>
          </div>

          {/* Subheadline */}
          <div className={`fade-in-up ${visible ? 'visible' : ''}`} style={{ marginBottom: 48 }}>
            <p style={{
              fontSize: 'clamp(1.05rem, 2vw, 1.3rem)',
              color: 'var(--color-text-secondary)',
              fontWeight: 400,
              lineHeight: 1.7,
              maxWidth: 560,
            }}>
              Your central hub for everything — SoP, deliverables, timeline, and payments.
              Everything you need, all in one place.
            </p>
          </div>

          {/* CTA */}
          <div className={`fade-in-up ${visible ? 'visible' : ''}`} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 80 }}>
            <Link to="/sop" className="btn-primary">
              Get Started
              <ChevronRight size={18} />
            </Link>
            <Link to="/payment" className="btn-secondary">
              View Payments
            </Link>
          </div>

          {/* Quick stats — clean, 3-column grid */}
          <div className={`stagger ${visible ? 'visible' : ''}`} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            maxWidth: 700,
          }}>
            {[
              { label: 'Deliverables', value: '12 Items' },
              { label: 'Sprint Duration', value: '6 Weeks' },
              { label: 'Next Milestone', value: 'Feb 28, 2026' },
            ].map((item, i) => (
              <div key={i} className="card" style={{ cursor: 'default' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
