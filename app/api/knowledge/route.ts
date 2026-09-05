import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { buildEntityContext, bareTopic } from "@/lib/entities.mts";
import { fetchRiddimsWorld } from "@/lib/riddimsWorld";
import { searchRegimeRadio, fetchRegimeRadioArticle } from "@/lib/regimeRadio";
import { webResearchContext } from "@/lib/webResearch";

// ⛔ HARD RULES (B.md): NO ANTHROPIC. NO WIKIPEDIA. Archive-first.
// Live web research is allowed ONLY when the Archive has no record.
// LLM provider: Groq only.

const GROQ_KEY = process.env.GROQ_API_KEY || "";

const AGENT = `You are the Cultural Intelligence Officer of the Caribbean Sound Archive — part of Riddim Intelligence, the Global Master Audio Archive.

Your domain: reggae and dancehall music culture worldwide — the Caribbean, Africa (including Ghana and West Africa), and the diaspora — artists, deejays, producers, labels, sound systems, clashes, riddims, eras, and events.

Tone:
- Formal archival authority, like a senior curator at a national sound archive
- NEVER reveal sources, websites, databases, or platforms
- Frame all knowledge as coming from "The Global Riddim Index" or "Caribbean Sound Archive"
- Use phrases like: "According to archival records...", "The pressing logs indicate...", "Oral history preserved in the Archive documents..."

RULES (in order of importance):
1. ARCHIVE EXCERPTS — sections labeled "Caribbean Sound Archive", "Global Riddim Index", "Riddims World", or "Regime Radio" — are the Archive's authoritative records. When any are provided, answer from them ONLY. Do not add outside knowledge and do not invent details that are not in the records.
2. LIVE RESEARCH EXCERPTS — a section labeled "LIVE RESEARCH — external web" — are current public records gathered only when the Archive has no record. When ONLY live research excerpts are provided (no archive excerpts), answer from them. Attribute the answer to current public records (for example: "According to current public records..."). Never present live research as the Archive's curated holdings, and never reveal the source websites.
3. If neither archive excerpts nor live research excerpts contain an answer, say exactly that the records are inconclusive and that the Archive does not yet contain enough source data to answer. Never guess.
4. Never fabricate names, dates, winners, venues, or quotes. If the user asks about something outside reggae/dancehall music culture, redirect gracefully.
5. Keep answers concise (2-5 sentences) but rich with the details the records actually contain.`;

// ── Local Global Riddim Index (public/*.json) — canonical riddim catalog ──
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

// ── MongoDB archive records (optional enrichment — archive-only) ─────────
async function mongoArchiveContext(topic: string): Promise<{ context: string; labels: string[] }> {
  if (!process.env.MONGODB_URI || !topic) return { context: "", labels: [] };
  try {
    const { searchArchive } = await import("@/lib/archiveDb");
    const docs = await searchArchive(topic);
    if (!docs.length) return { context: "", labels: [] };

    const context = `[Caribbean Sound Archive — MongoDB records]\n${docs
      .map((d: any) => {
        const head = [d.name, d.realName ? `real name: ${d.realName}` : "", d.era ?? "", d.role ?? ""]
          .filter(Boolean)
          .join(" · ");
        return `- ${head}\n  ${d.bio ?? ""}`;
      })
      .join("\n")}`;

    return { context, labels: docs.map((d: any) => d.name ?? "Archive record") };
  } catch {
    return { context: "", labels: [] };
  }
}

// ── Riddims World — external riddim catalog (allowed archive source) ─────
async function riddimsWorldContext(topic: string): Promise<{ context: string; label: string }> {
  const term = topic.toLowerCase().replace(/\s+riddim\s*$/i, "").trim();
  if (!term) return { context: "", label: "" };
  const entries = await fetchRiddimsWorld(term, 5);
  if (!entries.length) return { context: "", label: "" };
  return {
    context: `[Riddims World — archive catalog]\n${entries.map((e) => `- ${e.name}`).join("\n")}`,
    label: "Riddims World",
  };
}

// ── Regime Radio — riddim/single/sound-system archive (allowed source) ───
async function regimeRadioContext(topic: string): Promise<{ context: string; label: string }> {
  const term = topic.toLowerCase().replace(/\s+riddim\s*$/i, "").trim();
  if (!term) return { context: "", label: "" };
  const hits = await searchRegimeRadio(term, 5);
  const posts: string[] = [];
  for (const hit of hits.slice(0, 2)) {
    const text = await fetchRegimeRadioArticle(hit.id);
    if (text.length > 40) {
      posts.push(`[Regime Radio archive document: ${hit.title}]\n${text.slice(0, 1200)}`);
    }
  }
  if (!posts.length) return { context: "", label: "" };
  return { context: posts.join("\n\n"), label: "Regime Radio" };
}

// ── Groq (the ONLY allowed LLM provider) ─────────────────────────────────
// Current public Groq chat models per console.groq.com/docs/models.
const MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
];

async function callGroq(model: string, userMessage: string, attempt: number): Promise<any> {
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
      max_tokens: 300,
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  const data = await res.json().catch(() => ({}));

  // Retry once on rate limit / server overload
  if (res.status === 429 && attempt < 2) {
    await new Promise((r) => setTimeout(r, 1200));
    return callGroq(model, userMessage, attempt + 1);
  }

  return { ok: res.ok, status: res.status, data };
}

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

  // ── Archive-first grounding: entity store + local riddim index + Riddims World + Regime Radio + MongoDB ──
  const topic = bareTopic(query);
  const entity = buildEntityContext(query, 6);
  // Local riddim index needs the cleaned topic ("tempo"), not the raw
  // question ("what is the tempo riddim"), or word matching never hits.
  const local = localRiddimContext(topic);
  const mongo = await mongoArchiveContext(topic);
  // External riddim/archive catalogs are only useful for riddim/topic queries —
  // skip them when a canonical artist/entity already resolved.
  const rw = entity.resolved
    ? { context: "", label: "" }
    : await riddimsWorldContext(topic);
  const rr = entity.resolved
    ? { context: "", label: "" }
    : await regimeRadioContext(topic);

  const archiveContext = [entity.context, local, rw.context, rr.context, mongo.context]
    .filter(Boolean)
    .join("\n\n");
  const archiveLabels = [
    ...entity.labels,
    ...(local ? ["Global Riddim Index (local)"] : []),
    ...(rw.context ? [rw.label] : []),
    ...(rr.context ? [rr.label] : []),
    ...mongo.labels,
  ];

  // ── Full-agent fallback: if the Archive has no record, go find out live ──
  let live = { context: "", label: "" };
  if (!archiveContext) {
    live = await webResearchContext(topic || query);
  }

  const context = [archiveContext, live.context].filter(Boolean).join("\n\n");
  const labels = [...archiveLabels, ...(live.context ? [live.label] : [])];
  const mode: "archive" | "live" = live.context && !archiveContext ? "live" : "archive";

  const userMessage = context
    ? `GROUNDING EXCERPTS (answer strictly from these):\n\n${context}\n\n---\nUSER QUERY: ${query}`
    : query;

  const errors: string[] = [];

  for (const model of MODELS) {
    try {
      const { ok, status, data } = await callGroq(model, userMessage, 1);

      if (!ok) {
        const msg =
          data?.error?.message ||
          data?.error?.type ||
          `HTTP ${status}`;
        errors.push(`${model}: ${msg}`);
        // Auth errors will not be fixed by trying another model — stop here.
        if (status === 401 || status === 403) break;
        continue;
      }

      const answer = String(data?.choices?.[0]?.message?.content ?? "").trim();
      if (answer) {
        return NextResponse.json({
          query,
          answer,
          source:
            mode === "live"
              ? "Riddim Intelligence — Live Research"
              : "Caribbean Sound Archive — Global Riddim Index",
          model,
          mode,
          grounding: labels,
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
    mode,
    grounding: labels,
  });
}
