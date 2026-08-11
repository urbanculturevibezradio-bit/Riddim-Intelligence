import { NextRequest, NextResponse } from "next/server";

const GROQ_KEY = process.env.GROQ_API_KEY || "";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

const AGENT = `You are the Cultural Intelligence Officer of Riddim Intelligence — the Global Master Audio Archive.

Your domain: Caribbean music culture, history, and events.

Tone:
- Formal archival authority, like a senior curator at a national sound archive
- NEVER reveal sources, websites, databases, or platforms
- Frame all knowledge as coming from "The Global Riddim Index" or "Caribbean Sound Archive"
- Use phrases like: "According to archival records...", "The pressing logs indicate...", "Oral history preserved in the Archive documents..."

What you know:
- Dancehall and reggae sound clashes (Sting, World Clash, Fully Loaded, etc.)
- Historical venues and events (Passa Passa, Dub Club, Stone Love, etc.)
- Riddim histories — who produced what, when, and cultural impact
- Artist biographies and career milestones
- Caribbean music terminology and slang in context
- Festival histories (Sumfest, Rebel Salute, Carnival, etc.)

Rules:
- If asked about something outside Caribbean music culture, redirect gracefully
- Keep answers concise (2-4 sentences) but rich with detail
- Never speculate — if archival records are incomplete, say so with authority
- When provided with archival source excerpts below, use their specific details — names, dates, what actually happened. Do not sanitize or generalize.`;


// ── Grounding: fetch dancehall blog excerpts for context ──────────

async function fetchSourceContext(query: string): Promise<string> {
  const sources: string[] = [];

  // Source 1: DancehallMag (WordPress search)
  try {
    const url = `https://www.dancehallmag.com/?s=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
    const html = await res.text();

    // Extract article cards: title + excerpt
    const cards = [...html.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/gi)];
    const snippets: string[] = [];

    for (const card of cards.slice(0, 3)) {
      const body = card[1];
      const title = (body.match(/<h[23][^>]*class="[^"]*entry-title[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i) || [])[1]
        || (body.match(/<h[23][^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i) || [])[1]
        || "";
      const excerpt = (body.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || [])[1]
        || (body.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1]
        || "";

      const clean = (t: string) => t.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#?\w+;/g, "").replace(/\s+/g, " ").trim();
      const t = clean(title);
      const e = clean(excerpt);
      if (t) snippets.push(`${t}${e ? ": " + e : ""}`);
    }

    if (snippets.length) {
      sources.push(`[DancehallMag excerpts]\n${snippets.map((s) => `- ${s}`).join("\n")}`);
    }
  } catch { /* silent — fallback to LLM-only */ }

  // Source 2: Reggaeville search
  try {
    const url = `https://www.reggaeville.com/search/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
    const html = await res.text();

    const items = [...html.matchAll(/<div[^>]*class="[^"]*search-result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi)];
    const snippets: string[] = [];

    for (const item of items.slice(0, 3)) {
      const body = item[1];
      const title = (body.match(/<a[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/a>/i) || [])[1]
        || (body.match(/<a[^>]*>([^<]+)<\/a>/i) || [])[1]
        || "";
      const text = body.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#?\w+;/g, "").replace(/\s+/g, " ").trim();
      const t = title.trim();
      if (t && text.length > 20) {
        snippets.push(`${t}: ${text.slice(0, 300)}`);
      }
    }

    if (snippets.length) {
      sources.push(`[Reggaeville excerpts]\n${snippets.map((s) => `- ${s}`).join("\n")}`);
    }
  } catch { /* silent */ }

  return sources.join("\n\n");
}

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query) return NextResponse.json({ error: "No query" }, { status: 400 });
  if (!GROQ_KEY) return NextResponse.json({ error: "Knowledge agent not configured" }, { status: 500 });

  // Fetch grounding context from dancehall sources (fails silently → LLM-only fallback)
  const sourceContext = await fetchSourceContext(query);

  const userMessage = sourceContext
    ? `ARCHIVAL SOURCE EXCERPTS (use these specific details in your answer):\n\n${sourceContext}\n\n---\nUSER QUERY: ${query}`
    : query;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: AGENT },
          { role: "user", content: userMessage },
        ],
        max_tokens: 350,
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content || "The Archive has no record matching this inquiry.";

    return NextResponse.json({
      query,
      answer,
      source: "Caribbean Sound Archive — Global Riddim Index",
    });
  } catch {
    return NextResponse.json({ answer: "The Archive is temporarily unavailable. Consult the pressing logs directly." });
  }
}
