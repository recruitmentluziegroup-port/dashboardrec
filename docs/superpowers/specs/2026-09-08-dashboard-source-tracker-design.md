# Dashboard Collapse + Applicant Source Analytics + Treker Posisi Metrics — Design

> Date: 2026-09-08
> Status: Approved in brainstorming session (user sign-off on all sections)
> Scope: Form question, Sheets schema extension (62→64 cols), dashboard collapse region, 2 source widgets, 4 tracker widgets, admin/CSV/print/PDF parity.

## Goals

1. Dashboard gets a collapse/show button (default **shown/open**), mirroring the RecruitmentFunnel toggle pattern.
2. New required form question **"Dapat informasi lowongan ini dari mana?"** with a fixed taxonomy and conditional detail field.
3. New dashboard metrics: source volume, source-to-hire quality, and 4 Treker Posisi–based metrics.
4. Full parity: admin detail view, CSV export, browser print, PDF.
5. All existing dashboard widgets are **kept**; page length is managed by the collapsible analytics region.

## 0. Manual Google Sheets migration (owner action, before deploy)

**Which tab**: the applicant data lives in the **first (leftmost) tab** of the spreadsheet — the tab whose rows start with `ID | Tanggal | Status | ...` (62 columns, A–BJ). It is dynamically detected at runtime as the first tab, whatever its name is. It is **NOT** the `Trackers`, `Vacancies`, or `Interviews` tabs.

`ensureHeaders()` only writes headers when a sheet is empty, so this tab needs a **one-time manual header addition**:

| Cell | Write exactly | Purpose |
|---|---|---|
| **BK1** | `Sumber Info Lowongan` | Controlled source value |
| **BL1** | `Keterangan Sumber` | Referrer name / "other" detail |

Rules:
- **Append only.** Never insert columns before BJ — that shifts every positional index and breaks `api/status.ts` (KTP index 13, position index 36).
- **Do not backfill historical rows.** Blank BK/BL on old rows displays as "Belum tercatat".
- Verify BK/BL are unused by formulas, scripts, or external tooling before writing.
- **Trackers tab: no changes.** It auto-creates via `ensureTrackerTab` (12 cols A–L) and already exists.
- Rollback: deleting BK1/BL1 contents is safe (code treats missing values as blank).

**Stable taxonomy (stored values — never renamed after launch; display labels may change later):**

```
Instagram
TikTok
LinkedIn
JobStreet
Glints/Portal Lain
Google/Website Luzie
WhatsApp/Grup Komunitas
Teman/Keluarga/Karyawan Luzie
Kampus/Job Fair
Lainnya
```

## 1. Form question — Step 7 (Ekspektasi & Kesehatan)

**Placement**: end of Step 7, after "Alamat Media Sosial".

- `sumberInfoLowongan` — required single-select, native `<select>`, options = taxonomy above, styled per existing select fields.
- `keteranganSumber` — conditional text input shown **only** when source is:
  - `Teman/Keluarga/Karyawan Luzie` → placeholder "Nama yang mereferensikan"
  - `Lainnya` → placeholder "Sebutkan sumber lainnya"
  - Optional, max 100 chars, trimmed on submit. Changing source to a non-warranting value clears it.

**Validation**:
- New `FIELD_RULES` entry (required) + key added to Step 7's `STEP_KEYS`. Error text: "Pilih sumber informasi lowongan."
- Old drafts: `useFormDraft` load merges saved draft over `DEFAULT_FORM_STATE` (no schema bump) so resuming a v1 draft yields `''` for source instead of crashing / uncontrolled select.

**Files**: `src/types.ts` (add fields + export `SUMBER_OPTIONS` const), `src/components/FormWizard.tsx`, `src/hooks/useFormDraft.ts`.

## 2. API validation (mirrored in both runtimes)

`server.ts` (local) + `api/applications.ts` (Vercel):
- Non-empty `sumberInfoLowongan` not in `SUMBER_OPTIONS` → **400 reject** (trim + exact match).
- Missing/empty → **tolerated during rollout window** (~2 weeks for stale open tabs), then flip to reject. Ship tolerant check + `// ponytail: flip to required after rollout window (~2026-09-22)` marker.
- `keteranganSumber` present without a warranting source → 400. Over 100 chars → 400.

## 3. Sheets serialization — `src/lib/sheets.ts`

- `HEADERS`: append `Sumber Info Lowongan`, `Keterangan Sumber` → 64 columns.
- `applicantToRow`: push source (index 62) + keterangan (63) last.
- `rowToApplicant`: read `[62]`/`[63]` with `''` fallback (short historical rows → blank).
- Reads already span `A2:ZZ` — BK/BL covered without range changes.
- Admin PATCH (`updateRow`) serializes the whole applicant → source survives admin edits.
- `api/status.ts` untouched (reads A:BJ only; source not exposed publicly).
- `AGENTS.md` fixed-column doc updated 62 → 64 as part of implementation.

## 4. Dashboard collapse — one analytics region

`src/components/AdminDashboard.tsx`, pattern copied from `RecruitmentFunnel.tsx` / `src/index.css:162-183`:

- Wraps everything below the KPI row: funnel, trend, position chart, source widgets, tracker widgets, latest table, gender, education, schedule.
- Header row: "Analitik & Aktivitas" + toggle button ("Sembunyikan Analitik" / "Tampilkan Analitik"), chevron, `aria-expanded` + `aria-controls` on stable region id, ≥44px touch target.
- Animation: `.funnel-collapse` CSS (`grid-template-rows: 0fr→1fr` + opacity, ~200ms); `prefers-reduced-motion` disables it.
- Persistence: `luzie_dashboard_collapsed_v1` = `{_v:1, collapsed:boolean}`, default **open** (dashboard shown by default per requirement).
- Collapsed state keeps: GreetingBar, filter card, KPI gradient cards, plus one muted summary line ("N widget analitik disembunyikan").
- Toggle renders even in dashboard empty-state.

## 5. New dashboard widgets (client-side `useMemo`; no new APIs)

AdminPanel passes `trackers` (already fetched) to AdminDashboard as a prop, same convention as `pipelineCounts`.

### a. Sumber Pelamar (volume)
Horizontal BarChart, descending; count + % labels always visible (never tooltip-only). Categories: taxonomy values + **"Belum tercatat"**; top 7, remainder grouped as "Lainnya" (bucket, kept separate from "Belum tercatat"). Respects month/position/status filters via `filteredApplicants`.

### b. Kualitas Sumber (source-to-hire)
Per-source rows: Diterima count, total count, acceptance rate. Rate hidden until n≥3 (shows "n=2" placeholder) to avoid misleading small-sample percentages. "Belum tercatat" row included honestly.

### c. Headcount gap summary (KPI strip)
Open reqs · Target headcount (Σ `jumlah`, Open) · Slots remaining (Σ jumlah − Accepted per position, floor 0). Compact strip under the KPI row (inside analytics region).

### d. Kuota per Posisi
Progress bars: Accepted ÷ `jumlah`; over-quota amber warning; sorted by remaining slots.

### e. Aging Posisi
Per Open tracker: days open (`today − tanggalDibuka`), overdue deadline (`tanggalTerakhir` past, red), On-Hold flag; sorted oldest first.

### f. Fill rate & speed
Closed-Filled vs Closed-Unfilled ratio + average days-to-fill (`tanggalSelesai − tanggalDibuka`).

Tracker widgets render `AdminEmptyState` while the Trackers tab has no rows (current production state).

**Layout order inside the region**: funnel → trend → position chart → source volume → source quality → headcount strip + quota → aging → fill rate → latest table → gender → education → schedule.

## 6. Admin surfaces

- **Detail view** (`AdminPanel.tsx`, Step 7 tab): "Sumber Info Lowongan" + "Keterangan" labels beside media sosial.
- **CSV export** (`AdminPanel.tsx:552-576`): new `Sumber` column after Status.
- **Print** (`PrintableDetail.tsx`, Step 7 section) + **PDF** (`src/lib/pdf.tsx`): one "Sumber Info Lowongan: X — keterangan" line.

## 7. Accepted risks / limitations

- **Title-string join**: tracker metrics join on lowercase title ↔ applicant position; a tracker titled differently from applicant strings silently gets zero counts. Inherited from existing tracker behavior; accepted.
- **Snapshot statuses**: source-to-hire uses current status counts, not true application cohorts. Accepted; a true cohort funnel is separate future work.
- **Funnel semantics** (pre-existing): "masuk" = Pending count, not total. Out of scope here.
- **Month filter** compares month number only (pre-existing). Out of scope.

## 8. Out of scope

- UTM/campaign auto-attribution.
- Multi-select sources.
- Tracker↔vacancy↔applicant ID linkage (fuzzy join stays).
- Renaming funnel semantics or month/year filter fix.
