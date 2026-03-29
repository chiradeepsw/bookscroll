# 📚 BookScroll — Project Backup & Reference
_Complete conversation summary, architecture, decisions, fixes and next steps_

---

## 1. What This Project Is

**BookScroll** is a social-media-style book knowledge app. Users scroll vertically through 4 "concept cards" per book — each card has a key concept, 3 sub-ideas, and a tap-to-reveal real-world example. Content is fetched live from the web using the Anthropic Claude API (with web search), structured into JSON, and rendered as a beautiful dark editorial UI.

**Live URL:** `https://chiradeepsw.github.io/bookscroll/`
**GitHub Repo:** `https://github.com/chiradeepsw/bookscroll`

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite (single `App.jsx`) |
| Styling | Inline styles, Google Fonts (Playfair Display + DM Sans) |
| AI / Content | Anthropic Claude API (`claude-sonnet-4-20250514`) with `web_search` tool |
| Book Covers | Open Library Search API → Covers API |
| API Proxy | Cloudflare Worker (keeps API key server-side) |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions (auto-deploy on push to `main`) |

---

## 3. Architecture Diagram

```
User Browser (GitHub Pages)
        │
        │  POST /api/messages
        ▼
Cloudflare Worker (bookscroll-api.chiradeepsw.workers.dev)
        │  holds ANTHROPIC_API_KEY as a Wrangler secret
        │  POST /v1/messages + x-api-key header
        ▼
Anthropic API (claude-sonnet-4-20250514 + web_search tool)
        │
        │  returns structured JSON with 4 concept cards
        ▼
React App renders SwipeReader with vertical scroll-snap cards
```

---

## 4. Project File Structure

```
bookscroll/                        ← React frontend (push this to GitHub)
├── src/
│   ├── App.jsx                    ← entire app (single file, ~920 lines)
│   └── main.jsx                   ← React entry: renders <App /> into #root
├── public/
│   └── 404.html                   ← SPA redirect fix for GitHub Pages
├── .github/
│   └── workflows/
│       └── deploy.yml             ← CI/CD: builds + deploys on push to main
├── index.html                     ← HTML shell, loads src/main.jsx
├── vite.config.js                 ← sets base: '/bookscroll/' for GH Pages
├── package.json                   ← dependencies: react, react-dom, vite
├── .env.example                   ← template for local env vars
└── .gitignore

bookscroll-worker/                 ← Cloudflare Worker (deploy separately)
├── worker.js                      ← proxy logic, CORS, rate limiting
├── wrangler.toml                  ← Worker config + KV namespace ref
└── package.json                   ← devDep: wrangler
```

---

## 5. Key Files Explained

### `src/App.jsx` — the entire frontend
Key sections in order:
- `ALL_BOOKS` — catalog of 40 books with title, author, accent color
- `CARD_THEMES` — 4 color themes cycling across concept cards
- `LOADING_FACTS` — cycling messages shown during API load
- `SYSTEM_PROMPT` — instructs Claude to return exactly 4 JSON cards
- `fetchCoverId()` — calls Open Library search API to get a `cover_i` ID
- `coverSrcFromId()` — converts cover_i to an image URL
- `fetchBookSummary()` — calls Anthropic (or proxy), parses JSON response
- `SmartCover` — component: shimmer skeleton → real cover → emoji fallback
- `LoadingScreen` — animated screen: floating cover + spinning ring + progress bar
- `ConceptCard` — one full-screen snap card (concept + sub-ideas + example)
- `SwipeReader` — vertical scroll-snap container for all 4 cards + finish card
- `BookRow` — single row in the home library list
- `HomeScreen` — search bar + paginated book list (20 per page)
- `App` (default export) — root state machine: home → loading → reading → error

### `worker.js` — Cloudflare Worker proxy
- Validates `Origin` header against `ALLOWED_ORIGINS` allowlist
- Handles CORS preflight (`OPTIONS`)
- Optional per-IP rate limiting via Cloudflare KV (`RATE_LIMITER` namespace)
- Sanitises request body (strips injected keys, caps `max_tokens` at 4000)
- Forwards to Anthropic with `env.ANTHROPIC_API_KEY` (never exposed to browser)
- Health check: `GET /health` → `{ status: "ok" }`

### `deploy.yml` — GitHub Actions
- Triggers on push to `main`
- Reads `API_PROXY_URL` from GitHub repo secret → injects as `VITE_API_PROXY_URL`
- Runs `npm ci` + `npm run build` → uploads `dist/` to GitHub Pages

---

## 6. Environment Variables

### Frontend (`bookscroll/.env.local` for local dev)
| Variable | Purpose |
|----------|---------|
| `VITE_API_PROXY_URL` | Your Cloudflare Worker URL (recommended, key stays server-side) |
| `VITE_ANTHROPIC_API_KEY` | Direct key in bundle (personal/private use only) |

### GitHub Repo Secrets (Settings → Secrets → Actions)
| Secret | Value |
|--------|-------|
| `API_PROXY_URL` | `https://bookscroll-api.chiradeepsw.workers.dev` |

### Cloudflare Worker Secrets (set via `wrangler secret put`)
| Secret | Value |
|--------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` from console.anthropic.com |

---

## 7. API Data Contract

### Request (sent to Anthropic via Worker)
```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1500,
  "system": "<SYSTEM_PROMPT>",
  "tools": [{ "type": "web_search_20250305", "name": "web_search" }],
  "messages": [{ "role": "user", "content": "Extract key knowledge from: \"Atomic Habits\" by James Clear" }]
}
```

### Response JSON shape (parsed from Claude's text output)
```json
{
  "title": "Atomic Habits",
  "author": "James Clear",
  "tagline": "Tiny changes, remarkable results.",
  "cards": [
    {
      "concept": "The 1% Rule",
      "icon": "📈",
      "summary": "Getting 1% better every day compounds into dramatic improvement over time.",
      "subConcepts": [
        "Small habits compound just like financial interest.",
        "Most people overestimate one-time events and underestimate daily habits.",
        "A 1% improvement daily leads to 37x better results in a year."
      ],
      "example": "A swimmer who shaves 0.1 seconds off each stroke ends up minutes faster per race."
    }
  ]
}
```

---

## 8. Conversation Checkpoints & Decisions

### Checkpoint 1 — Initial Build
**What was built:** HomeScreen with 8 books, horizontal left/right swipe reader, Claude API integration, basic emoji placeholders for covers, caching with `window.storage`.

**Key decisions:**
- Single-file React app (no routing, no Redux — keep it simple)
- Dark editorial aesthetic: Playfair Display + DM Sans fonts, gold accent
- `window.storage` for caching loaded summaries across sessions

---

### Checkpoint 2 — UX Improvements
**Problems fixed:**
- Horizontal swipe replaced with **vertical scroll-snap** (more natural on mobile)
- Book covers not showing → switched from hardcoded OLIDs to **Open Library search API** (`/search.json?q=title+author → cover_i`)
- Search was broken (custom book CTA hidden conditionally) → always shown when typing 3+ chars
- Added **pagination** (20 books per page, "Load more" button)
- Catalog expanded from 8 → **40 books**

**Key decision:** OLIDs (Open Library edition IDs) were unreliable because they were hardcoded wrong. Dynamic lookup by title+author is always accurate and works for any custom book too.

---

### Checkpoint 3 — Polish
**Problems fixed:**
- Content cut off at bottom of cards → changed `height: 100vh` + `overflow: hidden` to `minHeight: 100vh` + inner scrollable div
- Loading screen was just dots → replaced with **full animated screen**: floating cover, spinning conic-gradient ring, ambient glow blobs, animated progress bar, cycling wisdom messages, particle dots
- `SmartCover` component: shimmer skeleton while fetching, emoji fallback on error, shared in-memory cache

---

### Checkpoint 4 — Deployment
**Stack chosen:** GitHub Pages (free static hosting) + Cloudflare Worker (free API proxy)

**Why Cloudflare Worker:** GitHub Pages is static-only — it can't hold secrets. The Worker acts as a secure middleman so the Anthropic API key never appears in the browser's JS bundle.

**Files created:**
- `vite.config.js` — sets `base: '/bookscroll/'` so assets load correctly on GH Pages
- `.github/workflows/deploy.yml` — CI/CD pipeline
- `bookscroll-worker/worker.js` — hardened proxy with CORS, rate limiting, sanitisation
- `public/404.html` — SPA redirect hack (GH Pages returns 404 for unknown paths; this redirects back to index)

---

### Checkpoint 5 — Bugs Fixed During Deploy

**Bug 1: `npm not found`**
- Cause: Node.js not installed
- Fix: Install from nodejs.org (LTS version)

**Bug 2: `xcrun: incompatible architecture` (macOS)**
- Cause: Xcode Command Line Tools were x86_64 but Mac is Apple Silicon (arm64)
- Fix:
  ```bash
  sudo rm -rf /Library/Developer/CommandLineTools
  xcode-select --install
  ```

**Bug 3: GitHub password rejected**
- Cause: GitHub removed password auth in 2021
- Fix: Create Personal Access Token at github.com/settings/tokens with `repo` + `workflow` scopes, use token as password

**Bug 4: `refusing to allow PAT to update workflow` on push**
- Cause: Token was missing `workflow` scope
- Fix: Edit token, check `workflow` scope, regenerate

**Bug 5: `Dependencies lock file not found` in GitHub Actions**
- Cause: `package-lock.json` was missing from the repo
- Fix:
  ```bash
  npm install   # generates package-lock.json
  git add package-lock.json
  git commit -m "Add package-lock.json"
  git push
  ```

**Bug 6: `Your credit balance is too low`**
- Cause: Anthropic API account had no credits (separate from Claude.ai subscription)
- Fix: Add credits at console.anthropic.com/billing, then update the Worker with a fresh API key:
  ```bash
  npx wrangler secret put ANTHROPIC_API_KEY
  npx wrangler deploy
  ```

**Bug 7: `Expected ',' or ']' after array element in JSON at position 4302`**
- Cause: Claude's response sometimes wrapped JSON in markdown fences or had trailing text, breaking `JSON.parse(text.match(/\{[\s\S]*\}/)[0])`
- Fix: Replaced regex with a **brace-depth walker** that finds the true outermost `{}` block, plus a salvage attempt for truncated arrays:
  ```js
  function extractJSON(str) {
    const start = str.indexOf("{");
    if (start === -1) return null;
    let depth = 0;
    for (let i = start; i < str.length; i++) {
      if (str[i] === "{") depth++;
      else if (str[i] === "}") { depth--; if (depth === 0) return str.slice(start, i + 1); }
    }
    return null;
  }
  ```

---

### Checkpoint 6 — Switching to Gemini (optional, not yet deployed)
Key differences from Anthropic:
- Different request shape: `{ contents: [{ parts: [{ text: prompt }] }] }`
- Different response shape: `data.candidates[0].content.parts[0].text`
- No built-in web search tool (use `tools: [{ googleSearch: {} }]` with `gemini-2.0-flash` for grounding)
- Auth via query param: `?key=YOUR_GEMINI_KEY` instead of `x-api-key` header
- Get key at: aistudio.google.com/apikey

---

## 9. Deploy Runbook (Quick Reference)

### First-time deploy
```bash
# 1. Deploy Worker
cd bookscroll-worker
npm install
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler deploy
# → note the Worker URL

# 2. Edit worker.js ALLOWED_ORIGINS → add "https://chiradeepsw.github.io"
npx wrangler deploy

# 3. Push frontend
cd bookscroll
npm install                    # generates package-lock.json
git init && git add . && git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/chiradeepsw/bookscroll.git
git push -u origin main        # use PAT (with repo + workflow scopes) as password

# 4. GitHub repo settings
# → Settings → Pages → Source → GitHub Actions
# → Settings → Secrets → Actions → New secret
#    Name: API_PROXY_URL  Value: https://bookscroll-api.chiradeepsw.workers.dev

# 5. Trigger deploy
# → Actions → Deploy to GitHub Pages → Run workflow
# Live at: https://chiradeepsw.github.io/bookscroll/
```

### Subsequent deploys (any code change)
```bash
git add .
git commit -m "describe change"
git push
# GitHub Actions auto-deploys in ~60 seconds
```

### Update API key
```bash
cd bookscroll-worker
npx wrangler secret put ANTHROPIC_API_KEY   # paste new key
npx wrangler deploy
```

---

## 10. Planned Next Features (Batch 5)

| Feature | Notes |
|---------|-------|
| Mark books as "Read" | Store in `window.storage`, show badge on BookRow |
| Recently read section | Pull from storage, show at top of HomeScreen |
| Genre filter tabs | Add `genre` field to `ALL_BOOKS`, filter buttons below search |
| Share card as image | Use `html2canvas` to screenshot a ConceptCard |
| Onboarding animation | First-visit modal explaining swipe gesture |

---

## 11. Useful Links

| Resource | URL |
|----------|-----|
| Live app | https://chiradeepsw.github.io/bookscroll/ |
| GitHub repo | https://github.com/chiradeepsw/bookscroll |
| Cloudflare Workers dashboard | https://dash.cloudflare.com |
| Anthropic API console | https://console.anthropic.com |
| Anthropic billing | https://console.anthropic.com/settings/billing |
| GitHub PAT settings | https://github.com/settings/tokens |
| Open Library API docs | https://openlibrary.org/developers/api |
| Gemini API keys | https://aistudio.google.com/apikey |

---

_Document created: March 2026 | Project: BookScroll v1.0_
