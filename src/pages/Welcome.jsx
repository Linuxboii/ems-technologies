import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { ArrowRight, Sparkle } from 'lucide-react';
import './Welcome.css';

export default function Welcome() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const blocks = Array.from(root.querySelectorAll('.wl-reveal'));

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReduced) {
      blocks.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = blocks.indexOf(entry.target);
            const delay = index >= 0 ? index * 45 : 0;
            window.setTimeout(() => {
              entry.target.classList.add('is-visible');
            }, delay);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    blocks.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="welcome-letter" ref={rootRef}>
      <div className="wl-frame" aria-hidden="true">
        <span className="tl" />
        <span className="tr" />
        <span className="bl" />
        <span className="br" />
      </div>

      <div className="wl-paper">
        {/* 1. Top bar */}
        <header className="wl-topbar">
          <div className="wl-topbar-left">
            <div className="wl-brand-row">
              <span className="wl-mark" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3.5 4.5 19h3.4l1.3-3h5.6l1.3 3h3.4L12 3.5Zm-1.7 9.4L12 9l1.7 3.9h-3.4Z" fill="#fff" />
                </svg>
              </span>
              <span className="wl-brand">
                Avlok<em>Ai</em>
              </span>
            </div>
            <div className="wl-mono">SEE MORE · KNOW MORE · DO MORE</div>
          </div>

          <div className="wl-topbar-right">
            <div className="wl-mono">A LITTLE NOTE</div>
            <div className="wl-mono wl-accent">FOR MR. VIKRAM</div>
          </div>
        </header>

        {/* 2. Kicker */}
        <p className="wl-kicker wl-reveal">a warm hello —</p>

        {/* 3. Headline */}
        <h1 className="wl-headline wl-reveal">
          Welcome aboard,
          <br />
          <em>Mr. Vikram.</em>
        </h1>

        {/* 4. Lede */}
        <p className="wl-lede wl-reveal">
          We're genuinely glad to be working together, and looking forward to
          everything we'll build from here.
        </p>

        {/* 5. Diamond + rule */}
        <div className="wl-divider wl-reveal" aria-hidden="true">
          <span className="wl-diamond" />
          <hr className="wl-rule" />
        </div>

        {/* 6. Body */}
        <div className="wl-body wl-reveal">
          <p className="wl-dropcap">
            It is <strong>genuinely great</strong> to have you with us — not in
            the polite, copy-pasted, "dear valued client" sort of way, but the
            real kind, where we've already got ideas scribbled in the margins
            and we're a little impatient to show you.
          </p>
          <p>
            From here on, you're not a ticket number or a line on an invoice.
            You're <strong>Mr. Vikram</strong>, and your work gets our full
            attention — the curiosity, the craft, and the occasional 11pm "what
            if we tried…" message.
          </p>
          <p>
            We build things that help you{' '}
            <strong>see more, know more, and do more</strong>. Consider this the
            front door — it's open, the kettle's on, and we're so glad you
            walked in.
          </p>
        </div>

        {/* 7. Cards */}
        <div className="wl-cards wl-reveal">
          <article className="wl-card">
            <div className="wl-no">NO. 01</div>
            <h3>Warmth first</h3>
            <p>
              Real people, real replies. You'll always know a human is on the
              other end.
            </p>
          </article>
          <article className="wl-card">
            <div className="wl-no">NO. 02</div>
            <h3>Craft, not corners</h3>
            <p>
              We sweat the details so the work feels considered — never rushed,
              never generic.
            </p>
          </article>
          <article className="wl-card">
            <div className="wl-no">NO. 03</div>
            <h3>In it together</h3>
            <p>
              Your wins are our wins. We're partners in this, not just a vendor
              on a list.
            </p>
          </article>
        </div>

        {/* 8. Signature */}
        <div className="wl-sign wl-reveal">
          <p className="wl-sign-lede">Here's to a great one together,</p>
          <p className="wl-signature">Sushanth</p>
          <p className="wl-sign-name">SUSHANTH K</p>
          <p className="wl-sign-role">Founder · Avlokai</p>
          <p className="wl-contact">sushanth@avlokai.com · avlokai.com</p>
        </div>

        {/* 9. Seal */}
        <div className="wl-seal" aria-hidden="true">
          <span className="wl-seal-brand">
            Avlok<em>Ai</em>
          </span>
          <span className="wl-seal-year">2026</span>
          <span className="wl-seal-tag">GLAD YOU'RE HERE</span>
        </div>

        {/* 10 + 11. Footer + CTA */}
        <footer className="wl-footer">
          <hr className="wl-rule" />
          <div className="wl-footer-row">
            <p className="wl-ps">
              <span>
                P.S. — seriously, <em>welcome aboard.</em>
              </span>
              <Sparkle size={18} aria-hidden="true" />
            </p>
            <div className="wl-footer-strip">WELCOME · AVLOKAI · 2026</div>
          </div>
          <Link to="/login" className="wl-cta">
            Enter your portal
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </footer>
      </div>
    </div>
  );
}
