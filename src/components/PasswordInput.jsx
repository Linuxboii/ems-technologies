import { useState } from 'react';

export default function PasswordInput({ value, onChange, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        {...props}
        style={{
          width: '100%', padding: '10px 64px 10px 12px', borderRadius: 8,
          border: '1px solid var(--color-border)', fontSize: 14,
        }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted, #666)',
        }}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
