import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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
- NEVER invent names, dates, winners, venues, or facts. This is critical. If you are not
  certain of a specific fact (for example, who won a particular clash), say the archival
  records are inconclusive or that the pressing logs do not conclusively record it —
  do NOT guess or fabricate.
- Never speculate — if archival records are incomplete, say so with authority
- When provided with archival source excerpts below, use their specific details — names, dates, what actually happened. Do not sanitize or generalize.
- The archival source excerpts are authoritative. When they are provided, prefer their
  details over your internal memory. If they contradict something you think you know,
  trust the excerpts.
- If the provided excerpts do not contain the answer, rely only on well-established facts
  you are highly confident about. When unsure, prefer saying so over filling the gap.`;


// ── Grounding: fetch real archival context before answering ──────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#8211;|&ndash;/g, "-")
    .replace(/&#8230;|&hellip;/g, "…")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// Strip natural-language question prefixes so search engines get the topic.
function wikiSearchTerm(query: string): string {
  return query
    .replace(/\?+$/, "")
    .replace(
      /^(who won|who is|who was|what is|what are|what was|what were|history of|origin of|when did|when was|where is|where was|how did|how is|tell me about|explain|describe)\s+/i,
      ""
    )
    .trim();
}

async function fetchJSON(url: string, timeoutMs: number): Promise<any> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Local Global Riddim Index (public/*.json) — canonical riddim catalog
function localRiddimContext(query: string): string {
  try {
    const q = query.toLowerCase().replace(/\s+riddim\s*$/i, "").trim();
    if (!q) return "";
    const publicDir = path.join(process.cwd(), "public");
    const entries: { name: string; bpm?: number | null; key?: string | null; tracks: string[] }[] = [];

    for (const file of ["riddims_enriched.json", "riddims.json", "riddims_vdj_bpm.json"]) {
      const p = path.join(publicDir, file);
      if (!fs.existsSync(p)) continue;
      const data = JSON.parse(fs.readFileSync(p, "utf8"));
      const list = Array.isArray(data) ? data : data?.riddims;
      if (!Array.isArray(list)) continue;
      for (const r of list) {
        const name = String(r?.name ?? "").trim();
        if (!name) continue;
        const n = name.toLowerCase().replace(/\s+riddim\s*$/i, "").trim();
        if (!n) continue;
        const words = q.split(/\s+/).filter(Boolean);
        const match =
          n === q ||
          n.includes(q) ||
          q.includes(n) ||
          (words.length > 0 && words.every((w) => n.includes(w)));
        if (!match) continue;
        const tracks = Array.isArray(r.tracks)
          ? r.tracks
              .map((t: any) =>
                (typeof t === "string" ? t : `${t?.artist ?? ""} - ${t?.title ?? ""}`).trim()
              )
              .filter(Boolean)
          : [];
        entries.push({ name, bpm: r.bpm ?? null, key: r.key ?? null, tracks });
      }
    }

    const seen = new Set<string>();
    const uniq = entries
      .filter((e) => !seen.has(e.name.toLowerCase()) && seen.add(e.name.toLowerCase()))
      .slice(0, 5);
    if (!uniq.length) return "";

    return `[Global Riddim Index — local catalog]\n${uniq
      .map((e) => {
        const meta = [e.bpm ? `${e.bpm} BPM` : "", e.key ? `Key ${e.key}` : ""]
          .filter(Boolean)
          .join(" · ");
        const trackLine = e.tracks.length
          ? `\n  Cataloged pressings: ${e.tracks.slice(0, 10).join(", ")}`
          : "";
        return `- ${e.name}${meta ? ` (${meta})` : ""}${trackLine}`;
      })
      .join("\n")}`;
  } catch {
    return "";
  }
}

async function fetchSourceContext(query: string): Promise<string> {
  const tasks: Promise<string>[] = [];

  // 1) Local Global Riddim Index (instant, no network)
  tasks.push(Promise.resolve(localRiddimContext(query)));

  // 2) DancehallMag WordPress REST API — search, then pull 2 full articles
  tasks.push(
    (async () => {
      try {
        const items = await fetchJSON(
          `https://www.dancehallmag.com/wp-json/wp/v2/search?search=${encodeURIComponent(query)}&per_page=3&_fields=id,title,url`,
          7000
        );
        const posts: string[] = [];
        for (const item of (Array.isArray(items) ? items : []).slice(0, 2)) {
          if (!item?.id) continue;
          try {
            const post = await fetchJSON(
              `https://www.dancehallmag.com/wp-json/wp/v2/posts/${item.id}?_fields=title,content`,
              7000
            );
            const title = stripHtml(post?.title?.rendered ?? "");
            const text = stripHtml(post?.content?.rendered ?? "");
            if (text.length > 40) {
              posts.push(`[Archive document: ${title || "Untitled"}]\n${text.slice(0, 1500)}`);
            }
          } catch {}
        }
        return posts.length ? posts.join("\n\n") : "";
      } catch {
        return "";
      }
    })()
  );

  // 3) Wikipedia API — general fact grounding (normalized + dancehall-scoped)
  tasks.push(
    (async () => {
      try {
        const term = wikiSearchTerm(query);
        const searchTerm = /dancehall|reggae|riddim|ska|soca|sound system|dub|clash|dutty/i.test(term)
          ? term
          : `${term} dancehall`;
        const data = await fetchJSON(
          `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&srlimit=2&origin=*`,
          7000
        );
        const hits = data?.query?.search;
        const snippets: string[] = [];
        for (const h of (Array.isArray(hits) ? hits : []).slice(0, 2)) {
          const title = String(h?.title ?? "").trim();
          const snip = stripHtml(String(h?.snippet ?? ""));
          if (title && snip) snippets.push(`- ${title}: ${snip}`);
        }

        // Pull the fuller intro of the top hit for real grounding text
        const top: any = Array.isArray(hits) ? hits[0] : null;
        if (top?.title) {
          try {
            const ex = await fetchJSON(
              `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&format=json&titles=${encodeURIComponent(top.title)}&origin=*`,
              7000
            );
            const pages: any = ex?.query?.pages ?? {};
            const first: any = Object.values(pages)[0];
            const extract = stripHtml(String(first?.extract ?? ""));
            if (extract.length > 40) {
              snippets.push(`[Archival reference: ${top.title}]\n${extract.slice(0, 900)}`);
            }
          } catch {}
        }

        return snippets.length ? snippets.join("\n") : "";
      } catch {
        return "";
      }
    })()
  );

  const settled = await Promise.allSettled(tasks);
  const sources = settled
    .filter(
      (r): r is PromiseFulfilledResult<string> =>
        r.status === "fulfilled" && Boolean(r.value)
    )
    .map((r) => r.value);
  return sources.join("\n\n");
}

// Try primary model first; fall back if Groq reports the model is gone.
// NOTE (2026-08-28): the old llama-3.x and llama-4 ids now return
// "does not exist or you do not have access". Current public Groq chat
// models per console.groq.com/docs/models are below.
const MODELS = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
];

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", answer: "The Archive is temporarily unavailable." },
      { status: 400 }
    );
  }

  const query = String(body?.query ?? "").trim();
  if (!query) {
    return NextResponse.json(
      { error: "No query", answer: "The Archive has no record matching this inquiry." },
      { status: 400 }
    );
  }
  if (!GROQ_KEY) {
    return NextResponse.json(
      {
        error: "GROQ_API_KEY not configured",
        answer: "The Archive is temporarily unavailable. Consult the pressing logs directly.",
        source: "Caribbean Sound Archive — Global Riddim Index",
      },
      { status: 500 }
    );
  }

  // Fetch grounding context from dancehall sources (fails silently → LLM-only fallback)
  const sourceContext = await fetchSourceContext(query);

  const userMessage = sourceContext
    ? `ARCHIVAL SOURCE EXCERPTS (use these specific details in your answer):\n\n${sourceContext}\n\n---\nUSER QUERY: ${query}`
    : query;

  const errors: string[] = [];

  for (const model of MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: AGENT },
            { role: "user", content: userMessage },
          ],
          max_tokens: 350,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(20_000),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.error?.message ||
          data?.error?.type ||
          `HTTP ${res.status} ${res.statusText}`;
        errors.push(`${model}: ${msg}`);
        // Auth errors will not be fixed by trying another model — stop here.
        if (res.status === 401 || res.status === 403) break;
        continue;
      }

      const answer = String(data?.choices?.[0]?.message?.content ?? "").trim();
      if (answer) {
        return NextResponse.json({
          query,
          answer,
          source: "Caribbean Sound Archive — Global Riddim Index",
          model,
        });
      }
      errors.push(`${model}: 200 OK but empty content`);
    } catch (e: any) {
      errors.push(`${model}: ${e?.message || "network error"}`);
    }
  }

  return NextResponse.json({
    query,
    answer: "The Archive is temporarily unavailable. Consult the pressing logs directly.",
    source: "Caribbean Sound Archive — Global Riddim Index",
    error: errors.join(" | ") || "Unknown Groq failure",
  });
}
