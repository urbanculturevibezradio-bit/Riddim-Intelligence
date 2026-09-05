// lib/webResearch.ts — LIVE RESEARCH for Riddim Intelligence (full-agent mode)
// ---------------------------------------------------------------------------
// Used ONLY when the Archive has no strong record for a query. This is the
// "if it doesn't know, it finds out" layer:
//   - ScraperAPI-proxied Bing (primary — stable from serverless IPs)
//   - Direct Bing (fallback)
//   - DuckDuckGo HTML (fallback — often bot-challenged)
//   - Exact-phrase relevance filter so unrelated lookalikes never leak in
//   - Wikipedia is filtered out (B.md hard rules)
//   - Never throws — any failure returns empty and the caller falls back to
//     the old "records inconclusive" answer, so nothing that works breaks.

import * as cheerio from "cheerio";

export interface WebResearchItem {
  title: string;
  snippet: string;
  url: string;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function clean(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function normPhrase(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isBlocked(url: string): boolean {
  // NO WIKIPEDIA — B.md hard rule. (Anthropic is banned project-wide elsewhere.)
  return /wikipedia\.org/i.test(url);
}

/** Decode Bing's a1<base64url> target (no padding, -/_ alphabet). */
function decodeBingTarget(s: string): string {
  let t = s;
  if (t.startsWith("a1")) {
    try {
      const b64 = t.slice(2).replace(/-/g, "+").replace(/_/g, "/");
      const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
      const decoded = Buffer.from(padded, "base64").toString("utf8");
      if (/^https?:\/\//i.test(decoded)) t = decoded;
    } catch {
      /* keep raw */
    }
  }
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}

function decodeBingUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (/bing\.com\/ck\/a/i.test(`${u.hostname}${u.pathname}`)) {
      const real = u.searchParams.get("u");
      if (real) return decodeBingTarget(real);
      return ""; // Bing redirect junk without a target
    }
    return raw;
  } catch {
    // Not a parseable URL — Bing sometimes emits bare a1<base64> links.
  }

  return decodeBingTarget(raw);
}

async function fetchHtml(url: string, timeoutMs = 12_000): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// ── Relevance filter ────────────────────────────────────────────────────────
// phrase mode: title+snippet must contain the exact normalized phrase
// all mode:    every significant word must appear (plain-query last resort)
function isRelevant(item: WebResearchItem, q: string, mode: "phrase" | "all"): boolean {
  const hay = normPhrase(`${item.title} ${item.snippet}`);
  const phrase = normPhrase(q);
  if (!phrase) return false;
  if (mode === "phrase") return hay.includes(phrase);
  const words = phrase.split(" ").filter((w) => w.length > 2);
  if (!words.length) return hay.includes(phrase);
  return words.every((w) => hay.includes(w));
}

// ── Bing (direct or via ScraperAPI) ─────────────────────────────────────────
async function bingHtml(query: string): Promise<string> {
  const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

  const scraperKey = process.env.SCRAPER_API_KEY || "";
  if (scraperKey) {
    try {
      const proxyUrl =
        `https://api.scraperapi.com/?api_key=${encodeURIComponent(scraperKey)}` +
        `&url=${encodeURIComponent(bingUrl)}`;
      return await fetchHtml(proxyUrl, 20_000);
    } catch (e) {
      console.error("webResearch ScraperAPI error:", e instanceof Error ? e.message : e);
    }
  }

  return fetchHtml(bingUrl);
}

function parseBing(html: string, max: number): WebResearchItem[] {
  const $ = cheerio.load(html);
  const out: WebResearchItem[] = [];

  $("li.b_algo").each((_, li) => {
    if (out.length >= max) return;
    const a = $(li).find("h2 a").first();
    const title = clean(a.text());
    const rawHref = a.attr("href") ?? "";
    const target = decodeBingUrl(rawHref);
    if (!title || !target || isBlocked(target)) return;
    const snippet = clean($(li).find(".b_caption p, .b_caption").first().text());
    out.push({ title, snippet, url: target });
  });

  return out;
}

async function searchBing(query: string, max: number): Promise<WebResearchItem[]> {
  const html = await bingHtml(query);
  return parseBing(html, max);
}

// ── DuckDuckGo HTML (fallback) ──────────────────────────────────────────────
function decodeDdgUrl(href: string): string | null {
  try {
    const u = new URL(href, "https://html.duckduckgo.com");
    const uddg = u.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    return null;
  } catch {
    return null;
  }
}

async function searchDuckDuckGo(query: string, max: number): Promise<WebResearchItem[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);

  // DDG serves a bot-challenge page from datacenter IPs — treat as no results.
  if (/anomaly|challenge/i.test(html.slice(0, 4000))) return [];

  const $ = cheerio.load(html);
  const out: WebResearchItem[] = [];

  $("a.result__a").each((_, a) => {
    if (out.length >= max) return;
    const title = clean($(a).text());
    const target = decodeDdgUrl($(a).attr("href") ?? "");
    if (!title || !target || isBlocked(target)) return;
    const snippet = clean($(a).closest(".result").find(".result__snippet").text());
    out.push({ title, snippet, url: target });
  });

  return out;
}

// ── Enrichment: read the top result pages for bio-level detail ─────────────
// Search snippets are thin; a band's Bandcamp/own-site meta description usually
// carries the real bio. Best-effort only — failures silently keep the snippet.
async function enrichItem(item: WebResearchItem): Promise<WebResearchItem> {
  try {
    const html = await fetchHtml(item.url, 8_000);
    const $ = cheerio.load(html);
    const meta = clean(
      $('meta[property="og:description"]').attr("content") ||
        $('meta[name="description"]').attr("content") ||
        ""
    );
    if (meta.length > 80) {
      const extra = meta.slice(0, 600);
      const merged = item.snippet ? `${item.snippet} ${extra}` : extra;
      return { ...item, snippet: merged };
    }
  } catch {
    /* keep the snippet */
  }
  return item;
}

// ── Query construction ──────────────────────────────────────────────────────
// The bot's domain is music culture, so bias the search: '"name" music' first,
// then the exact phrase alone, then the plain query as a last resort.
function candidateQueries(q: string): { query: string; mode: "phrase" | "all" }[] {
  const phrase = normPhrase(q);
  if (!phrase) return [];
  return [
    { query: `"${phrase}" music`, mode: "phrase" },
    { query: `"${phrase}"`, mode: "phrase" },
    { query: phrase, mode: "all" },
  ];
}

/**
 * Live web research context for the Archive Ask Bot. Returns a labeled
 * context block, or an empty string when the web has nothing usable.
 * Never throws — the caller keeps its existing behavior on failure.
 */
export async function webResearchContext(
  query: string,
  max = 6
): Promise<{ context: string; label: string }> {
  const q = clean(query);
  if (!q) return { context: "", label: "" };

  for (const candidate of candidateQueries(q)) {
    let items: WebResearchItem[] = [];

    try {
      items = (await searchBing(candidate.query, max)).filter((i) =>
        isRelevant(i, q, candidate.mode)
      );
    } catch (e) {
      console.error("webResearch Bing error:", e instanceof Error ? e.message : e);
    }

    if (!items.length) {
      try {
        items = (await searchDuckDuckGo(candidate.query, max)).filter((i) =>
          isRelevant(i, q, candidate.mode)
        );
      } catch (e) {
        console.error("webResearch DuckDuckGo error:", e instanceof Error ? e.message : e);
      }
    }

    if (!items.length) continue;

    // Enrich the top 2 results with page-level descriptions (best-effort).
    const enriched = await Promise.allSettled(items.slice(0, 2).map((i) => enrichItem(i)));
    enriched.forEach((r, idx) => {
      if (r.status === "fulfilled") items[idx] = r.value;
    });

    const context = `[LIVE RESEARCH — external web (current public records)]\n${items
      .map((i) => `- ${i.title}\n  ${i.snippet}\n  ${i.url}`)
      .join("\n")}`;

    return { context, label: "Live Web Research" };
  }

  return { context: "", label: "" };
}
