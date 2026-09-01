// lib/riddimsWorld.ts — shared Riddims World catalog search.
// Archive-allowed external source (B.md hard rules: NO Wikipedia, NO Anthropic).

export interface RiddimsWorldEntry {
  name: string;
  url: string;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const SKIP = new Set([
  "latest",
  "collections",
  "dancehall",
  "reggae",
  "home",
  "search",
  "contact",
  "about",
  "privacy",
  "2026 riddims",
]);

export async function fetchRiddimsWorld(
  query: string,
  max = 15
): Promise<RiddimsWorldEntry[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const res = await fetch(`https://riddimsworld.com/?s=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];

    const html = await res.text();
    const links = [
      ...html.matchAll(
        /<a[^>]*href="(https:\/\/riddimsworld\.com\/[^"]*)"[^>]*>([^<]+)<\/a>/g
      ),
    ];

    const seen = new Set<string>();
    const qLower = q.toLowerCase();
    const qWords = qLower.split(/\s+/).filter((w) => w.length > 2);

    return links
      .map(([, href, text]) => ({ href, text: text.replace(/\s+/g, " ").trim() }))
      .filter(({ text, href }) => {
        if (text.length < 8 || SKIP.has(text.toLowerCase())) return false;
        if (/\/author\/|\/category\/|\/tag\/|\/page\//.test(href)) return false;

        const t = text.toLowerCase();
        if (t.includes(qLower)) return true;
        if (qWords.length >= 2 && qWords.some((w) => t.includes(w))) return true;
        return false;
      })
      .filter(({ text }) => {
        const key = text.slice(0, 60).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, max)
      .map(({ href, text }) => ({ name: text, url: href }));
  } catch {
    return [];
  }
}
