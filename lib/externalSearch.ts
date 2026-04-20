export async function searchExternalSources(query: string): Promise<string> {
  const results: string[] = [];

  // Universal proxy fetch
  async function proxyFetch(url: string) {
    const proxyUrl = `https://proxy-service-production-390f.up.railway.app/proxy?url=${encodeURIComponent(
      url
    )}`;

    const response = await fetch(proxyUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    if (!response.ok) {
      throw new Error(`Proxy fetch failed: ${response.status}`);
    }

    return response;
  }

  const riddimMatch = query.match(/([a-zA-Z\s]+)\s*riddim/i);
  const searchTerm = riddimMatch
    ? riddimMatch[1].trim().toLowerCase()
    : query.toLowerCase();

  const urlTerm = encodeURIComponent(searchTerm);

  // Layer 2a — Riddim Guide
  try {
    const url = `https://www.riddimguide.com/tunes?q=${urlTerm}&c=`;
    const res = await proxyFetch(url);
    const text = await res.text();
    const clean = text
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);

    if (clean.length > 200 && !clean.includes("nothing was found")) {
      results.push(`RIDDIM GUIDE:\n${clean}`);
    }
  } catch (e) {
    console.log("Riddim Guide failed:", e);
  }

  // Layer 2b — Riddim-ID
  try {
    const url = `https://www.riddim-id.com/search?term=${urlTerm}`;
    const res = await proxyFetch(url);
    const text = await res.text();
    const clean = text
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);

    if (clean.length > 200 && !clean.includes("No results")) {
      results.push(`RIDDIM-ID:\n${clean}`);
    }
  } catch (e) {
    console.log("Riddim-ID failed:", e);
  }

  // Layer 3 — YouTube
  try {
    const ytTerm = encodeURIComponent(`${searchTerm} riddim`);
    const url = `https://www.youtube.com/results?search_query=${ytTerm}`;
    const res = await proxyFetch(url);
    const text = await res.text();
    const clean = text
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);

    if (clean.length > 200) {
      results.push(`YOUTUBE:\n${clean}`);
    }
  } catch (e) {
    console.log("YouTube failed:", e);
  }

  return results.join("\n\n");
}
