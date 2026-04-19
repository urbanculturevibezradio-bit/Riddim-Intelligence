// src/scrapers/youtubeExtractor.ts
export function extractYouTubeInfo(html: string) {
  if (!html || typeof html !== 'string') return null;

  // Try to capture YouTube's JSON data blob
  const jsonMatch =
    html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s) ||
    html.match(/ytInitialData\s*=\s*(\{.+?\});/s);

  let parsed: any = null;
  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[1]);
    } catch (e) {
      parsed = null;
    }
  }

  const safe = (fn: () => any) => {
    try {
      return fn();
    } catch {
      return null;
    }
  };

  // Extract from JSON if available
  const titleFromJson = safe(() => parsed?.videoDetails?.title);
  const videoIdFromJson = safe(() => parsed?.videoDetails?.videoId);
  const authorFromJson = safe(() => parsed?.videoDetails?.author);
  const descFromJson = safe(() => parsed?.videoDetails?.shortDescription);

  // Fallback regex extraction
  const titleMatch =
    titleFromJson ||
    html.match(/<meta\s+name="title"\s+content="([^"]+)"/i)?.[1] ||
    html.match(/"title":\s*\{\s*"runs":\s*

\[\s*\{\s*"text":"([^"]+)"/)?.[1];

  const videoIdMatch =
    videoIdFromJson ||
    html.match(/"videoId":"([^"]+)"/)?.[1] ||
    html.match(/watch\?v=([A-Za-z0-9_-]{6,})/)?.[1];

  const channelMatch =
    authorFromJson ||
    html.match(/<link itemprop="name" content="([^"]+)"/i)?.[1] ||
    html.match(/"ownerText":\s*\{\s*"runs":\s*

\[\s*\{\s*"text":"([^"]+)"/)?.[1];

  const descMatch =
    descFromJson ||
    html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1] ||
    html.match(/"shortDescription":"([^"]+)"/)?.[1];

  const videoId = videoIdMatch || null;
  const title = titleMatch ? decodeHtmlEntities(titleMatch) : null;
  const channel = channelMatch ? decodeHtmlEntities(channelMatch) : null;
  const description = descMatch
    ? decodeHtmlEntities(truncate(descMatch, 240))
    : null;

  const url = videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;

  // If we can't get at least a title or videoId, skip
  if (!title && !videoId) return null;

  return { title, url, channel, description, videoId };
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function decodeHtmlEntities(str: string) {
  return str
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, g) =>
      String.fromCharCode(parseInt(g, 16))
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
