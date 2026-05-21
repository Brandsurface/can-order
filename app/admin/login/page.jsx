export const dynamic = 'force-dynamic'

const ERRORS = {
  '1': 'Wrong email or password.',
  server: 'Something went wrong. Please try again.',
  config: 'Admin session secret is not configured (ADMIN_SESSION_SECRET).',
}

export default function AdminLogin({ searchParams }) {
  const error = searchParams?.error ? (ERRORS[searchParams.error] || ERRORS['1']) : null
  const next = typeof searchParams?.next === 'string' ? searchParams.next : '/admin'

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg,#2a2820 0%,#0e0a00 60%)', padding: 24,
      fontFamily: "'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
      color: '#f0ede8',
    }}>
      <div style={{
        width: '100%', maxWidth: 380, background: '#1e1d1a', border: '1px solid #4a4640',
        borderRadius: 22, padding: 32,
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#f1562e', marginBottom: 24 }}>
          brandsurface
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Admin login</h1>
        <p style={{ fontSize: 13, color: '#b8b4ae', margin: '0 0 22px', lineHeight: 1.5 }}>
          First time? The password you enter will be set as your password.
        </p>

        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
            color: '#f87171', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16,
          }}>{error}</div>
        )}

        <form method="POST" action="/api/admin/login" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input type="hidden" name="next" value={next} />
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#b8b4ae' }}>Email</span>
            <input name="email" type="email" required autoComplete="username" placeholder="you@brandsurface.dk"
              style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#b8b4ae' }}>Password</span>
            <input name="password" type="password" required autoComplete="current-password" placeholder="••••••••"
              style={inputStyle} />
          </label>
          <button type="submit" style={{
            marginTop: 6, padding: '13px 24px', background: '#f1562e', color: '#fff', border: 'none',
            borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>Log in</button>
        </form>
      </div>
    </div>
  )
}

const inputStyle = {
  background: '#242220', border: '1px solid #4a4640', borderRadius: 10, padding: '12px 14px',
  color: '#f0ede8', fontSize: 14, fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box',
}
