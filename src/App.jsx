import { useState, useRef, useEffect, useCallback } from "react";

// ─── Book Catalog — covers fetched dynamically via Open Library search ────────
const ALL_BOOKS = [
  { title: "Atomic Habits", author: "James Clear", color: "#E8A020" },
  { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", color: "#5B8CFF" },
  { title: "The Psychology of Money", author: "Morgan Housel", color: "#4CAF8A" },
  { title: "Sapiens", author: "Yuval Noah Harari", color: "#E05C5C" },
  { title: "Deep Work", author: "Cal Newport", color: "#9B59B6" },
  { title: "The 7 Habits of Highly Effective People", author: "Stephen Covey", color: "#F39C12" },
  { title: "Man's Search for Meaning", author: "Viktor Frankl", color: "#1ABC9C" },
  { title: "The Power of Now", author: "Eckhart Tolle", color: "#E74C3C" },
  { title: "Meditations", author: "Marcus Aurelius", color: "#8E44AD" },
  { title: "The Lean Startup", author: "Eric Ries", color: "#27AE60" },
  { title: "Zero to One", author: "Peter Thiel", color: "#2980B9" },
  { title: "The Alchemist", author: "Paulo Coelho", color: "#D35400" },
  { title: "Rich Dad Poor Dad", author: "Robert Kiyosaki", color: "#C0392B" },
  { title: "How to Win Friends and Influence People", author: "Dale Carnegie", color: "#16A085" },
  { title: "The Four Agreements", author: "Don Miguel Ruiz", color: "#8E44AD" },
  { title: "Daring Greatly", author: "Brené Brown", color: "#E67E22" },
  { title: "Start With Why", author: "Simon Sinek", color: "#3498DB" },
  { title: "The Subtle Art of Not Giving a F*ck", author: "Mark Manson", color: "#E74C3C" },
  { title: "Thinking in Systems", author: "Donella Meadows", color: "#1ABC9C" },
  { title: "Essentialism", author: "Greg McKeown", color: "#2ECC71" },
  { title: "The 48 Laws of Power", author: "Robert Greene", color: "#C0392B" },
  { title: "Flow", author: "Mihaly Csikszentmihalyi", color: "#8E44AD" },
  { title: "Mindset", author: "Carol Dweck", color: "#E8A020" },
  { title: "The Body Keeps the Score", author: "Bessel van der Kolk", color: "#2980B9" },
  { title: "Grit", author: "Angela Duckworth", color: "#27AE60" },
  { title: "Drive", author: "Daniel Pink", color: "#D35400" },
  { title: "Outliers", author: "Malcolm Gladwell", color: "#16A085" },
  { title: "The Tipping Point", author: "Malcolm Gladwell", color: "#F39C12" },
  { title: "Blink", author: "Malcolm Gladwell", color: "#5B8CFF" },
  { title: "Dare to Lead", author: "Brené Brown", color: "#E05C5C" },
  { title: "Good to Great", author: "Jim Collins", color: "#4CAF8A" },
  { title: "Never Split the Difference", author: "Chris Voss", color: "#E8A020" },
  { title: "The Checklist Manifesto", author: "Atul Gawande", color: "#1ABC9C" },
  { title: "Thinking in Bets", author: "Annie Duke", color: "#E74C3C" },
  { title: "The Art of Thinking Clearly", author: "Rolf Dobelli", color: "#3498DB" },
  { title: "The War of Art", author: "Steven Pressfield", color: "#D35400" },
  { title: "Big Magic", author: "Elizabeth Gilbert", color: "#E67E22" },
  { title: "The E-Myth Revisited", author: "Michael Gerber", color: "#27AE60" },
  { title: "Influence", author: "Robert Cialdini", color: "#9B59B6" },
  { title: "Antifragile", author: "Nassim Nicholas Taleb", color: "#C0392B" },
];

const PAGE_SIZE = 20;

const CARD_THEMES = [
  { bg: "linear-gradient(160deg, #0d1b2a 0%, #1b2838 100%)", accent: "#E8A020", dim: "rgba(232,160,32,0.1)" },
  { bg: "linear-gradient(160deg, #0a1628 0%, #0f2040 100%)", accent: "#5B8CFF", dim: "rgba(91,140,255,0.1)" },
  { bg: "linear-gradient(160deg, #0d1f12 0%, #102318 100%)", accent: "#4CAF8A", dim: "rgba(76,175,138,0.1)" },
  { bg: "linear-gradient(160deg, #200a0a 0%, #2a0f0f 100%)", accent: "#E05C5C", dim: "rgba(224,92,92,0.1)" },
];

const LOADING_FACTS = [
  "Searching the web for key insights…",
  "Distilling the core concepts…",
  "Extracting actionable wisdom…",
  "Crafting your knowledge cards…",
  "Almost ready to scroll…",
];

const SYSTEM_PROMPT = `You are a book knowledge extractor. Search the web for the summary and key ideas of the given book, then return ONLY a valid JSON object. No markdown code fences, no explanation text, just the raw JSON starting with { and ending with }.

Use this exact structure:
{
  "title": "Book Title",
  "author": "Author Name",
  "tagline": "One punchy sentence capturing the book's core message",
  "cards": [
    {
      "concept": "Short Concept Title",
      "icon": "single emoji",
      "summary": "2-3 sentences explaining this concept clearly.",
      "subConcepts": [
        "Sub-idea one in one clear sentence.",
        "Sub-idea two in one clear sentence.",
        "Sub-idea three in one clear sentence."
      ],
      "example": "A specific real-world example illustrating this concept in 2-3 sentences."
    }
  ]
}

Return exactly 4 cards covering distinct key concepts. Be specific and concrete. Output ONLY the JSON object.`;

// ─── Cover image via Open Library search API ──────────────────────────────────
// Fetches the cover ID by searching title+author, then uses covers.openlibrary.org
const coverCache = {};
async function fetchCoverId(title, author) {
  const key = `${title}::${author}`;
  if (coverCache[key] !== undefined) return coverCache[key];
  try {
    const q = encodeURIComponent(`${title} ${author}`);
    const res = await fetch(`https://openlibrary.org/search.json?q=${q}&fields=cover_i,title&limit=1`);
    const data = await res.json();
    const coverId = data?.docs?.[0]?.cover_i || null;
    coverCache[key] = coverId;
    return coverId;
  } catch {
    coverCache[key] = null;
    return null;
  }
}

function coverSrcFromId(coverId, size = "M") {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

// ─── API ──────────────────────────────────────────────────────────────────────
// Priority:
//   1. VITE_API_PROXY_URL      → Cloudflare Worker proxy (key stays server-side ✅)
//   2. VITE_ANTHROPIC_API_KEY  → direct call (key in JS bundle ⚠️ personal use only)
//   3. Neither                 → bare call (works in Claude artifact sandbox)
async function fetchBookSummary(title, author) {
  const proxyUrl = import.meta.env?.VITE_API_PROXY_URL;
  const apiKey   = import.meta.env?.VITE_ANTHROPIC_API_KEY;

  let endpoint, headers;
  if (proxyUrl) {
    endpoint = `${proxyUrl}/api/messages`;
    headers  = { "Content-Type": "application/json" };
  } else if (apiKey) {
    endpoint = "https://api.anthropic.com/v1/messages";
    headers  = { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
  } else {
    endpoint = "https://api.anthropic.com/v1/messages";
    headers  = { "Content-Type": "application/json" };
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: `Extract key knowledge from: "${title}" by ${author}` }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "API error");
  const text = (data.content || []).map(b => b.type === "text" ? b.text : "").filter(Boolean).join("");
  if (!text) throw new Error("Empty response from API");

  // Robust extractor: walk brace depth to find the outermost { } block.
  // Avoids the greedy-regex truncation bug that causes "Unexpected token" errors.
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

  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
  const jsonStr = extractJSON(cleaned);
  if (!jsonStr) throw new Error("Could not find JSON in response");

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // Salvage attempt: strip any trailing incomplete element then close the structure
    const salvaged = jsonStr.replace(/,\s*[\[\{][^\]\}]*$/, "") + "]}";
    try { return JSON.parse(salvaged); }
    catch { throw new Error("Failed to parse response: " + e.message); }
  }
}

// ─── SmartCover: fetches cover dynamically, shows placeholder while loading ───
function SmartCover({ title, author, color, width, height, borderRadius = 6, style = {} }) {
  const [src, setSrc] = useState(null);      // null=loading, false=failed, string=url
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setImgFailed(false);
    fetchCoverId(title, author).then(coverId => {
      if (cancelled) return;
      if (coverId) setSrc(coverSrcFromId(coverId));
      else setSrc(false);
    });
    return () => { cancelled = true; };
  }, [title, author]);

  const placeholderStyle = {
    width, height, borderRadius,
    background: `linear-gradient(135deg, ${color}55 0%, ${color}18 100%)`,
    border: `1px solid ${color}44`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: Math.round(height * 0.3), flexShrink: 0,
    boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
    ...style
  };

  if (src === null) {
    // Loading skeleton shimmer
    return (
      <div style={{
        width, height, borderRadius, flexShrink: 0,
        background: `linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%)`,
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        ...style
      }}>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      </div>
    );
  }

  if (src === false || imgFailed) {
    return <div style={placeholderStyle}>📖</div>;
  }

  return (
    <img
      src={src}
      alt={title}
      onError={() => setImgFailed(true)}
      style={{
        width, height, borderRadius, objectFit: "cover", flexShrink: 0,
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        display: "block",
        ...style
      }}
    />
  );
}

// ─── LoadingScreen — rich animated experience ─────────────────────────────────
function LoadingScreen({ book }) {
  const [factIdx, setFactIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [coverSrc, setCoverSrc] = useState(null);
  const [coverFailed, setCoverFailed] = useState(false);

  // Cycle through loading facts
  useEffect(() => {
    const t = setInterval(() => setFactIdx(i => (i + 1) % LOADING_FACTS.length), 2200);
    return () => clearInterval(t);
  }, []);

  // Animate progress bar (fake, just for feel)
  useEffect(() => {
    let val = 0;
    const t = setInterval(() => {
      // Fast at first, then slow down as it approaches 90%
      val += val < 40 ? 3 : val < 70 ? 1.2 : val < 88 ? 0.4 : 0;
      setProgress(Math.min(val, 90));
    }, 180);
    return () => clearInterval(t);
  }, []);

  // Fetch cover
  useEffect(() => {
    fetchCoverId(book.title, book.author).then(id => {
      if (id) setCoverSrc(coverSrcFromId(id, "L"));
      else setCoverSrc(false);
    });
  }, [book]);

  const accentColor = book.color || "#E8A020";

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "radial-gradient(ellipse at 50% 40%, #0f1e30 0%, #080c14 70%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 0, overflow: "hidden",
      fontFamily: "'DM Sans', sans-serif", color: "white",
    }}>
      {/* Ambient colour blobs */}
      <div style={{
        position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)",
        width: 360, height: 360, borderRadius: "50%",
        background: accentColor, opacity: 0.07, filter: "blur(90px)",
        animation: "blobPulse 4s ease-in-out infinite", pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", bottom: "10%", right: "10%",
        width: 200, height: 200, borderRadius: "50%",
        background: "#5B8CFF", opacity: 0.05, filter: "blur(60px)",
        animation: "blobPulse 5s ease-in-out 1s infinite", pointerEvents: "none"
      }} />

      {/* Book cover with 3D float + glow */}
      <div style={{
        position: "relative", marginBottom: 36,
        animation: "bookFloat 3.5s ease-in-out infinite"
      }}>
        {/* Glow beneath book */}
        <div style={{
          position: "absolute", bottom: -18, left: "50%", transform: "translateX(-50%)",
          width: 90, height: 18, borderRadius: "50%",
          background: accentColor, opacity: 0.25, filter: "blur(14px)",
          animation: "shadowPulse 3.5s ease-in-out infinite"
        }} />

        {coverSrc === null ? (
          // Shimmer while fetching cover
          <div style={{
            width: 120, height: 178, borderRadius: 10,
            background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.04) 75%)",
            backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
            boxShadow: `0 20px 50px rgba(0,0,0,0.7), 0 0 40px ${accentColor}22`
          }} />
        ) : coverSrc === false || coverFailed ? (
          <div style={{
            width: 120, height: 178, borderRadius: 10,
            background: `linear-gradient(145deg, ${accentColor}55, ${accentColor}11)`,
            border: `1px solid ${accentColor}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 52, boxShadow: `0 20px 50px rgba(0,0,0,0.6), 0 0 40px ${accentColor}30`
          }}>📖</div>
        ) : (
          <img src={coverSrc} alt={book.title} onError={() => setCoverFailed(true)}
            style={{
              width: 120, height: 178, objectFit: "cover", borderRadius: 10, display: "block",
              boxShadow: `0 20px 50px rgba(0,0,0,0.7), 0 0 50px ${accentColor}30`
            }} />
        )}

        {/* Spinning ring around cover */}
        <div style={{
          position: "absolute", inset: -10,
          borderRadius: 18,
          border: `2px solid transparent`,
          background: `linear-gradient(#080c14, #080c14) padding-box, conic-gradient(from 0deg, ${accentColor}, transparent 60%, ${accentColor}) border-box`,
          animation: "spinRing 3s linear infinite",
          pointerEvents: "none"
        }} />
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 28, zIndex: 1 }}>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 22, fontWeight: 700, marginBottom: 6,
          maxWidth: 280, lineHeight: 1.3
        }}>{book.title}</div>
        <div style={{ color: "#777", fontSize: 14 }}>by {book.author}</div>
      </div>

      {/* Progress bar */}
      <div style={{
        width: 220, height: 3, background: "rgba(255,255,255,0.08)",
        borderRadius: 2, marginBottom: 16, overflow: "hidden", zIndex: 1
      }}>
        <div style={{
          height: "100%", borderRadius: 2,
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${accentColor}aa, ${accentColor})`,
          transition: "width 0.18s ease",
          boxShadow: `0 0 8px ${accentColor}80`
        }} />
      </div>

      {/* Cycling fact text */}
      <div key={factIdx} style={{
        fontSize: 13, color: "#555", zIndex: 1, letterSpacing: 0.3,
        animation: "factFade 0.5s ease"
      }}>
        {LOADING_FACTS[factIdx]}
      </div>

      {/* Particle dots */}
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: 4 + (i % 3) * 2, height: 4 + (i % 3) * 2,
          borderRadius: "50%",
          background: accentColor,
          opacity: 0.25,
          top: `${20 + i * 13}%`,
          left: `${8 + i * 14}%`,
          animation: `particleDrift ${3 + i * 0.7}s ease-in-out ${i * 0.4}s infinite alternate`
        }} />
      ))}

      <style>{`
        @keyframes bookFloat{0%,100%{transform:translateY(0) rotateY(0deg)}50%{transform:translateY(-14px) rotateY(4deg)}}
        @keyframes shadowPulse{0%,100%{opacity:0.25;transform:translateX(-50%) scaleX(1)}50%{opacity:0.12;transform:translateX(-50%) scaleX(0.7)}}
        @keyframes spinRing{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes blobPulse{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.15)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes particleDrift{0%{transform:translateY(0) scale(1)}100%{transform:translateY(-20px) scale(1.4)}}
        @keyframes factFade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  );
}

// ─── ConceptCard ──────────────────────────────────────────────────────────────
// Uses minHeight + overflow-y:auto so nothing gets clipped on short screens
function ConceptCard({ card, index, total, theme }) {
  const [showEx, setShowEx] = useState(false);

  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      background: theme.bg,
      display: "flex",
      flexDirection: "column",
      scrollSnapAlign: "start",
      position: "relative",
      overflow: "hidden",
      boxSizing: "border-box",
    }}>
      {/* Ambient glow blobs */}
      <div style={{
        position: "absolute", top: -80, right: -80, width: 300, height: 300,
        borderRadius: "50%", background: theme.accent, opacity: 0.055,
        filter: "blur(70px)", pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", bottom: -50, left: -50, width: 180, height: 180,
        borderRadius: "50%", background: theme.accent, opacity: 0.04,
        filter: "blur(50px)", pointerEvents: "none"
      }} />

      {/* Top accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${theme.accent}, transparent)`, flexShrink: 0 }} />

      {/* Progress indicator */}
      <div style={{
        padding: "14px 22px 0", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <span style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 10,
          letterSpacing: 3, color: "rgba(255,255,255,0.3)", fontWeight: 700
        }}>CONCEPT {index + 1} / {total}</span>
        <div style={{ display: "flex", gap: 5 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              height: 3, width: i === index ? 22 : 6, borderRadius: 2,
              background: i === index ? theme.accent : "rgba(255,255,255,0.18)",
              transition: "width 0.3s"
            }} />
          ))}
        </div>
      </div>

      {/* ── Scrollable inner body ── */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "20px 22px 32px",
        display: "flex", flexDirection: "column", gap: 0,
        // Hide scrollbar visually but still scrollable
        scrollbarWidth: "none",
      }}>
        {/* Icon */}
        <div style={{
          width: 58, height: 58, borderRadius: 16,
          background: theme.dim, border: `1px solid ${theme.accent}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, marginBottom: 16, flexShrink: 0
        }}>{card.icon}</div>

        {/* Concept title */}
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 700,
          color: "white", margin: "0 0 10px", lineHeight: 1.25, flexShrink: 0
        }}>{card.concept}</h2>

        {/* Summary */}
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 14,
          color: "rgba(255,255,255,0.58)", lineHeight: 1.75,
          margin: "0 0 20px", flexShrink: 0
        }}>{card.summary}</p>

        {/* Sub-concepts */}
        <div style={{ marginBottom: 20, flexShrink: 0 }}>
          <div style={{
            fontSize: 10, letterSpacing: 3.5, color: theme.accent,
            fontFamily: "'DM Sans', sans-serif", fontWeight: 700, marginBottom: 10
          }}>KEY IDEAS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(card.subConcepts || []).map((sub, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                background: "rgba(255,255,255,0.045)", borderRadius: 10,
                padding: "11px 13px", borderLeft: `2px solid ${theme.accent}55`
              }}>
                <span style={{ color: theme.accent, fontSize: 11, marginTop: 3, flexShrink: 0 }}>▸</span>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13.5,
                  color: "rgba(255,255,255,0.78)", lineHeight: 1.6
                }}>{sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Example toggle — always visible, never cut */}
        <div style={{ flexShrink: 0 }}>
          <button onClick={() => setShowEx(v => !v)} style={{
            width: "100%",
            background: showEx ? theme.accent : "rgba(255,255,255,0.06)",
            border: `1px solid ${showEx ? theme.accent : "rgba(255,255,255,0.12)"}`,
            borderRadius: 12, padding: "12px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            cursor: "pointer", transition: "all 0.22s",
            color: showEx ? "#000" : "white"
          }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600 }}>
              💡 {showEx ? "Hide Example" : "Real-World Example"}
            </span>
            <span style={{
              transform: showEx ? "rotate(180deg)" : "none",
              transition: "transform 0.22s", display: "block", fontSize: 15
            }}>↓</span>
          </button>

          {showEx && (
            <div style={{
              marginTop: 8, background: theme.dim,
              borderRadius: 12, padding: "14px 15px",
              borderLeft: `2px solid ${theme.accent}`,
              animation: "slideDown 0.2s ease"
            }}>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 13.5,
                color: "rgba(255,255,255,0.7)", lineHeight: 1.7,
                margin: 0, fontStyle: "italic"
              }}>{card.example}</p>
            </div>
          )}
        </div>

        {/* Scroll-down nudge on first card */}
        {index === 0 && (
          <div style={{
            textAlign: "center", marginTop: 28, flexShrink: 0,
            animation: "hintFade 4s ease 2s both", pointerEvents: "none"
          }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>
              SCROLL DOWN FOR MORE
            </div>
            <div style={{ fontSize: 18, color: "rgba(255,255,255,0.2)", animation: "bounce 1.5s infinite" }}>↓</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes hintFade{0%{opacity:0}20%{opacity:1}75%{opacity:1}100%{opacity:0}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
        div::-webkit-scrollbar{display:none}
      `}</style>
    </div>
  );
}

// ─── SwipeReader ──────────────────────────────────────────────────────────────
function SwipeReader({ summary, onClose }) {
  const scrollRef = useRef(null);
  const [current, setCurrent] = useState(0);
  const total = (summary.cards || []).length;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollTop / window.innerHeight);
      setCurrent(Math.max(0, Math.min(idx - 1, total - 1))); // -1 for header spacer
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [total]);

  useEffect(() => {
    const onKey = (e) => {
      const el = scrollRef.current;
      if (!el) return;
      if (e.key === "ArrowDown") el.scrollBy({ top: window.innerHeight, behavior: "smooth" });
      else if (e.key === "ArrowUp") el.scrollBy({ top: -window.innerHeight, behavior: "smooth" });
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#080c14" }}>
      {/* Fixed header */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        padding: "10px 16px",
        display: "flex", alignItems: "center", gap: 12,
        background: "linear-gradient(to bottom, rgba(8,12,20,0.97) 60%, transparent 100%)"
      }}>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20, padding: "7px 14px", color: "white", cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, flexShrink: 0
        }}>← Back</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: 14,
            color: "white", fontWeight: 600,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
          }}>{summary.title}</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#666" }}>{summary.author}</div>
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#555", flexShrink: 0 }}>
          {current + 1}/{total}
        </div>
      </div>

      {/* Scroll container */}
      <div ref={scrollRef} style={{
        height: "100%", overflowY: "scroll",
        scrollSnapType: "y mandatory",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
      }}>
        {/* Header spacer */}
        <div style={{ height: 48, scrollSnapAlign: "none", flexShrink: 0 }} />

        {(summary.cards || []).map((card, i) => (
          <ConceptCard key={i} card={card} index={i} total={total} theme={CARD_THEMES[i % CARD_THEMES.length]} />
        ))}

        {/* Finish card */}
        <div style={{
          height: "100vh", scrollSnapAlign: "start",
          background: "linear-gradient(160deg, #0c1520 0%, #080c14 100%)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 20, padding: 32, textAlign: "center", boxSizing: "border-box"
        }}>
          <div style={{ fontSize: 52 }}>✨</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: "white" }}>
            That's the wisdom!
          </div>
          {summary.tagline && (
            <div style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 15,
              color: "#666", maxWidth: 300, lineHeight: 1.7, fontStyle: "italic"
            }}>"{summary.tagline}"</div>
          )}
          <button onClick={onClose} style={{
            marginTop: 12, padding: "13px 32px",
            background: "#E8A020", border: "none", borderRadius: 14,
            color: "#000", fontSize: 15, fontWeight: 700,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
          }}>← Back to Library</button>
        </div>
      </div>
    </div>
  );
}

// ─── BookRow ──────────────────────────────────────────────────────────────────
function BookRow({ book, onSelect }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => onSelect(book)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        background: hovered ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 14, padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 14,
        cursor: "pointer", transition: "all 0.18s", textAlign: "left",
        position: "relative", overflow: "hidden"
      }}
    >
      {/* Color pip */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: book.color, borderRadius: "14px 0 0 14px"
      }} />

      {/* Book cover */}
      <div style={{ marginLeft: 6, flexShrink: 0 }}>
        <SmartCover title={book.title} author={book.author} color={book.color} width={42} height={62} borderRadius={5} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 15, fontWeight: 700, color: "white",
          lineHeight: 1.3, marginBottom: 3,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
        }}>{book.title}</div>
        <div style={{ fontSize: 12, color: "#666" }}>{book.author}</div>
      </div>

      {/* Arrow */}
      <div style={{
        color: hovered ? "#E8A020" : "#444", fontSize: 20, flexShrink: 0,
        transition: "color 0.18s, transform 0.18s",
        transform: hovered ? "translateX(3px)" : "none"
      }}>›</div>
    </button>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────
function HomeScreen({ onSelect }) {
  const [search, setSearch] = useState("");
  const [customAuthor, setCustomAuthor] = useState("");
  const [page, setPage] = useState(1);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? ALL_BOOKS.filter(b =>
        b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
      )
    : ALL_BOOKS;

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;
  const exactMatch = filtered.some(b => b.title.toLowerCase() === q);
  const showCustom = q.length > 2 && !exactMatch;

  const handleCustom = () => {
    if (!search.trim()) return;
    onSelect({ title: search.trim(), author: customAuthor.trim() || "Unknown Author", color: "#E8A020" });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Hero */}
      <div style={{
        padding: "48px 20px 32px", textAlign: "center",
        background: "linear-gradient(180deg, #0c1520 0%, #080c14 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.05)"
      }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 36 }}>📚</span>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(28px, 6vw, 40px)", fontWeight: 700,
            color: "white", margin: 0
          }}>BookScroll</h1>
        </div>
        <p style={{ color: "#555", fontSize: 15, margin: "0 0 24px", lineHeight: 1.6 }}>
          Scroll through book wisdom like social media.
        </p>

        <div style={{ maxWidth: 460, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)",
              fontSize: 15, color: "#555", pointerEvents: "none"
            }}>🔍</span>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              onKeyDown={e => e.key === "Enter" && showCustom && handleCustom()}
              placeholder="Search books, authors, or any title…"
              style={{
                width: "100%", padding: "13px 16px 13px 42px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12, color: "white", fontSize: 15,
                outline: "none", boxSizing: "border-box",
                fontFamily: "'DM Sans', sans-serif"
              }}
            />
          </div>

          {showCustom && (
            <>
              <input
                value={customAuthor}
                onChange={e => setCustomAuthor(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCustom()}
                placeholder="Author name (optional)"
                style={{
                  width: "100%", padding: "11px 16px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12, color: "white", fontSize: 14,
                  outline: "none", boxSizing: "border-box",
                  fontFamily: "'DM Sans', sans-serif"
                }}
              />
              <button onClick={handleCustom} style={{
                padding: "12px", background: "#E8A020", border: "none",
                borderRadius: 12, color: "#000", fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
              }}>
                ✨ Load wisdom for "{search.trim()}"
              </button>
            </>
          )}
        </div>
      </div>

      {/* Book list */}
      <div style={{ padding: "20px 14px 56px", maxWidth: 600, margin: "0 auto" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 14, padding: "0 2px"
        }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#555", fontWeight: 700 }}>
            {q ? `RESULTS — ${filtered.length}` : "POPULAR BOOKS"}
          </div>
          <div style={{ fontSize: 12, color: "#444" }}>
            {paginated.length} of {filtered.length}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "#555" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 15, color: "#777", marginBottom: 6 }}>No matches</div>
            <div style={{ fontSize: 13 }}>Type a title above to load any book</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {paginated.map(book => (
                <BookRow key={book.title} book={book} onSelect={onSelect} />
              ))}
            </div>
            {hasMore && (
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <button
                  onClick={() => setPage(p => p + 1)}
                  style={{
                    padding: "11px 28px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10, color: "#aaa",
                    fontSize: 14, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif", transition: "all 0.18s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "white"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#aaa"; }}
                >
                  Load {Math.min(PAGE_SIZE, filtered.length - paginated.length)} more ↓
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
        input::placeholder{color:#555}
        ::-webkit-scrollbar{display:none}
      `}</style>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [appState, setAppState] = useState("home");
  const [selectedBook, setSelectedBook] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const cache = useRef({});

  const handleSelect = useCallback(async (book) => {
    setSelectedBook(book);
    setAppState("loading");
    const key = `${book.title}::${book.author}`;
    try {
      if (cache.current[key]) { setSummary(cache.current[key]); setAppState("reading"); return; }
      try {
        const stored = await window.storage.get(`book:${key}`);
        if (stored?.value) {
          const p = JSON.parse(stored.value);
          cache.current[key] = p; setSummary(p); setAppState("reading"); return;
        }
      } catch (_) {}
      const data = await fetchBookSummary(book.title, book.author);
      cache.current[key] = data; setSummary(data); setAppState("reading");
      try { await window.storage.set(`book:${key}`, JSON.stringify(data)); } catch (_) {}
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load summary.");
      setAppState("error");
    }
  }, []);

  if (appState === "loading") return <LoadingScreen book={selectedBook} />;
  if (appState === "reading") return <SwipeReader summary={summary} onClose={() => setAppState("home")} />;
  if (appState === "error") return (
    <div style={{
      position: "fixed", inset: 0, background: "#080c14",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 20, padding: 32, textAlign: "center",
      fontFamily: "'DM Sans', sans-serif", color: "white"
    }}>
      <div style={{ fontSize: 48 }}>😕</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700 }}>Something went wrong</div>
      <div style={{ color: "#666", fontSize: 14, maxWidth: 300, lineHeight: 1.7 }}>{error}</div>
      <button onClick={() => setAppState("home")} style={{
        padding: "12px 28px", background: "#E8A020", border: "none",
        borderRadius: 12, color: "#000", fontSize: 15, fontWeight: 700,
        cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
      }}>← Back to Library</button>
    </div>
  );
  return <HomeScreen onSelect={handleSelect} />;
}
