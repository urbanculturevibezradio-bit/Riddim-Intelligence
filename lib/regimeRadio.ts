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

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || "";

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

/**
 * Fetch a Regime Radio JSON endpoint. Tries direct first; if the site blocks
 * Vercel's datacenter IPs, falls back to ScraperAPI (SCRAPER_API_KEY).
 */
async function fetchRegimeJson(url: string): Promise<Response | null> {
  const headers = { "User-Agent": UA, Accept: "application/json" };

  try {
    const direct = await fetch(url, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (direct.ok) return direct;
    console.error(`regimeRadio direct HTTP ${direct.status} for ${url}`);
  } catch (e: any) {
    console.error("regimeRadio direct fetch error:", e?.message || e);
  }

  if (!SCRAPER_API_KEY) return null;

  try {
    const proxyUrl = `https://api.scraperapi.com/?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
    const proxied = await fetch(proxyUrl, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    if (proxied.ok) return proxied;
    console.error(`regimeRadio scraperapi HTTP ${proxied.status} for ${url}`);
    return null;
  } catch (e: any) {
    console.error("regimeRadio scraperapi fetch error:", e?.message || e);
    return null;
  }
}

/** Search Regime Radio's WordPress index. */
export async function searchRegimeRadio(
  query: string,
  max = 10
): Promise<RegimeRadioHit[]> {
  const q = query.trim();
  if (!q) return [];

  const res = await fetchRegimeJson(
    `https://regimeradio.com/wp-json/wp/v2/search?search=${encodeURIComponent(q)}&per_page=${max}&_fields=id,title,url`
  );
  if (!res) return [];

  try {
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((x: any) => x?.id && x?.title)
      .map((x: any) => ({
        id: x.id,
        title: stripHtml(String(x.title)),
        url: x.url ?? "",
      }));
  } catch (e: any) {
    console.error("regimeRadio search parse error:", e?.message || e);
    return [];
  }
}

/** Pull a Regime Radio article's text content. */
export async function fetchRegimeRadioArticle(id: number): Promise<string> {
  const res = await fetchRegimeJson(
    `https://regimeradio.com/wp-json/wp/v2/posts/${id}?_fields=title,content`
  );
  if (!res) return "";

  try {
    const post = await res.json();
    return stripHtml(String(post?.content?.rendered ?? ""));
  } catch (e: any) {
    console.error("regimeRadio article parse error:", e?.message || e);
    return "";
  }
}
