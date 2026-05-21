export const metadata = {
  title: 'Order print materials — Brandsurface',
  description: 'Online ordering of print materials from Brandsurface',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
