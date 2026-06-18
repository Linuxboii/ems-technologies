export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--color-border)',
      padding: '40px 24px',
      position: 'relative',
      zIndex: 1,
    }}>
      <div className="page-container" style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', fontWeight: 500, marginBottom: 6, maxWidth: 'none' }}>
          Built by AvlokAI
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 400, maxWidth: 'none' }}>
          © 2026 AvlokAI Client Portal. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
