export const metadata = {
  title: 'Bestil tryksager — Brandsurface',
  description: 'Online bestilling af tryksager hos Brandsurface',
}

export default function RootLayout({ children }) {
  return (
    <html lang="da">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
