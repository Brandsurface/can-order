import fs from 'fs'
import path from 'path'

export default function Home() {
  const filePath = path.join(process.cwd(), 'app', 'page.html')
  const html = fs.readFileSync(filePath, 'utf-8')

  // Hent <head>-indhold (alt mellem <head> og </head>, eksklusiv selve tags)
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  const headContent = headMatch ? headMatch[1] : ''

  // Hent <body>-indhold
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyContent = bodyMatch ? bodyMatch[1] : html

  // Indsæt head-indhold direkte i <head> via next/script er ikke nødvendigt;
  // i stedet inkluderer vi det hele i body. Next.js håndterer styles fint.
  // Vi sætter alt body-indholdet ind med dangerouslySetInnerHTML.
  // Head-stiler/fonts kommer med fordi de er i samme HTML-stream.

  const combined = headContent + bodyContent

  return <div dangerouslySetInnerHTML={{ __html: combined }} />
}
