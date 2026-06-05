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

## Subagent Workflow

For **every** task (planning, building, editing, or refactoring) without exception:

1. **Explore first** — dispatch the `explore` subagent to map relevant files,
   existing patterns, and conventions before touching code. This is required
   even for single-line edits.
2. **Dispatch specialists** — based on the explore findings, dispatch the
   appropriate specialty subagents in parallel where possible:
   - Frontend / React / UI work → `frontend-developer`, `react-specialist`,
     `ui-designer`, `ui-ux-pro-max`
   - Backend / API / Sheets work → `backend-developer`, `fullstack-developer`
   - Database / Sheets schema work → `data-engineer`, `database-administrator`
   - Deployment / CI work → `deployment-engineer`
   - Security-sensitive work → `security-engineer`
3. **Synthesize** — review the subagent outputs, reconcile conflicts, and
   present a unified plan before executing edits.

Do not skip the explore step, even when the change feels trivial. Skipping
explore is a process violation.

## Environment

Copy `.env.example` to `.env` and fill in:

- `GOOGLE_SHEET_ID` — the Google Sheet ID
- `GOOGLE_SERVICE_ACCOUNT_KEY` — the **entire JSON** of the service account key (accepts raw JSON or base64-encoded form)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET` — admin auth
- `GEMINI_API_KEY` — for Gemini AI features
- `DISABLE_HMR` — when `"true"`, Vite disables HMR and file watching (used by AI Studio during agent edits to prevent flickering)

## Vercel serverless import quirk

Serverless functions under `api/` that import from `src/lib/` must use the `.js` extension (e.g. `../../src/lib/sheets.js`). This is required by Vercel's Node.js module resolution at runtime.

Vacancies Vercel functions (`api/admin/vacancies.ts`, `api/vacancies.ts`) are self-contained — all Google Sheets REST logic is inlined using `jsonwebtoken` + `fetch` with no imports from `src/lib/`.

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
| `src/lib/` | Shared libraries: `sheets.ts` (Google Sheets CRUD, server.ts only), `pdf.tsx` (React-PDF document) |
| `src/data/` | `vacancies.json` — local fallback vacancy data |
| `api/` | Vercel serverless API routes |
| `api/auth/` | Login, logout, session check |
| `api/admin/` | Protected admin endpoints (applications CRUD, vacancies, PDF export) |

## Frontend conventions

- React 19 + React Router v7 + Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- Lucide React icons (`lucide-react`)
- `motion` library for animations
- `recharts` for dashboard charts
- `@react-pdf/renderer` for server-side PDF generation
- Auth token stored in `localStorage` as `luzie_admin_token`; session cookie is `luzie_session`

## Progress Tracking

- A `progress.md` file at the project root is the **single source of truth**
  for what changed in the project, session by session.
- The file is **gitignored** (local-only, not committed to the repo).
- After every change (add, edit, removal) within a session, append a new
  entry to `progress.md` **before** finishing the task.
- Format: session-grouped, newest session on top. See the file's header
  comment for the exact template.

### progress.md template

```md
# Progress Log

> Append-only session log. Newest session on top. Do not edit past entries.

## Session YYYY-MM-DD

### Added
- `<file/path>` — short description

### Changed
- `<file:line>` — short description

### Removed
- `<file/path>` — short description
```


