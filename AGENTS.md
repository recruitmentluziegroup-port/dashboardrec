# AGENTS.md

## Architecture

Two run modes sharing one codebase:

- **Local dev** (`npm run dev`): Express monolith (`server.ts`) mounts Vite middleware for HMR. All API routes defined inline in `server.ts`.
- **Production** (Vercel): Serverless functions in `api/` handle APIs. Static SPA served from `dist/`. `server.ts` is **not used** in production.

Google Sheets is the sole database. No SQL/NoSQL.

## Commands

```sh
npm run dev      # local dev (Express + Vite HMR on port 3000)
npm run build    # vite build + esbuild server.ts -> dist/server.cjs
npm run start    # node dist/server.cjs (production, non-Vercel)
npm run lint     # tsc --noEmit only (no ESLint in this repo)
```

There are **no test scripts**.

## Environment

Copy `.env.example` to `.env` and fill in:

- `GOOGLE_SHEET_ID` — the Google Sheet ID
- `GOOGLE_SERVICE_ACCOUNT_KEY` — the **entire JSON** of the service account key (accepts raw JSON or base64-encoded form)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET` — admin auth
- `GEMINI_API_KEY` — for Gemini AI features
- `DISABLE_HMR` — when `"true"`, Vite disables HMR and file watching (used by AI Studio during agent edits to prevent flickering)

## Duplicated sheets.ts

`src/lib/sheets.ts` and `api/_lib/sheets.ts` are **identical copies**. Both must be kept in sync.

When editing Google Sheets logic, update **both files**. Vercel serverless functions import from `../../src/lib/sheets.js` but `api/_lib/sheets.ts` exists as a fallback/backup.

## Vercel serverless import quirk

Serverless functions under `api/` import from `../../src/lib/sheets.js` (with `.js` extension despite being `.ts` source). This is required by Vercel's Node.js module resolution at runtime. Do not remove the `.js` extension.

## TypeScript

- Path alias: `@/*` maps to `./*` (root of project)
- `allowImportingTsExtensions: true` and `noEmit: true`
- Module resolution: `bundler`
- JSX: `react-jsx`

## Google Sheets conventions

- Column layout is fixed at 62 columns (defined in `HEADERS` array in `sheets.ts`). Array-type fields (anak, saudara, pendidikanFormal, etc.) are stored as JSON strings.
- The first sheet tab name is dynamically detected at runtime and cached. Do not hardcode `Sheet1`.
- Vacancies are stored in a separate `Vacancies` tab in the same Google Sheet. Local dev fallback reads/writes `src/data/vacancies.json`.
- The Sheets auth client is a module-level singleton — reused across calls for efficiency.

## Key directories

| Directory | Purpose |
|-----------|---------|
| `src/` | React frontend (Vite + React 19 + Tailwind v4) |
| `src/components/` | Page/feature components: `FormWizard`, `AdminPanel`, `AdminDashboard`, `VacancyManager` |
| `src/lib/` | Shared libraries: `sheets.ts` (Google Sheets CRUD), `pdf.tsx` (React-PDF document) |
| `src/data/` | `vacancies.json` — local fallback vacancy data |
| `api/` | Vercel serverless API routes |
| `api/_lib/` | Duplicate of `src/lib/sheets.ts` |
| `api/auth/` | Login, logout, session check |
| `api/admin/` | Protected admin endpoints (applications CRUD, vacancies, PDF export) |

## Frontend conventions

- React 19 + React Router v7 + Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- Lucide React icons (`lucide-react`)
- `motion` library for animations
- `recharts` for dashboard charts
- `@react-pdf/renderer` for server-side PDF generation
- Auth token stored in `localStorage` as `luzie_admin_token`; session cookie is `luzie_session`

## Additional Informations 

- Do not make the changes until we shared the sane perception about how this web app we both wanted it
- Use subagents if you can to minimize the work but the result is must to be as good as possible
- Use skills that related to the task/discussion
