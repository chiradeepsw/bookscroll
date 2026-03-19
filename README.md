# 📚 BookScroll

Scroll through book wisdom like social media — key concepts from the best books, one swipe at a time.

Built with React + Vite. Deployed on GitHub Pages. API calls proxied through a Cloudflare Worker so your Anthropic key is never exposed in the browser.

---

## Architecture

```
Browser (GitHub Pages)
    │  POST /api/messages
    ▼
Cloudflare Worker          ← your ANTHROPIC_API_KEY lives here only
    │  POST /v1/messages
    ▼
Anthropic API
```

---

## 🚀 Full deploy guide

### Step 1 — Deploy the Cloudflare Worker (≈ 5 min)

You need Node.js installed. Run these commands in the `bookscroll-worker/` folder:

```bash
cd bookscroll-worker
npm install

# Log in to Cloudflare (opens browser)
npx wrangler login

# Store your Anthropic key as a secret (never written to disk)
npx wrangler secret put ANTHROPIC_API_KEY
# → Paste your sk-ant-... key and press Enter

# Deploy the worker
npx wrangler deploy
```

You'll see output like:
```
Published bookscroll-api (0.25 sec)
  https://bookscroll-api.YOUR_NAME.workers.dev
```

**Copy that URL** — you'll need it in Step 3.

#### Optional: enable rate limiting (recommended for public sites)

```bash
# Create the KV namespace
npx wrangler kv namespace create RATE_LIMITER
# → Outputs: id = "abc123..."

# Paste that id into wrangler.toml — uncomment the [[kv_namespaces]] block
# Then redeploy:
npx wrangler deploy
```

---

### Step 2 — Configure the Worker's allowed origins

Edit `bookscroll-worker/worker.js` and replace the placeholder with your GitHub Pages URL:

```js
const ALLOWED_ORIGINS = [
  "https://YOUR_USERNAME.github.io",   // ← your real URL
  "http://localhost:5173",
  "http://localhost:4173",
]
```

Redeploy: `npx wrangler deploy`

---

### Step 3 — Push the frontend to GitHub Pages

```bash
cd bookscroll          # the React app folder
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bookscroll.git
git push -u origin main
```

In your GitHub repo:
1. **Settings → Pages → Source → GitHub Actions**
2. **Settings → Secrets and variables → Actions → New repository secret**
   - Name:  `API_PROXY_URL`
   - Value: `https://bookscroll-api.YOUR_NAME.workers.dev`

Push any commit → GitHub Actions builds and deploys automatically.

Your app will be live at:
```
https://YOUR_USERNAME.github.io/bookscroll/
```

---

## 💻 Local development

```bash
cd bookscroll
npm install

cp .env.example .env.local
# Edit .env.local and set VITE_API_PROXY_URL to your Worker URL

npm run dev
# → http://localhost:5173
```

The local Vite dev server already has the Worker URL in your `.env.local`, so local calls go through your deployed Worker — no local Worker process needed.

If you want to run the Worker locally too:
```bash
cd bookscroll-worker
npx wrangler dev   # → http://localhost:8787
```
Then set `VITE_API_PROXY_URL=http://localhost:8787` in `.env.local`.

---

## 📁 Project structure

```
bookscroll/                  ← React frontend
├── src/
│   ├── App.jsx
│   └── main.jsx
├── public/
│   └── 404.html             ← SPA redirect fix for GitHub Pages
├── .github/workflows/
│   └── deploy.yml           ← CI/CD: auto-deploy on push to main
├── vite.config.js
├── index.html
├── package.json
└── .env.example

bookscroll-worker/           ← Cloudflare Worker proxy
├── worker.js                ← proxy logic + rate limiting + CORS
├── wrangler.toml
└── package.json
```

---

## ✏️ Customisation

| What | Where |
|------|-------|
| GitHub repo name | `REPO_NAME` in `bookscroll/vite.config.js` |
| Add more books | `ALL_BOOKS` array in `src/App.jsx` |
| Custom domain | Set `base: '/'` in `vite.config.js`, add `CNAME` file to `public/` |
| Rate limit settings | `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_S` in `worker.js` |
| Allowed origins | `ALLOWED_ORIGINS` in `worker.js` |
