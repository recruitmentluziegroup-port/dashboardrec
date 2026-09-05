# Admin Dashboard Revamp — Sidebar Mission Control (Option B)

> Status: **design approved** (all 5 sections signed off 2026-09-05). Pre-implementation.
> Scope: Home dashboard first; card/shell system ports to the other 4 admin tabs later.
> Reference: Lector-style dashboard (colorful gradient stat cards, big smooth area chart, bold donut, activity timeline + data table).

## 1. Goals / non-goals

Goals (user-ranked): **declutter** the Home dashboard, add **missing insights** (bottlenecks, per-position funnel, trends — all equal priority), and **polish** to a colorful, data-strong look tinted to the Luzie brand.
Non-goals: no new API routes (Vercel Hobby function budget is tight), no new npm deps, no Sheets schema change, no auth/routing changes, no public-portal changes.

## 2. Decisions (from brainstorming)

- Direction: **B. Sidebar Mission Control** over A (keep top nav) and C (subtle editorial polish).
- Color: **branded colorful** — gradients derived from existing `@theme` tokens (brand-700 `#C2410C`, navy `#1A1F2E`, amber, sage `#2D6A4F`, rose `#9B2226`), never the reference's pink/purple/blue.
- KPIs: 5 flat cards → **4 gradient cards**, merging `Menunggu Review` + `Sedang di Review` into one `Perlu Review` card (same bottleneck, was split in two).
- Shell choice delegated to designer ("you decide") → sidebar, because it frees horizontal room for the dense reference-style grid and becomes the shared shell for the full-admin rollout.

## 3. Current state (what exists)

- Shell + data: `src/components/AdminPanel.tsx` (sticky top nav, `viewMode`, `?tab=` deep-links, all fetches, notification list). Dashboard: `src/components/AdminDashboard.tsx` + `src/components/dashboard/` (`GreetingBar`, `RecruitmentFunnel`, `Sparkline`, `CountUp`, `AdminEmptyState`, `AdminSkeleton`, `AdminModal`). Tokens: `src/index.css` `@theme`.
- Data flow unchanged: `GET /api/admin/applications|vacancies|interviews` on mount; dashboard filters are client-side `useMemo` (`selectedMonth/selectedJob/selectedStatus` → `filteredApplicants`; `timeRange` for trend only).
- Known noise to kill: KPI deltas reading `-100% dari bulan lalu` on tiny denominators; funnel footer `950% dari total`; trend chart clipping at viewport bottom; three stacked rows (nav + greeting + filter) before any data.

## 4. Design

### 4.1 Shell: top nav → left sidebar (`AdminPanel.tsx`, `src/index.css`)

- 232px sidebar (collapsible to 72px icons), persisted in `localStorage` (`luzie_sidebar_collapsed_v1`): Luzie logo, nav items with icon + label + count badge (Daftar Pelamar `38`, Agenda `N hari ini`), active = brand-orange pill + left indicator.
- Slim contextual topbar: page title + Indonesian date, existing global search, Sheets sync pill (reuse `GreetingBar` sync logic), notif bell, admin avatar. Greeting line (`Selamat pagi, Admin`) shrinks to topbar subtitle — recovers one full row.
- Mobile: sidebar → bottom icon bar (5 tabs), topbar keeps search + bell. Pure Tailwind + `lucide-react`.
- Unchanged: routes, `?tab=` deep-links, auth (`luzie_admin_token` + `luzie_session` cookie), `viewMode` state machine.
- Full-admin payoff: sidebar + topbar become the shared shell; other tabs inherit polish without rework.

### 4.2 KPI gradient cards (AdminDashboard KPI row; reuse `CountUp`, `Sparkline`)

1. `Total Lamaran` — deep-orange gradient (`#C2410C → #EA580C`), bar sparkline.
2. `Perlu Review` — amber/gold gradient, area sparkline (merged Pending + Reviewed counts).
3. `Lolos Seleksi` — navy → slate gradient, line sparkline.
4. `Gugur Seleksi` — terracotta/rose gradient, bar sparkline.
- White text, serif number with `CountUp`, one-line `vs bulan lalu` delta pill that renders `data awal` when the denominator is 0 or <5 (honest-delta rule, kills the `-100%` noise). Click → Daftar Pelamar pre-filtered to that bucket.

### 4.3 Hero analytics row (replaces trend + gender cards; still `recharts`)

- Left (2/3): `Tren Lamaran` big smooth multi-series area chart with gradient fills (masuk = brand-orange, lolos = navy, gugur = muted rose), Daily/Weekly/Monthly toggle, reuse `ChartTooltip` navy card. Fixed 280px height in a responsive container (fixes viewport clip).
- Right (1/3): donut switches from gender-only to **pipeline mix** (Pending / Review / Interview / Diterima / Ditolak, center total) with a `Pipeline | Gender | Pendidikan` segmented toggle — one card, three insights, zero extra clutter. Gender zero-counts stay honest (show `0`, never hide).
- Palette: orange `#C2410C`, amber `#D97706`, navy `#1A1F2E`, sage `#2D6A4F`, rose `#9B2226`.

### 4.4 Action + insight row (new widgets in `src/components/dashboard/`, no new API)

- Left — `Butuh Tindakan` queue (reference's activity timeline): top 5 auto-ranked from already-fetched data (stuck >3 hari, duplikat KTP via existing health logic, interview hari ini). Row = avatar-initial, nama + posisi + days-waiting chip + `Tinjau` / `Jadwalkan` one-click. Empty state via `AdminEmptyState`: "Semua beres".
- Right — `Per-Posisi` conversion table (reference's order table): rows = active vacancies, columns = Masuk / Review / Interview / Diterima + conversion bar (`Diterima ÷ Masuk`), default-sort conversion ascending. Click row → Treker/Daftar filtered by title. Replaces the confusing `950% dari total` line with true conversion.
- Shared header pattern: `title serif 15px + subtitle 12px + Lihat semua →`.

### 4.5 Tokens, responsive, rollout

- One card system in `@theme`: `rounded-2xl border bg-white`, single shadow + radius; gradient border reserved for KPI cards; `berkas-stripe` stays on white cards only. Keep `Playfair Display` for numbers/titles, `Plus Jakarta Sans` elsewhere, tabular-nums in tables. Keep `CountUp` + `dashboard-stagger`; honor `prefers-reduced-motion`.
- Breakpoints: ≥1280 full 12-col grid; 768–1280 sidebar 72px, KPI 2×2, hero stacks; <768 bottom-bar nav, KPI horizontal scroll-snap, tables → cards (existing mobile patterns in `AdminPanel`).
- Filters: existing `Filter & Kustomisasi` (month/job/status) keeps driving every widget through the `filteredApplicants` memo; no filter-logic rewrite.
- Rollout (each slice shippable, `npm run lint` after each): ① shell (sidebar + topbar) → ② KPI cards → ③ hero + donut → ④ action + table → ⑤ port card system to Daftar Pelamar / Treker / Agenda.

## 5. Data & edge cases

- Zero new endpoints, zero new localStorage keys except `luzie_sidebar_collapsed_v1`; funnel key `luzie_funnel_expanded_v1` untouched.
- Honest deltas: denominator 0 or <5 → `data awal` chip, no % shown. Conversion = `Diterima ÷ Masuk` per position; division by zero → `—`.
- Empty states: every new widget uses `AdminEmptyState`; skeletons reuse `AdminSkeleton` (no layout shift).
- A11y: sidebar `nav` landmark + `aria-current`, KPI cards as links with names, charts keep `aria-label`s, 44px touch targets, visible focus ring.

## 6. Constraints

- `api/` stays at 10 functions (Hobby 12-limit, 2 headroom) — client-side only.
- No new deps (`recharts`, `lucide-react`, `motion` already installed).
- Sheets is the sole DB; 62-col layout and tab names untouched.
- `server.ts` is local-dev only — mirror any fetch change in `api/` equivalents.

## 7. Open items

None blocking. Deferred to implementation: exact gradient stops against real data density; sidebar collapse default on 768–1280px (propose: collapsed); whether `RecruitmentFunnel` stays as a third row or folds into the donut card (propose: keep, collapsed by default).
