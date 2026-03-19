/**
 * BookScroll — Cloudflare Worker API Proxy
 *
 * Keeps your Anthropic API key secret on the server side.
 * Deploy with: wrangler deploy
 *
 * Setup:
 *   1. npm install -g wrangler
 *   2. wrangler login
 *   3. wrangler secret put ANTHROPIC_API_KEY   (paste your key when prompted)
 *   4. wrangler deploy
 *   5. Copy the worker URL → add as API_PROXY_URL secret in your GitHub repo
 */

const ALLOWED_ORIGINS = [
  // Replace with your actual GitHub Pages URL, e.g.:
  // "https://yourusername.github.io",
  // "https://yourcustomdomain.com",
  "*", // ← remove this and uncomment above lines for production security
]

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin)
  return {
    "Access-Control-Allow-Origin": allowed ? (origin || "*") : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || ""
    const url = new URL(request.url)

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    // Only allow POST to /api/messages
    if (request.method !== "POST" || url.pathname !== "/api/messages") {
      return new Response("Not found", { status: 404, headers: corsHeaders(origin) })
    }

    try {
      const body = await request.json()

      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "web-search-2025-03-05",  // needed for web_search tool
        },
        body: JSON.stringify(body),
      })

      const data = await anthropicRes.json()

      return new Response(JSON.stringify(data), {
        status: anthropicRes.status,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(origin),
        },
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: { message: err.message } }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      })
    }
  },
}
