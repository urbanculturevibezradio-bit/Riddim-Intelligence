// Clean YouTube metadata extractor — fully validated, no multiline regex

function decodeHtmlEntities(str: string) {
  return str
    .replace(/\\u{([0-9a-fA-F]{4})}/g, (_, g) =>
      String.fromCharCode(parseInt(g, 16))
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function extractYouTubeInfo(html: string) {
  if (!html) return null;

  // Try to extract JSON metadata block
  const jsonMatch = html.match(/ytInitialData"\s*:\s*(\{.*?\})\s*,\s*"ytInitialPlayerResponse/s);
  let json: any = null;

  try {
    if (jsonMatch && jsonMatch[1]) {
      json = JSON.parse(jsonMatch[1]);
    }
  } catch {
    json = null;
  }

  // Extract title from JSON if available
  const titleFromJson =
    json?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]
      ?.videoRenderer?.title?.runs?.[0]?.text;

  // Fallback: meta tag
  const titleFromMeta =
    html.match(/<meta\s+name="title"\s+content="([^"]+)"/i)?.[1];

  // Fallback: inline JSON title
  const titleFromInline =
    html.match(/"title":\s*\{\s*"runs":\s*

\[\s*\{\s*"text":"([^"]+)"/)?.[1];

  const title = decodeHtmlEntities(
    titleFromJson || titleFromMeta || titleFromInline || ""
  );

  // Extract channel
  const channel =
    html.match(/"ownerText":\s*\{\s*"runs":\s*

\[\s*\{\s*"text":"([^"]+)"/)?.[1] ||
    html.match(/"longBylineText":\s*\{\s*"runs":\s*

\[\s*\{\s*"text":"([^"]+)"/)?.[1] ||
    "";

  // Extract description
  const description =
    html.match(/"descriptionSnippet":\s*\{\s*"runs":\s*

\[\s*\{\s*"text":"([^"]+)"/)?.[1] ||
    html.match(/"shortDescription":"([^"]+)"/)?.[1] ||
    "";

  // Extract video URL
  const videoId =
    html.match(/"videoId":"([^"]+)"/)?.[1] ||
    null;

  const url = videoId ? `https://www.youtube.com/watch?v=${videoId}` : "";

  if (!title && !url) return null;

  return {
    title: decodeHtmlEntities(title),
    channel: decodeHtmlEntities(channel),
    description: decodeHtmlEntities(description),
    url
  };
}
