// lib/regimeRadio.ts — Regime Radio (regimeradio.com) archive search.
// WordPress REST API. Archive-allowed external source (B.md hard rules:
// NO Wikipedia, NO Anthropic). Regime Radio carries current + classic
// dancehall/reggae riddims, singles and sound-system culture.

export interface RegimeRadioHit {
  id: number;
  title: string;
  url: string;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

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

/** Search Regime Radio's WordPress index. */
export async function searchRegimeRadio(
  query: string,
  max = 10
): Promise<RegimeRadioHit[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const res = await fetch(
      `https://regimeradio.com/wp-json/wp/v2/search?search=${encodeURIComponent(q)}&per_page=${max}&_fields=id,title,url`,
      {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter((x: any) => x?.id && x?.title)
      .map((x: any) => ({
        id: x.id,
        title: stripHtml(String(x.title)),
        url: x.url ?? "",
      }));
  } catch {
    return [];
  }
}

/** Pull a Regime Radio article's text content. */
export async function fetchRegimeRadioArticle(id: number): Promise<string> {
  try {
    const res = await fetch(
      `https://regimeradio.com/wp-json/wp/v2/posts/${id}?_fields=title,content`,
      {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!res.ok) return "";
    const post = await res.json();
    return stripHtml(String(post?.content?.rendered ?? ""));
  } catch {
    return "";
  }
}
