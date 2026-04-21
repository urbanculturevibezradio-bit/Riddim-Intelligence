// externalSearch.ts — CLEAN VERSION (SECTION 1)
// ------------------------------------------------------------
// Types, helpers, debug logger
// ------------------------------------------------------------

import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { join } from "path";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface TrackInfo {
  title: string;
  artist: string;
  featuring?: string;
}

export interface RiddimResult {
  title: string;            // normalized riddim name
  tracks: TrackInfo[];      // may be empty for YouTube
  source: "riddimguide" | "riddimid" | "youtube" | "local";
  sourceUrl?: string;
  confidence: number;
  raw?: Record<string, unknown>;
}

export interface YouTubeVideoMeta {
  videoId: string;
  title: string;
  channelId: string;
  channelName: string;
  description: string;
  publishedAt: string;
  thumbnailUrl?: string;
}

export interface ExternalSearchOptions {
  maxPerSource?: number;
  sources?: {
    riddimGuide?: boolean;
    riddimId?: boolean;
    youtube?: boolean;
  };
  youtubeApiKey?: string;
  debug?: boolean;
}

export interface ExternalSearchResult {
  results: RiddimResult[];
  youtubeVideos: YouTubeVideoMeta[];
  counts: {
    local: number;
    riddimGuide: number;
    riddimId: number;
    youtube: number;
    total: number;
  };
  elapsed: number;
}

// ------------------------------------------------------------
// Debug logger (ON by default)
// ------------------------------------------------------------

const COLORS: Record<string, string> = {
  rg: "\x1b[36m",
  ri: "\x1b[35m",
  yt: "\x1b[33m",
  agg: "\x1b[32m",
  error: "\x1b[31m",
  reset: "\x1b[0m",
};

let _debug = true;

function debugLog(source: string, message: string, data?: unknown): void {
  if (!_debug) return;
  const color = COLORS[source] ?? COLORS.agg;
  const ts = new Date().toISOString();
  const tag = `[${ts}][${source.toUpperCase()}]`;
  if (data !== undefined) {
    console.log(
      `${color}${tag}${COLORS.reset} ${message}`,
      typeof data === "object" ? JSON.stringify(data, null, 2) : data
    );
  } else {
    console.log(`${color}${tag}${COLORS.reset} ${message}`);
  }
}

function debugError(source: string, message: string, err: unknown): void {
  const ts = new Date().toISOString();
  console.error(
    `${COLORS.error}[${ts}][${source.toUpperCase()}]${COLORS.reset} ${message}`,
    err instanceof Error ? err.message : err
  );
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function fetchJson<T = unknown>(
  url: string,
  headers?: Record<string, string>
): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json", ...headers },
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function fuzzyScore(query: string, candidate: string): number {
  const q = query.toLowerCase();
  const c = candidate.toLowerCase();
  if (c === q) return 1;
  if (c.includes(q)) return 0.85;
  const qWords = q.split(/\s+/);
  const matched = qWords.filter((w) => c.includes(w)).length;
  return (matched / qWords.length) * 0.7;
}

// ------------------------------------------------------------
// Local VirtualDJ index (public/riddims.json)
// ------------------------------------------------------------

interface LocalRiddim {
  name: string;
  tracks: string[];
}

interface LocalIndex {
  riddims: LocalRiddim[];
}

let _localIndex: LocalRiddim[] | null = null;

function loadLocalIndex(): LocalRiddim[] {
  if (_localIndex) return _localIndex;
  try {
    const p = join(process.cwd(), "public", "riddims.json");
    const raw = readFileSync(p, "utf8");
    const data: LocalIndex = JSON.parse(raw);
    _localIndex = data.riddims ?? [];
  } catch {
    _localIndex = [];
  }
  return _localIndex;
}

function searchLocalIndex(query: string, max: number): RiddimResult[] {
  const riddims = loadLocalIndex();
  const q = query.toLowerCase().replace(/\s+riddim\s*$/i, "").trim();

  return riddims
    .map((r) => {
      const name = r.name.toLowerCase().replace(/\s+riddim\s*$/i, "").trim();
      const score = fuzzyScore(q, name);
      return { r, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ r, score }) => ({
      title: r.name,
      tracks: r.tracks.map((t) => {
        const dash = t.indexOf(" - ");
        return dash === -1
          ? { artist: "", title: t }
          : { artist: t.slice(0, dash).trim(), title: t.slice(dash + 3).trim() };
      }),
      source: "local" as const,
      confidence: score,
      raw: {},
    }));
}
// ------------------------------------------------------------
// SECTION 2 — RiddimGuide Scraper (clean + stable)
// ------------------------------------------------------------

async function scrapeRiddimGuide(
  query: string,
  max: number
): Promise<RiddimResult[]> {
  const src = "rg";
  debugLog(src, `Searching RiddimGuide for "${query}" (max ${max})`);

  // Remove trailing "riddim" because RiddimGuide already scopes to riddims
  const searchQuery = query.replace(/\s+riddim\s*$/i, "").trim() || query;

  const searchUrl =
    `https://www.riddimguide.com/tunes?q=${encodeURIComponent(searchQuery)}`;

  debugLog(src, `Fetching search page`, searchUrl);

  let html: string;
  try {
    html = await fetchHtml(searchUrl);
  } catch (err) {
    debugError(src, "Failed to fetch search page", err);
    return [];
  }

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Riddim links appear in the 3rd column of the results table
  const links = Array.from(
    doc.querySelectorAll(".results table tbody tr td:nth-child(3) a[href]")
  ) as HTMLAnchorElement[];

  const uniqueUrls = [
    ...new Set(
      links
        .map((a) => a.getAttribute("href"))
        .filter((h): h is string => !!h && h.includes("/tunedb/riddim_"))
        .map((h) =>
          h.startsWith("http") ? h : `https://www.riddimguide.com${h}`
        )
    ),
  ].slice(0, max);

  debugLog(src, `Found ${uniqueUrls.length} riddim URLs`, uniqueUrls);

  const results: RiddimResult[] = [];

  for (const url of uniqueUrls) {
    try {
      debugLog(src, `Fetching riddim page`, url);
      const detailHtml = await fetchHtml(url);

      const detailDom = new JSDOM(detailHtml);
      const d = detailDom.window.document;

      // Title from heading: "Riddim » Diwali" → "Diwali"
      const headText = clean(d.querySelector("#headborderleft")?.textContent);
      const title = headText.replace(/^.*»\s*/, "").trim();

      // Track listing: col 0 = Artist, col 1 = Song
      const tracks: TrackInfo[] = [];
      d.querySelectorAll(".results table tbody tr").forEach((tr, idx) => {
        if (idx === 0) return; // skip header
        const tds = tr.querySelectorAll("td");
        if (tds.length < 2) return;

        const artistPart = clean(tds[0].textContent);
        const titlePart = clean(tds[1].textContent);
        if (!artistPart && !titlePart) return;

        const featMatch = artistPart.match(
          /^(.+?)\s+(?:feat\.?|ft\.?|featuring)\s+(.+)$/i
        );

        tracks.push({
          artist: featMatch ? featMatch[1].trim() : artistPart,
          title: titlePart,
          featuring: featMatch ? featMatch[2].trim() : undefined,
        });
      });

      debugLog(src, `Parsed ${tracks.length} tracks for "${title}"`);

      results.push({
        title,
        tracks,
        source: "riddimguide",
        sourceUrl: url,
        confidence: fuzzyScore(query, title),
        raw: {},
      });
    } catch (err) {
      debugError(src, `Failed to parse riddim page ${url}`, err);
    }
  }

  debugLog(src, `RiddimGuide complete — ${results.length} results`);
  return results;
}
// ------------------------------------------------------------
// SECTION 3 — Riddim-ID Scraper (clean + stable)
// ------------------------------------------------------------

async function scrapeRiddimId(
  query: string,
  max: number
): Promise<RiddimResult[]> {
  const src = "ri";
  debugLog(src, `Searching Riddim-ID for "${query}" (max ${max})`);

  const searchUrl =
    `https://www.riddim-id.org/search?q=${encodeURIComponent(query)}`;

  debugLog(src, `Fetching search page`, searchUrl);

  let html: string;
  try {
    html = await fetchHtml(searchUrl);
  } catch (err) {
    debugError(src, "Failed to fetch search page", err);
    return [];
  }

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Riddim-ID uses multiple layouts (cards, table rows, etc.)
  const cards = Array.from(
    doc.querySelectorAll(
      ".riddim-card, .search-result, .result-item, table.riddims tbody tr"
    )
  ).slice(0, max);

  debugLog(src, `Found ${cards.length} result cards`);

  const results: RiddimResult[] = [];

  for (const card of cards) {
    try {
      let title = "";
      let detailUrl: string | undefined;

      const cells = card.querySelectorAll("td");

      if (cells.length >= 1) {
        // Table layout
        title = clean(cells[0].textContent);
        const link = cells[0].querySelector("a");
        detailUrl = link?.href ?? undefined;
      } else {
        // Card layout
        title = clean(
          card.querySelector("h2, h3, .riddim-name, .title")?.textContent
        );
        const link = card.querySelector("a[href]") as HTMLAnchorElement | null;
        detailUrl = link?.href ?? undefined;
      }

      if (!title) continue;

      debugLog(src, `Parsed card "${title}"`, { detailUrl });

      // Fetch detail page for track listing
      const tracks: TrackInfo[] = [];

      if (detailUrl) {
        try {
          const fullUrl = detailUrl.startsWith("http")
            ? detailUrl
            : `https://www.riddim-id.org${detailUrl}`;

          debugLog(src, `Fetching detail page`, fullUrl);

          const detailHtml = await fetchHtml(fullUrl);
          const detailDom = new JSDOM(detailHtml);
          const dd = detailDom.window.document;

          dd.querySelectorAll(
            ".track-list li, .tracklist li, table.tracks tbody tr, .voicing li"
          ).forEach((el) => {
            const raw = clean(el.textContent);
            const dashIdx = raw.indexOf(" - ");

            if (dashIdx > -1) {
              const artistPart = raw.slice(0, dashIdx).trim();
              const titlePart = raw.slice(dashIdx + 3).trim();

              const featMatch = artistPart.match(
                /^(.+?)\s+(?:feat\.?|ft\.?|featuring)\s+(.+)$/i
              );

              tracks.push({
                artist: featMatch ? featMatch[1].trim() : artistPart,
                title: titlePart,
                featuring: featMatch ? featMatch[2].trim() : undefined,
              });
            } else if (raw.length > 0) {
              tracks.push({ artist: "", title: raw });
            }
          });

          debugLog(src, `Parsed ${tracks.length} tracks for "${title}"`);
        } catch (err) {
          debugError(src, `Failed to fetch detail page ${detailUrl}`, err);
        }
      }

      results.push({
        title,
        tracks,
        source: "riddimid",
        sourceUrl: detailUrl
          ? detailUrl.startsWith("http")
            ? detailUrl
            : `https://www.riddim-id.org${detailUrl}`
          : undefined,
        confidence: fuzzyScore(query, title),
        raw: {},
      });
    } catch (err) {
      debugError(src, "Failed to parse result card", err);
    }
  }

  debugLog(src, `Riddim-ID complete — ${results.length} results`);
  return results;
}
// ------------------------------------------------------------
// SECTION 4A — YouTube API (two-step search + video details)
// ------------------------------------------------------------

async function youtubeSearch(
  query: string,
  apiKey: string,
  max: number
): Promise<YouTubeVideoMeta[]> {
  const src = "yt";
  debugLog(src, `YouTube search for "${query}" (max ${max})`);

  // ------------------------------------------------------------
  // STEP 1 — search.list (get video IDs)
  // ------------------------------------------------------------

  const searchUrl =
    "https://www.googleapis.com/youtube/v3/search" +
    `?part=snippet&type=video&maxResults=${max}` +
    `&q=${encodeURIComponent(query)}` +
    `&key=${apiKey}`;

  debugLog(src, "Fetching search.list", searchUrl);

  let searchJson: any;
  try {
    searchJson = await fetchJson(searchUrl);
  } catch (err) {
    debugError(src, "YouTube search.list failed", err);
    return [];
  }

  const videoIds = (searchJson.items ?? [])
    .map((i: any) => i.id?.videoId)
    .filter((id: string | undefined): id is string => !!id);

  if (videoIds.length === 0) {
    debugLog(src, "No YouTube results");
    return [];
  }

  debugLog(src, `Found ${videoIds.length} video IDs`, videoIds);

  // ------------------------------------------------------------
  // STEP 2 — videos.list (fetch full metadata)
  // ------------------------------------------------------------

  const videosUrl =
    "https://www.googleapis.com/youtube/v3/videos" +
    `?part=snippet,contentDetails,statistics` +
    `&id=${videoIds.join(",")}` +
    `&key=${apiKey}`;

  debugLog(src, "Fetching videos.list", videosUrl);

  let videosJson: any;
  try {
    videosJson = await fetchJson(videosUrl);
  } catch (err) {
    debugError(src, "YouTube videos.list failed", err);
    return [];
  }

  const results: YouTubeVideoMeta[] = [];

  for (const item of videosJson.items ?? []) {
    const sn = item.snippet ?? {};
    const thumbs = sn.thumbnails ?? {};
    const thumb =
      thumbs.maxres?.url ||
      thumbs.standard?.url ||
      thumbs.high?.url ||
      thumbs.medium?.url ||
      thumbs.default?.url;

    results.push({
      videoId: item.id,
      title: clean(sn.title),
      channelId: clean(sn.channelId),
      channelName: clean(sn.channelTitle),
      description: clean(sn.description),
      publishedAt: clean(sn.publishedAt),
      thumbnailUrl: thumb,
    });
  }

  debugLog(src, `YouTube metadata complete — ${results.length} videos`);
  return results;
}
// ------------------------------------------------------------
// SECTION 4B — Title Normalization (riddim-only, always append "Riddim")
// ------------------------------------------------------------

function normalizeRiddimTitle(raw: string): string {
  if (!raw) return "Unknown Riddim";

  let t = raw.toLowerCase();

  // Remove common YouTube junk
  t = t
    .replace(/\(official.*?\)/g, "")
    .replace(/\[official.*?\]/g, "")
    .replace(/\(audio.*?\)/g, "")
    .replace(/\[audio.*?\]/g, "")
    .replace(/\(lyrics.*?\)/g, "")
    .replace(/\[lyrics.*?\]/g, "")
    .replace(/\(hd.*?\)/g, "")
    .replace(/\[hd.*?\]/g, "")
    .replace(/\(hq.*?\)/g, "")
    .replace(/\[hq.*?\]/g, "")
    .replace(/official video/gi, "")
    .replace(/official audio/gi, "")
    .replace(/visualizer/gi, "")
    .replace(/topic/gi, "")
    .replace(/mix/gi, "")
    .replace(/full riddim/gi, "")
    .replace(/riddim mix/gi, "")
    .replace(/various artists/gi, "")
    .replace(/va /gi, "")
    .replace(/va-/gi, "")
    .replace(/va:/gi, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Remove trailing years
  t = t.replace(/\b(19|20)\d{2}\b/g, "").trim();

  // Remove trailing words like "mix", "audio", "video"
  t = t.replace(/\b(mix|audio|video|hd|hq)\b/gi, "").trim();

  // Capitalize each word
  const words = t.split(" ").filter(Boolean);
  const cap = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  // Always append "Riddim"
  return `${cap} Riddim`.trim();
}
// ------------------------------------------------------------
// SECTION 4C — Aggregator (merge + dedupe + scoring)
// ------------------------------------------------------------

export async function externalSearch(
  query: string,
  opts: ExternalSearchOptions
): Promise<ExternalSearchResult> {
  const start = Date.now();
  const max = opts.maxPerSource ?? 5;
  _debug = opts.debug ?? true;

  const useRG = opts.sources?.riddimGuide ?? true;
  const useRI = opts.sources?.riddimId ?? true;
  const useYT = opts.sources?.youtube ?? true;

  const apiKey = opts.youtubeApiKey ?? "";

  const allResults: RiddimResult[] = [];
  const youtubeVideos: YouTubeVideoMeta[] = [];

  // ------------------------------------------------------------
  // Run sources in parallel
  // ------------------------------------------------------------

  const tasks: Promise<void>[] = [];

  // Local VirtualDJ index — always runs, no network needed
  const local = searchLocalIndex(query, max);
  allResults.push(...local);
  debugLog("agg", `Local index: ${local.length} results`);

  if (useRG) {
    tasks.push(
      (async () => {
        const rg = await scrapeRiddimGuide(query, max);
        allResults.push(...rg);
      })()
    );
  }

  if (useRI) {
    tasks.push(
      (async () => {
        const ri = await scrapeRiddimId(query, max);
        allResults.push(...ri);
      })()
    );
  }

  if (useYT && apiKey) {
    tasks.push(
      (async () => {
        const yt = await youtubeSearch(query, apiKey, max);
        youtubeVideos.push(...yt);

        // Convert YouTube videos into RiddimResult entries
        for (const v of yt) {
          const normalized = normalizeRiddimTitle(v.title);

          allResults.push({
            title: normalized,
            tracks: [], // YouTube doesn't give tracklists
            source: "youtube",
            sourceUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
            confidence: fuzzyScore(query, normalized),
            raw: v as unknown as Record<string, unknown>,
          });
        }
      })()
    );
  }

  await Promise.all(tasks);

  // ------------------------------------------------------------
  // Deduplicate by normalized title
  // ------------------------------------------------------------

  const dedupMap = new Map<string, RiddimResult>();

  for (const r of allResults) {
    const key = r.title.toLowerCase();

    if (!dedupMap.has(key)) {
      dedupMap.set(key, r);
      continue;
    }

    const existing = dedupMap.get(key)!;

    // Keep the one with higher confidence
    if (r.confidence > existing.confidence) {
      dedupMap.set(key, r);
    }
  }

  const merged = Array.from(dedupMap.values());

  // ------------------------------------------------------------
  // Sort by confidence (desc)
// ------------------------------------------------------------

  merged.sort((a, b) => b.confidence - a.confidence);

  const elapsed = Date.now() - start;

  return {
    results: merged,
    youtubeVideos,
    counts: {
      local: allResults.filter((r) => r.source === "local").length,
      riddimGuide: allResults.filter((r) => r.source === "riddimguide").length,
      riddimId: allResults.filter((r) => r.source === "riddimid").length,
      youtube: allResults.filter((r) => r.source === "youtube").length,
      total: allResults.length,
    },
    elapsed,
  };
}
