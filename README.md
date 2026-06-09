# Brand Surface Bestillingssystem

Komplet bestillings- og godkendelsesflow med database og mail.

## Tech stack

- **Next.js 14** (App Router) — frontend + serverless API routes
- **Supabase** — PostgreSQL database til ordrer
- **Resend** — transactional mail (kun afsendelse)
- **Vercel** — hosting

## Mail-flow

```
Kunde udfylder formularen
  ↓ POST /api/order
Ordre gemmes i Supabase (status: pending)
  ↓ Resend
Kunde modtager bekræftelsesmail med Godkend / Fortryd knapper
  ↓
  ├── Godkend → /api/confirm → status: confirmed
  │              → Resend sender mail til Brand Surface
  │              → kunde redirectes til /godkendt
  │
  └── Fortryd → /api/cancel → status: cancelled
                 → kunde redirectes til /?edit=<ordre-id>
                 → formularen genindlæses med alle data
                 → kunde retter og sender igen (revision +1)
```

---

## Setup — trin for trin

### 1. Supabase

1. Log ind på [supabase.com](https://supabase.com) → opret nyt projekt (gratis tier er rigeligt)
2. SQL Editor → New query → indsæt indholdet af `supabase-schema.sql` → Run
3. Settings → API → kopier:
   - **Project URL** → bruges som `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role** secret (under "Project API keys") → bruges som `SUPABASE_SERVICE_ROLE_KEY`

### 2. Resend

1. Log ind på [resend.com](https://resend.com)
2. **API Keys** → Create → vælg **Sending access** (IKKE Full access) → kopier nøglen
3. (Senere) **Domains** → tilføj `brandsurface.dk` → tilføj de DNS-records Resend viser
4. Indtil domænet er verificeret kan du sende fra `onboarding@resend.dev`

### 3. Push til GitHub

```bash
cd brandsurface-bestilling
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DIN-ORG/DIT-REPO.git
git push -u origin main
```

### 4. Deploy på Vercel

1. [vercel.com](https://vercel.com) → New Project → importér GitHub repoet
2. Framework Preset detekteres automatisk som **Next.js**
3. Under **Environment Variables** tilføj alle fra `.env.example`:

| Navn | Værdi |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Fra Supabase Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Fra Supabase Settings → API (service_role) |
| `RESEND_API_KEY` | Fra Resend API Keys |
| `RESEND_FROM` | `onboarding@resend.dev` (indtil dit domæne er verificeret) |
| `BRANDSURFACE_EMAIL` | `ls@brandsurface.dk` |
| `NEXT_PUBLIC_BASE_URL` | `https://DIN-APP.vercel.app` (sættes efter første deploy) |

4. Deploy

### 5. Efter første deploy

Sæt `NEXT_PUBLIC_BASE_URL` til den faktiske Vercel-URL og redeploy.

---

## Lokal udvikling

```bash
npm install
cp .env.example .env.local
# udfyld .env.local
npm run dev
```

Åbn `http://localhost:3000`

---

## Projektstruktur

```
brandsurface-bestilling/
├── app/
│   ├── api/
│   │   ├── order/route.js          POST  → opret ordre + send kunde-mail
│   │   ├── confirm/route.js        GET   → godkend, mail til Brand Surface
│   │   ├── cancel/route.js         GET   → fortryd, redirect til formular
│   │   └── order-data/route.js     GET   → hent ordre-data til prefill
│   ├── godkendt/page.jsx           Side efter godkendelse
│   ├── layout.jsx                  Root layout
│   ├── page.jsx                    Forside (serverer HTML formularen)
│   └── page.html                   Selve bestillingsformularen
├── lib/
│   ├── supabase.js                 Supabase server-klient
│   └── emails.js                   Mail-templates (kunde + Brand Surface)
├── supabase-schema.sql             Kør i Supabase SQL Editor
├── .env.example                    Skabelon for environment variables
├── jsconfig.json                   @/ path alias
├── next.config.js
├── package.json
└── README.md
```
