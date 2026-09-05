// lib/webResearch.ts — LIVE RESEARCH for Riddim Intelligence (full-agent mode)
// ---------------------------------------------------------------------------
// Used ONLY when the Archive has no record for a query. This is the "if it
// doesn't know, it finds out" layer:
//   - DuckDuckGo HTML search (primary, no API key)
//   - Bing HTML search (fallback, no API key)
//   - Wikipedia is filtered out (B.md hard rules)
//   - Never throws — any failure returns empty and the caller falls back to
//     the old "records inconclusive" answer, so nothing that works breaks.
// Reliable-source principle: these are public web results only. The Archive
// (entity store + Mongo + Riddims World + Regime Radio) remains authoritative.

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

function isBlocked(url: string): boolean {
  // NO WIKIPEDIA — B.md hard rule. (Anthropic is banned project-wide elsewhere.)
  return /wikipedia\.org/i.test(url);
}

async function fetchHtml(url: string, timeoutMs = 10_000): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

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

  // DDG occasionally serves a challenge page from datacenter IPs — treat as no results.
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

async function searchBing(query: string, max: number): Promise<WebResearchItem[]> {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const out: WebResearchItem[] = [];

  $("li.b_algo").each((_, li) => {
    if (out.length >= max) return;
    const a = $(li).find("h2 a").first();
    const title = clean(a.text());
    const target = clean(a.attr("href") ?? "");
    if (!title || !target || isBlocked(target)) return;
    const snippet = clean($(li).find(".b_caption p, .b_caption").first().text());
    out.push({ title, snippet, url: target });
  });

  return out;
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

  let items: WebResearchItem[] = [];

  try {
    items = await searchDuckDuckGo(q, max);
  } catch (e) {
    console.error("webResearch DuckDuckGo error:", e instanceof Error ? e.message : e);
  }

  if (!items.length) {
    try {
      items = await searchBing(q, max);
    } catch (e) {
      console.error("webResearch Bing error:", e instanceof Error ? e.message : e);
    }
  }

  if (!items.length) return { context: "", label: "" };

  const context = `[LIVE RESEARCH — external web (current public records)]\n${items
    .map((i) => `- ${i.title}\n  ${i.snippet}\n  ${i.url}`)
    .join("\n")}`;

  return { context, label: "Live Web Research" };
}
