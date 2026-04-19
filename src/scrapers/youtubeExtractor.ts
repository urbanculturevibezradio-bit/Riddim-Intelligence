// Ultra‑clean YouTube metadata extractor — no multiline regex, no build issues

function decodeHtml(str: string) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function extractYouTubeInfo(html: string) {
  if (!html) return null;

  // Extract ytInitialPlayerResponse JSON
  const playerMatch = html.match(/ytInitialPlayerResponse"\s*:\s*(\{.*?\})\s*,\s*"(?:ytInitialData|responseContext)"/s);
  let player: any = null;

  try {
    if (playerMatch && playerMatch[1]) {
      player = JSON.parse(playerMatch[1]);
    }
  } catch {
    player = null;
  }

  // Extract ytInitialData JSON
  const dataMatch = html.match(/ytInitialData"\s*:\s*(\{.*?\})\s*[,<]/s);
  let data: any = null;

  try {
    if (dataMatch && dataMatch[1]) {
      data = JSON.parse(dataMatch[1]);
    }
  } catch {
    data = null;
  }

  // Video ID
  const videoId =
    player?.videoDetails?.videoId ||
    html.match(/"videoId":"([^"]+)"/)?.[1] ||
    null;

  const url = videoId ? `https://www.youtube.com/watch?v=${videoId}` : "";

  // Title
  const title =
    player?.videoDetails?.title ||
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]
      ?.videoRenderer?.title?.runs?.[0]?.text ||
    html.match(/<meta\s+name="title"\s+content="([^"]+)"/i)?.[1] ||
    html.match(/"title":\s*\{\s*"runs":\s*

\[\s*\{\s*"text":"([^"]+)"/)?.[1] ||
    "";

  // Channel
  const channel =
    player?.videoDetails?.author ||
    html.match(/"ownerText":\s*\{\s*"runs":\s*

\[\s*\{\s*"text":"([^"]+)"/)?.[1] ||
    html.match(/"longBylineText":\s*\{\s*"runs":\s*

\[\s*\{\s*"text":"([^"]+)"/)?.[1] ||
    "";

  // Description
  const description =
    player?.videoDetails?.shortDescription ||
    html.match(/"shortDescription":"([^"]+)"/)?.[1] ||
    html.match(/"descriptionSnippet":\s*\{\s*"runs":\s*

\[\s*\{\s*"text":"([^"]+)"/)?.[1] ||
    "";

  // Views
  const views =
    player?.videoDetails?.viewCount ||
    html.match(/"viewCount":"([^"]+)"/)?.[1] ||
    null;

  // Duration (seconds)
  const duration =
    player?.videoDetails?.lengthSeconds ||
    null;

  // Keywords
  const keywords =
    player?.videoDetails?.keywords ||
    [];

  // Category
  const category =
    player?.microformat?.playerMicroformatRenderer?.category ||
    null;

  // Publish date
  const publishDate =
    player?.microformat?.playerMicroformatRenderer?.publishDate ||
    null;

  // Like count (if visible)
  const likeCount =
    html.match(/"label":"([\d,]+)\s+likes"/i)?.[1] ||
    null;

  if (!videoId && !title) return null;

  return {
    videoId,
    url,
    title: decodeHtml(title),
    channel: decodeHtml(channel),
    description: decodeHtml(description),
    views,
    duration,
    keywords,
    category,
    publishDate,
    likeCount
  };
}
