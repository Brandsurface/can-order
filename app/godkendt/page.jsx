export default function GodkendtPage({ searchParams }) {
  const isError = !!searchParams?.error
  const isAlready = searchParams?.already === '1'

  const heading = isError
    ? 'Noget gik galt'
    : isAlready
      ? 'Allerede godkendt'
      : 'Ordre godkendt!'

  const body = isError
    ? 'Vi kunne ikke behandle din godkendelse. Prøv igen, eller kontakt Brandsurface direkte.'
    : isAlready
      ? 'Denne ordre er allerede godkendt og videresendt til Brandsurface.'
      : 'Tak — din bestilling er bekræftet og videresendt til Brandsurface. Vi kontakter dig snarest med næste skridt.'

  const iconColor = isError ? '#f87171' : '#4ade80'
  const iconBg = isError ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)'
  const iconBorder = isError ? 'rgba(248,113,113,0.25)' : 'rgba(74,222,128,0.25)'

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #46473e 0%, #0e0a00 100%)',
      backgroundAttachment: 'fixed',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Manrope', -apple-system, sans-serif",
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: iconBg, border: `1px solid ${iconBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
        }}>
          {isError ? (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
          ) : (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          )}
        </div>

        <h1 style={{
          color: iconColor, fontSize: 32, fontWeight: 800,
          letterSpacing: '-0.02em', margin: '0 0 14px',
        }}>{heading}</h1>

        <p style={{ color: '#b8b4ae', fontSize: 16, lineHeight: 1.6, margin: 0 }}>
          {body}
        </p>

        <a href="/" style={{
          display: 'inline-block', marginTop: 36, padding: '12px 24px',
          color: '#b8b4ae', fontSize: 14, textDecoration: 'none',
          fontFamily: 'inherit',
        }}>
          ← Lav ny bestilling
        </a>
      </div>
    </main>
  )
}
