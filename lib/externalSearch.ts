// lib/externalSearch.ts
// ─────────────────────────────────────────────────────────────
// External search aggregator: Riddim Guide, Riddim-ID, YouTube
// C1 — structured metadata extraction with full debug logging
// ─────────────────────────────────────────────────────────────

import { JSDOM } from "jsdom";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TrackInfo {
  title: string;
  artist: string;
  featuring?: string;
}

export interface RiddimResult {
  title: string;
  artist?: string;
  producer?: string;
  label?: string;
  year?: string;
  genre?: string;
  tracks: TrackInfo[];
  source: "riddimguide" | "riddimid" | "youtube";
  sourceUrl?: string;
  confidence: number;
  raw?: Record<string, unknown>; // raw payload for debugging
}

export interface YouTubeVideoMeta {
  videoId: string;
  title: string;
  channelId: string;
  channelName: string;
  description: string;
  publishedAt: string;
  viewCount?: number;
  likeCount?: number;
  duration?: string;
  thumbnailUrl?: string;
  tags?: string[];
  categoryId?: string;
}

export interface ExternalSearchOptions {
  /** Maximum results per source (default 10) */
  maxPerSource?: number;
  /** Enable/disable individual sources */
  sources?: {
    riddimGuide?: boolean;
    riddimId?: boolean;
    youtube?: boolean;
  };
  /** YouTube Data API key — required for YouTube source */
  youtubeApiKey?: string;
  /** Show verbose debug output (default: true) */
  debug?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Debug logger                                                       */
/* ------------------------------------------------------------------ */

const COLORS: Record<string, string> = {
  riddimguide: "\x1b[36m",  // cyan
  riddimid:    "\x1b[35m",  // magenta
  youtube:     "\x1b[33m",  // yellow
  agg:         "\x1b[32m",  // green
  error:       "\x1b[31m",  // red
  reset:       "\x1b[0m",
};

let _debug = true;

function debugLog(
  source: string,
  message: string,
  data?: unknown,
): void {
  if (!_debug) return;
  const color = COLORS[source] ?? COLORS.agg;
  const ts = new Date().toISOString();
  const tag = `[${ts}][${source.toUpperCase()}]`;
  if (data !== undefined) {
    console.debug(
      `${color}${tag}${COLORS.reset} ${message}`,
      typeof data === "object" ? JSON.stringify(data, null, 2) : data,
    );
  } else {
    console.debug(`${color}${tag}${COLORS.reset} ${message}`);
  }
}

function debugError(source: string, message: string, err: unknown): void {
  const color = COLORS.error;
  const ts = new Date().toISOString();
  console.error(
    `${color}[${ts}][${source.toUpperCase()}]${COLORS.reset} ${message}`,
    err instanceof Error ? err.message : err,
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

async function fetchJson<T = unknown>(url: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json", ...headers },
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

/** Normalise whitespace, collapse newlines */
function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/** Simple fuzzy score: how well `candidate` matches `query` (0-1) */
function fuzzyScore(query: string, candidate: string): number {
  const q = query.toLowerCase();
  const c = candidate.toLowerCase();
  if (c === q) return 1;
  if (c.includes(q)) return 0.85;
  const qWords = q.split(/\s+/);
  const matched = qWords.filter((w) => c.includes(w)).length;
  return matched / qWords.length * 0.7;
}

/* ------------------------------------------------------------------ */
/*  Source 1 — Riddim Guide (riddimguide.com)                          */
/* ------------------------------------------------------------------ */

async function scrapeRiddimGuide(
  query: string,
  max: number,
): Promise<RiddimResult[]> {
  const src = "riddimguide";
  debugLog(src, `Starting search for "${query}" (max ${max})`);

  const searchUrl =
    `https://www.riddimguide.com/?s=${encodeURIComponent(query)}`;
  debugLog(src, `Fetching search page: ${searchUrl}`);

  let html: string;
  try {
    html = await fetchHtml(searchUrl);
    debugLog(src, `Search page fetched — ${html.length} bytes`);
  } catch (err) {
    debugError(src, "Failed to fetch search page", err);
    return [];
  }

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Locate result links
  const links = Array.from(
    doc.querySelectorAll("article a[href], .entry-title a[href]"),
  ) as HTMLAnchorElement[];

  const uniqueUrls = [...new Set(links.map((a) => a.href))].slice(0, max);
  debugLog(src, `Found ${uniqueUrls.length} unique result URLs`, uniqueUrls);

  const results: RiddimResult[] = [];

  for (const url of uniqueUrls) {
    try {
      debugLog(src, `Fetching detail page: ${url}`);
      const detailHtml = await fetchHtml(url);
      debugLog(src, `Detail page fetched — ${detailHtml.length} bytes`);

      const detailDom = new JSDOM(detailHtml);
      const d = detailDom.window.document;

      // --- extract metadata ------------------------------------------------
      const title = clean(
        d.querySelector("h1.entry-title, h1, .riddim-title")?.textContent,
      );

      // Meta table rows (label → value)
      const meta: Record<string, string> = {};
      d.querySelectorAll(
        ".riddim-meta tr, .entry-content table tr, .riddim-info tr",
      ).forEach((tr) => {
        const cells = tr.querySelectorAll("td, th");
        if (cells.length >= 2) {
          const key = clean(cells[0].textContent).toLowerCase().replace(/:$/, "");
          meta[key] = clean(cells[1].textContent);
        }
      });
      debugLog(src, `Metadata extracted for "${title}"`, meta);

      // Track listing
      const tracks: TrackInfo[] = [];
      d.querySelectorAll(
        ".tracklist li, .entry-content ol li, .entry-content ul li",
      ).forEach((li) => {
        const raw = clean(li.textContent);
        // Common format: "Artist - Track Title" or "Artist feat. X - Title"
        const dashIdx = raw.indexOf(" - ");
        if (dashIdx > -1) {
          const artistPart = raw.slice(0, dashIdx).trim();
          const titlePart = raw.slice(dashIdx + 3).trim();
          const featMatch = artistPart.match(/^(.+?)\s+(?:feat\.?|ft\.?|featuring)\s+(.+)$/i);
          tracks.push({
            artist: featMatch ? featMatch[1].trim() : artistPart,
            title: titlePart,
            featuring: featMatch ? featMatch[2].trim() : undefined,
          });
        } else if (raw.length > 0) {
          tracks.push({ artist: "", title: raw });
        }
      });
      debugLog(src, `Tracks parsed: ${tracks.length}`, tracks);

      const result: RiddimResult = {
        title: title || query,
        producer: meta.producer ?? meta["produced by"] ?? undefined,
        label: meta.label ?? meta.record ?? undefined,
        year: meta.year ?? meta.date ?? undefined,
        genre: meta.genre ?? "Dancehall",
        tracks,
        source: "riddimguide",
        sourceUrl: url,
        confidence: fuzzyScore(query, title),
        raw: meta,
      };

      debugLog(src, `Result built`, {
        title: result.title,
        confidence: result.confidence,
        trackCount: tracks.length,
      });

      results.push(result);
    } catch (err) {
      debugError(src, `Failed to scrape detail page ${url}`, err);
    }
  }

  debugLog(src, `Completed — ${results.length} results`);
  return results;
}

/* ------------------------------------------------------------------ */
/*  Source 2 — Riddim-ID (riddim-id.org)                               */
/* ------------------------------------------------------------------ */

async function scrapeRiddimId(
  query: string,
  max: number,
): Promise<RiddimResult[]> {
  const src = "riddimid";
  debugLog(src, `Starting search for "${query}" (max ${max})`);

  const searchUrl =
    `https://www.riddim-id.org/search?q=${encodeURIComponent(query)}`;
  debugLog(src, `Fetching search page: ${searchUrl}`);

  let html: string;
  try {
    html = await fetchHtml(searchUrl);
    debugLog(src, `Search page fetched — ${html.length} bytes`);
  } catch (err) {
    debugError(src, "Failed to fetch search page", err);
    return [];
  }

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Result cards / rows
  const cards = Array.from(
    doc.querySelectorAll(
      ".riddim-card, .search-result, .result-item, table.riddims tbody tr",
    ),
  ).slice(0, max);
  debugLog(src, `Found ${cards.length} result cards`);

  const results: RiddimResult[] = [];

  for (const card of cards) {
    try {
      // Attempt inline extraction first (table row layout)
      const cells = card.querySelectorAll("td");

      let title: string;
      let year: string | undefined;
      let producer: string | undefined;
      let label: string | undefined;
      let detailUrl: string | undefined;

      if (cells.length >= 3) {
        // Table layout: Riddim | Year | Producer | Label
        title = clean(cells[0].textContent);
        year = clean(cells[1]?.textContent) || undefined;
        producer = clean(cells[2]?.textContent) || undefined;
        label = clean(cells[3]?.textContent) || undefined;
        const link = cells[0].querySelector("a");
        detailUrl = link?.href ?? undefined;
      } else {
        // Card layout
        title = clean(
          card.querySelector("h2, h3, .riddim-name, .title")?.textContent,
        );
        year = clean(card.querySelector(".year, .date")?.textContent) || undefined;
        producer = clean(card.querySelector(".producer")?.textContent) || undefined;
        label = clean(card.querySelector(".label")?.textContent) || undefined;
        const link = card.querySelector("a[href]") as HTMLAnchorElement | null;
        detailUrl = link?.href ?? undefined;
      }

      debugLog(src, `Parsed card: "${title}"`, { year, producer, label, detailUrl });

      // Fetch detail page for track listing when URL available
      const tracks: TrackInfo[] = [];

      if (detailUrl) {
        try {
          const fullUrl = detailUrl.startsWith("http")
            ? detailUrl
            : `https://www.riddim-id.org${detailUrl}`;
          debugLog(src, `Fetching detail page: ${fullUrl}`);
          const detailHtml = await fetchHtml(fullUrl);
          debugLog(src, `Detail page fetched — ${detailHtml.length} bytes`);

          const detailDom = new JSDOM(detailHtml);
          const dd = detailDom.window.document;

          dd.querySelectorAll(
            ".track-list li, .tracklist li, table.tracks tbody tr, .voicing li",
          ).forEach((el) => {
            const raw = clean(el.textContent);
            const dashIdx = raw.indexOf(" - ");
            if (dashIdx > -1) {
              const artistPart = raw.slice(0, dashIdx).trim();
              const titlePart = raw.slice(dashIdx + 3).trim();
              const featMatch = artistPart.match(
                /^(.+?)\s+(?:feat\.?|ft\.?|featuring)\s+(.+)$/i,
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

          // Also try to pick up producer/label from detail if missing
          if (!producer) {
            producer =
              clean(dd.querySelector(".producer, .produced-by")?.textContent) ||
              undefined;
          }
          if (!label) {
            label =
              clean(dd.querySelector(".label, .record-label")?.textContent) ||
              undefined;
          }

          debugLog(src, `Detail tracks parsed: ${tracks.length}`, tracks);
        } catch (err) {
          debugError(src, `Failed to fetch detail page ${detailUrl}`, err);
        }
      }

      const result: RiddimResult = {
        title: title || query,
        producer,
        label,
        year,
        genre: "Dancehall",
        tracks,
        source: "riddimid",
        sourceUrl: detailUrl
          ? detailUrl.startsWith("http")
            ? detailUrl
            : `https://www.riddim-id.org${detailUrl}`
          : undefined,
        confidence: fuzzyScore(query, title),
      };

      debugLog(src, `Result built`, {
        title: result.title,
        confidence: result.confidence,
        trackCount: tracks.length,
      });

      results.push(result);
    } catch (err) {
      debugError(src, "Failed to parse result card", err);
    }
  }

  debugLog(src, `Completed — ${results.length} results`);
  return results;
}

/* ------------------------------------------------------------------ */
/*  Source 3 — YouTube Data API v3 (full JSON extraction, C1)          */
/* ------------------------------------------------------------------ */

interface YTSearchItem {
  id: { kind: string; videoId?: string };
  snippet: {
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails?: { high?: { url: string } };
  };
}

interface YTVideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    tags?: string[];
    categoryId?: string;
    thumbnails?: { high?: { url: string } };
  };
  contentDetails?: { duration?: string };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
  };
}

async function searchYouTube(
  query: string,
  apiKey: string,
  max: number,
): Promise<{ results: RiddimResult[]; videos: YouTubeVideoMeta[] }> {
  const src = "youtube";
  debugLog(src, `Starting search for "${query}" (max ${max})`);

  // Step 1 — search
  const searchUrl =
    `https://www.googleapis.com/youtube/v3/search` +
    `?part=snippet&type=video&maxResults=${max}` +
    `&q=${encodeURIComponent(query + " riddim")}` +
    `&key=${apiKey}`;
  debugLog(src, `Search endpoint: ${searchUrl.replace(apiKey, "***")}`);

  let searchItems: YTSearchItem[];
  try {
    const data = await fetchJson<{ items: YTSearchItem[] }>(searchUrl);
    searchItems = data.items ?? [];
    debugLog(src, `Search returned ${searchItems.length} items`);
  } catch (err) {
    debugError(src, "Search API call failed", err);
    return { results: [], videos: [] };
  }

  const videoIds = searchItems
    .filter((i) => i.id.videoId)
    .map((i) => i.id.videoId as string);

  if (videoIds.length === 0) {
    debugLog(src, "No video IDs found in search results");
    return { results: [], videos: [] };
  }

  debugLog(src, `Video IDs to hydrate: ${videoIds.join(", ")}`);

  // Step 2 — hydrate with full metadata (statistics, contentDetails, tags)
  const videosUrl =
    `https://www.googleapis.com/youtube/v3/videos` +
    `?part=snippet,contentDetails,statistics` +
    `&id=${videoIds.join(",")}` +
    `&key=${apiKey}`;
  debugLog(src, `Videos endpoint: ${videosUrl.replace(apiKey, "***")}`);

  let videoItems: YTVideoItem[];
  try {
    const data = await fetchJson<{ items: YTVideoItem[] }>(videosUrl);
    videoItems = data.items ?? [];
    debugLog(src, `Hydrated ${videoItems.length} videos`);
  } catch (err) {
    debugError(src, "Videos API call failed", err);
    return { results: [], videos: [] };
  }

  // Step 3 — structured extraction
  const results: RiddimResult[] = [];
  const videos: YouTubeVideoMeta[] = [];

  for (const v of videoItems) {
    const s = v.snippet;
    const desc = s.description ?? "";

    debugLog(src, `Processing video "${s.title}" (${v.id})`);

    // Build full video metadata (C1)
    const videoMeta: YouTubeVideoMeta = {
      videoId: v.id,
      title: s.title,
      channelId: s.channelId,
      channelName: s.channelTitle,
      description: desc,
      publishedAt: s.publishedAt,
      viewCount: v.statistics?.viewCount
        ? parseInt(v.statistics.viewCount, 10)
        : undefined,
      likeCount: v.statistics?.likeCount
        ? parseInt(v.statistics.likeCount, 10)
        : undefined,
      duration: v.contentDetails?.duration ?? undefined,
      thumbnailUrl: s.thumbnails?.high?.url ?? undefined,
      tags: s.tags ?? [],
      categoryId: s.categoryId ?? undefined,
    };
    debugLog(src, `VideoMeta built`, videoMeta);
    videos.push(videoMeta);

    // Attempt to extract riddim metadata from title/description
    const titleLower = s.title.toLowerCase();

    // Heuristic: "Riddim Name Riddim" or "Riddim Name Instrumental"
    const riddimNameMatch = s.title.match(
      /^(.+?)\s+(?:riddim|instrumental|version)\b/i,
    );
    const riddimTitle = riddimNameMatch
      ? riddimNameMatch[1].trim()
      : s.title.replace(/\s*[\[\(].*$/, "").trim();

    // Try to parse year from title or description
    const yearMatch = (s.title + " " + desc).match(/\b(19[89]\d|20[0-2]\d)\b/);

    // Try to parse producer from description
    const prodMatch = desc.match(
      /(?:produc(?:ed|er)[:\s]+|beat\s+by[:\s]+)([^\n,]+)/i,
    );

    // Try to parse label from description
    const labelMatch = desc.match(
      /(?:label[:\s]+|©\s*\d{4}\s+)([^\n,]+)/i,
    );

    // Extract track list from description (numbered lines or "Artist - Title")
    const tracks: TrackInfo[] = [];
    const descLines = desc.split(/\n/);
    for (const line of descLines) {
      const trimmed = line.replace(/^\d+[\.\)]\s*/, "").trim();
      if (!trimmed || trimmed.length < 4) continue;
      const dashIdx = trimmed.indexOf(" - ");
      if (dashIdx > -1) {
        const artistPart = trimmed.slice(0, dashIdx).trim();
        const titlePart = trimmed.slice(dashIdx + 3).trim();
        // Skip if it looks like a URL or timestamp
        if (/^https?:/.test(artistPart) || /^\d+:\d+/.test(artistPart)) continue;
        const featMatch = artistPart.match(
          /^(.+?)\s+(?:feat\.?|ft\.?|featuring)\s+(.+)$/i,
        );
        tracks.push({
          artist: featMatch ? featMatch[1].trim() : artistPart,
          title: titlePart.replace(/\s*[\[\(].*$/, "").trim(),
          featuring: featMatch ? featMatch[2].trim() : undefined,
        });
      }
    }
    debugLog(src, `Tracks from description: ${tracks.length}`, tracks);

    const result: RiddimResult = {
      title: riddimTitle,
      producer: prodMatch ? prodMatch[1].trim() : undefined,
      label: labelMatch ? labelMatch[1].trim() : undefined,
      year: yearMatch ? yearMatch[1] : undefined,
      genre: "Dancehall",
      tracks,
      source: "youtube",
      sourceUrl: `https://www.youtube.com/watch?v=${v.id}`,
      confidence: fuzzyScore(query, riddimTitle),
      raw: videoMeta as unknown as Record<string, unknown>,
    };

    debugLog(src, `Result built`, {
      title: result.title,
      confidence: result.confidence,
      trackCount: tracks.length,
    });

    results.push(result);
  }

  debugLog(src, `Completed — ${results.length} results, ${videos.length} video metas`);
  return { results, videos };
}

/* ------------------------------------------------------------------ */
/*  Aggregator                                                         */
/* ------------------------------------------------------------------ */

export interface ExternalSearchResult {
  /** Merged and ranked riddim results from all sources */
  results: RiddimResult[];
  /** Full YouTube video metadata (C1) when YouTube source is enabled */
  youtubeVideos: YouTubeVideoMeta[];
  /** Per-source counts */
  counts: {
    riddimGuide: number;
    riddimId: number;
    youtube: number;
    total: number;
  };
  /** Wall-clock time in ms */
  elapsed: number;
}

export async function externalSearch(
  query: string,
  options: ExternalSearchOptions = {},
): Promise<ExternalSearchResult> {
  const start = performance.now();

  const max = options.maxPerSource ?? 10;
  const sources = {
    riddimGuide: options.sources?.riddimGuide ?? true,
    riddimId: options.sources?.riddimId ?? true,
    youtube: options.sources?.youtube ?? true,
  };
  _debug = options.debug ?? true;

  debugLog("agg", "External search started", {
    query,
    max,
    sources,
    debug: _debug,
  });

  // Launch enabled sources concurrently
  const promises: {
    riddimGuide: Promise<RiddimResult[]>;
    riddimId: Promise<RiddimResult[]>;
    youtube: Promise<{ results: RiddimResult[]; videos: YouTubeVideoMeta[] }>;
  } = {
    riddimGuide: sources.riddimGuide
      ? scrapeRiddimGuide(query, max)
      : Promise.resolve([]),
    riddimId: sources.riddimId
      ? scrapeRiddimId(query, max)
      : Promise.resolve([]),
    youtube:
      sources.youtube && options.youtubeApiKey
        ? searchYouTube(query, options.youtubeApiKey, max)
        : Promise.resolve({ results: [], videos: [] }),
  };

  const [rgResults, riResults, ytData] = await Promise.all([
    promises.riddimGuide.catch((err) => {
      debugError("agg", "Riddim Guide source failed entirely", err);
      return [] as RiddimResult[];
    }),
    promises.riddimId.catch((err) => {
      debugError("agg", "Riddim-ID source failed entirely", err);
      return [] as RiddimResult[];
    }),
    promises.youtube.catch((err) => {
      debugError("agg", "YouTube source failed entirely", err);
      return { results: [] as RiddimResult[], videos: [] as YouTubeVideoMeta[] };
    }),
  ]);

  debugLog("agg", "All sources resolved", {
    riddimGuide: rgResults.length,
    riddimId: riResults.length,
    youtube: ytData.results.length,
  });

  // Merge and deduplicate by title similarity
  const all = [...rgResults, ...riResults, ...ytData.results];

  // Dedupe: keep highest-confidence entry per normalised title
  const seen = new Map<string, RiddimResult>();
  for (const r of all) {
    const key = r.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    const existing = seen.get(key);
    if (!existing || r.confidence > existing.confidence) {
      // Merge tracks from existing if new entry has fewer
      if (existing && r.tracks.length < existing.tracks.length) {
        r.tracks = existing.tracks;
      }
      // Merge missing fields
      if (existing) {
        r.producer = r.producer || existing.producer;
        r.label = r.label || existing.label;
        r.year = r.year || existing.year;
      }
      seen.set(key, r);
    } else {
      // Merge fields into existing winner
      existing.producer = existing.producer || r.producer;
      existing.label = existing.label || r.label;
      existing.year = existing.year || r.year;
      if (r.tracks.length > existing.tracks.length) {
        existing.tracks = r.tracks;
      }
    }
  }

  const merged = [...seen.values()].sort(
    (a, b) => b.confidence - a.confidence,
  );

  debugLog("agg", `Merged & ranked: ${merged.length} unique results`);

  const elapsed = Math.round(performance.now() - start);

  const output: ExternalSearchResult = {
    results: merged,
    youtubeVideos: ytData.videos,
    counts: {
      riddimGuide: rgResults.length,
      riddimId: riResults.length,
      youtube: ytData.results.length,
      total: merged.length,
    },
    elapsed,
  };

  debugLog("agg", `Search complete in ${elapsed}ms`, output.counts);

  return output;
}

/* ------------------------------------------------------------------ */
/*  Default export                                                     */
/* ------------------------------------------------------------------ */

export default externalSearch;
