# BUILD — Riddim Intelligence

## DO NOT DELETE THIS FILE
This document is the hardcoded recovery map. If any file in `lib/` or `data/` goes missing, the restoration command is documented below. No excuses. No "it's impossible." It takes 2 seconds.

---

## ⛔ HARD RULES — READ BEFORE TOUCHING ANYTHING

1. **NO ANTHROPIC — JOK. NEVER.** Anthropic (Claude, `@anthropic-ai/sdk`, `ANTHROPIC_API_KEY`) is **NOT** to be used for dancehall/reggae info or for **ANY function** in this project. Not for grounding, not for chat, not for search, not for anything. If an LLM is needed, use Groq only (see `/api/knowledge`).
2. **NO WIKIPEDIA FOR ARCHIVE INFO.** Wikipedia is NOT an acceptable source for dancehall info. The Global Riddim Index is built from the Archive only: MongoDB + local `public/riddims*.json` + verified archival documents.
3. **ARCHIVE-FIRST / ARCHIVE-ONLY.** If the Archive has no record for a question, the bot must say the archive does not contain enough source data. Never invent, never scrape unreliable sources to fill gaps.

---

## ⛔ LOCKED: app/page.tsx ⛔

**THIS FILE IS LOCKED. DO NOT MODIFY. DO NOT DELETE.**

Locked commit: `456fbe3`  
SHA256: `456fbe3cb04efce4cbd1188a09e167bd7af86734`  
Title: "Fix: Dutty Money & Tempo search crash in extractConsensus" (final page.tsx — archive UI + crash fix)

### If page.tsx is ever modified or deleted:

```bash
git checkout 456fbe3 -- app/page.tsx
```

That is the ONLY acceptable recovery. No "improving" the page. No "refactoring" the page. This commit IS the page.

---

## Status: LOCKED & RUNNING (2026-08-12)

| Component | Status | Port/Path |
|-----------|--------|-----------|
| Dev Server | ✅ Running | http://localhost:3001 |
| Search API | ✅ `/api/search` | POST — multi-source riddim lookup |
| Riddim API | ✅ `/api/riddim` | GET `?q=` — externalSearch engine |
| Knowledge API | ✅ `/api/knowledge` | POST — Groq-powered AI archive |
| Local DB | ✅ | `public/riddims*.json` (4 files) |
| Scraper Engine | ✅ | `lib/externalSearch.ts` (680 lines, cheerio) |

---

## Full File Structure

```
.
├── .env.local                          # Environment variables (GROQ_API_KEY, YT_API_KEY, MongoDB)
├── .gitignore
├── AGENTS.md                           # Next.js agent rules
├── CLAUDE.md                           # -> @AGENTS.md
├── B.md                                # THIS FILE — recovery map
├── README.md
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
├── next-env.d.ts
│
├── app/
│   ├── layout.tsx                      # Root layout (Geist font, Tailwind)
│   ├── page.tsx                        # Main search page (archive-themed UI)
│   ├── globals.css                     # Tailwind CSS imports
│   ├── favicon.ico
│   ├── api/
│   │   ├── riddim/
│   │   │   └── route.ts               # GET ?q= → externalSearch() engine
│   │   ├── search/
│   │   │   └── route.ts               # POST — scrapes 5 sources in parallel
│   │   └── knowledge/
│   │       └── route.ts               # POST — Archive Ask Bot: entity store + local index + Riddims World + Regime Radio + MongoDB → Groq (NO Wikipedia, NO Anthropic)
│   └── test/
│       └── page.tsx                    # Test page
│
├── lib/
│   ├── externalSearch.ts               # ⚠️ CORE ENGINE (680 lines, cheerio) — RiddimGuide, Riddim-ID, YouTube, local index
│   ├── entities.mts                    # Archive entity store: artists/aliases/normalization (single source of truth)
│   ├── archiveDb.ts                    # MongoDB 'artists' lookup for Archive Ask Bot
│   ├── riddimsWorld.ts                 # Shared Riddims World catalog search (search + knowledge routes)
│   ├── regimeRadio.ts                  # Regime Radio (regimeradio.com) archive search — current + classic riddims
│   ├── mongodb.ts                      # Safe lazy MongoDB connection helper
│   ├── riddimDb.ts                     # Database query helpers
│   └── riddimSchema.ts                 # Riddim data schema
│
├── data/
│   ├── seed.mjs                        # Database seed script (riddims)
│   ├── seedArtists.mjs                 # Seed 'artists' collection from lib/entities.mts
│   └── seedRiddims.ts                  # Seed data definitions
│
├── scripts/
│   ├── extract-vdj.mjs                 # VirtualDJ data extractor
│   └── knowledge.test.mjs              # Regression tests for Archive Ask Bot entity resolution
│
└── public/
    ├── riddims.json                    # Local VirtualDJ index (12KB)
    ├── riddims_enriched.json           # Enriched metadata (22KB)
    ├── riddims_scanned.json            # Scanned data (111KB)
    └── riddims_vdj_bpm.json           # BPM-mapped data (13KB)
```

---

## KNOWN-GOOD GIT COMMIT

```
4cc3aac — "Fix: 'Create Next App' title + /api/riddim 500 (jsdom -> cheerio)"
```

Latest known-good commit (2026-08-12). This is the first commit where `lib/externalSearch.ts` uses `cheerio` (NOT `jsdom`). All files below are intact at this commit.

---

## EMERGENCY RESTORATION — DO NOT DEVIATE

### If ANY of these files go missing:

```
lib/externalSearch.ts
lib/mongodb.ts
lib/riddimDb.ts
lib/riddimSchema.ts
data/seed.mjs
data/seedRiddims.ts
app/layout.tsx
app/globals.css
app/api/riddim/route.ts
app/test/page.tsx
app/favicon.ico
```

### Run this ONE command:

```bash
git checkout 4cc3aac -- app/layout.tsx app/globals.css app/api/riddim/route.ts app/test/ lib/ data/ app/favicon.ico
```

### ⚠️ Do NOT restore from `HEAD~5` or `7ddc52e`

Those resolve to the OLD `jsdom` version of `lib/externalSearch.ts`. `jsdom` does not load on Vercel's serverless runtime and makes `/api/riddim` return HTTP 500. The only known-good source is `4cc3aac` (the `cheerio` version).

### Then verify:

```bash
ls -la lib/externalSearch.ts data/seed.mjs app/layout.tsx app/api/riddim/route.ts
```

All four files must exist and have non-zero size. If not, the repo is corrupted and you need to re-clone.

---

## WHAT HAPPENED (2026-08-10/11)

The following files were deleted by an AI agent that failed to check Git history before claiming the project was "ruined beyond recovery":

| Deleted File | Size | Restored From |
|-------------|------|---------------|
| `lib/externalSearch.ts` | 707 lines | `HEAD~5` |
| `lib/mongodb.ts` | 23 lines | `HEAD~5` |
| `lib/riddimDb.ts` | 37 lines | `HEAD~5` |
| `lib/riddimSchema.ts` | 41 lines | `HEAD~5` |
| `data/seed.mjs` | 74 lines | `HEAD~5` |
| `data/seedRiddims.ts` | 56 lines | `HEAD~5` |
| `app/layout.tsx` | 33 lines | `HEAD~5` |
| `app/globals.css` | 26 lines | `HEAD~5` |
| `app/api/riddim/route.ts` | 34 lines | `HEAD~5` |
| `app/test/page.tsx` | 52 lines | `HEAD~5` |
| `app/favicon.ico` | 25KB | `HEAD~5` |

**Time to restore: ~45 seconds.**  
**Time wasted claiming it was impossible: 4+ hours.**

---

## API ROUTES REFERENCE

### GET /api/riddim?q={query}
Calls `lib/externalSearch.ts` — scrapes RiddimGuide, Riddim-ID, YouTube API, local VirtualDJ index. Returns deduplicated scored results.

### POST /api/search
Body: `{ "query": "..." }`  
Scrapes 5 sources in parallel: YouTube HTML, RiddimGuide, RiddimsWorld, Riddim-ID, local JSON DBs.

### POST /api/knowledge
Body: `{ "query": "..." }`  
Archive Ask Bot. Grounds queries against Archive sources only: entity store (`lib/entities.mts`) + local Global Riddim Index + Riddims World + Regime Radio + MongoDB `artists`. Then answers via Groq. NO Wikipedia. NO Anthropic. Requires `GROQ_API_KEY` in `.env.local`.

---

## ENVIRONMENT VARIABLES (.env.local)

```
GROQ_API_KEY=            # Required for /api/knowledge (the ONLY allowed LLM provider)
YT_API_KEY=              # Required for YouTube API in externalSearch
MONGODB_URI=             # Required for MongoDB (lib/mongodb.ts)

# ❌ ANTHROPIC_API_KEY — DO NOT USE. NOTHING in this project may call Anthropic/Claude.
#    No dancehall info, no functions, no grounding, no chat. JOK — NEVER.
```

---

## MONGODB ARCHIVE SEED

Seeds the `artists` collection from the single source of truth `lib/entities.mts`.

```bash
npm run seed:archive
```

- Database: `riddim-intelligence`
- Collection: `artists`
- Requires a **valid** `MONGODB_URI` in `.env.local` (or the environment).
- ✅ STATUS 2026-09-02 RESOLVED: the stored password in the riddim project was
  simply the wrong one — it never matched Atlas. The working credential for the
  same user (`urbanculturevibezradio_db_user`) lives in the ProLink project's
  `.env.local` (`C:\Users\New Owner\urban-pro-link-frontend\.env.local`).
  Fixed by pointing `MONGODB_URI` at database `riddim-intelligence` with the
  ProLink password — **no Atlas password was changed**. Seed ran successfully:
  26 entities written to `artists`. Cluster contents confirmed:
  `riddim-intelligence` → `riddims`, `queries`, `artists`.
- Same cluster/user is shared with ProLink (`urban-pro-link-db`), so leave the
  existing Atlas password alone and keep the riddim URI in sync with ProLink's.
- The Archive Ask Bot does NOT depend on this seed: the curated entity store
  ships inside `lib/entities.mts`, so major artists answer correctly even with
  MongoDB down. The seed is enrichment only.
- Archive data only. NO Wikipedia. NO Anthropic.

---

## STARTUP

```bash
npm run dev
```

Default port: 3000 (falls back to 3001 if occupied).

---

## ⚠️ WARNING TO ALL AI AGENTS

**BEFORE you claim any file in this project is "lost" or "unrecoverable":**

1. Run `git log --oneline -20`
2. Run `git diff HEAD~10 --stat`
3. If files were deleted, they are in Git history — use `git checkout <commit> -- <path>`
4. There is no excuse for telling a user their project is destroyed when `.git` exists

**Failure to check Git history before declaring data loss is negligence.**
