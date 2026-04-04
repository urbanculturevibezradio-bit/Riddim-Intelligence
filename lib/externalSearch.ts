export async function searchExternalSources(query: string): Promise<string> {
  const results: string[] = [];

  const riddimMatch = query.match(/([a-zA-Z\s]+)\s*riddim/i);
  const searchTerm = riddimMatch
    ? riddimMatch[1].trim().toLowerCase()
    : query.toLowerCase();

  const urlTerm = searchTerm.replace(/\s+/g, '+');

  // Layer 2 — Riddim Guide
  try {
    const url = `https://www.riddimguide.com/tunes?q=${urlTerm}&c=`;
    const res = await fetch(url, {
      next: { revalidate: 0 },
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const text = await res.text();
    const clean = text
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000);
    if (clean.length > 200 && !clean.includes('nothing was found') && !clean.includes('Not Found')) {
      results.push(`RIDDIM GUIDE DATA:\n${clean}`);
    }
  } catch (e) {
    console.log('Riddim Guide failed:', e);
  }

  // Layer 3 — YouTube search
  try {
    const ytTerm = encodeURIComponent(`${searchTerm} riddim full`);
    const url = `https://www.youtube.com/results?search_query=${ytTerm}`;
    const res = await fetch(url, {
      next: { revalidate: 0 },
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const text = await res.text();
    const clean = text
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000);
    if (clean.length > 200) {
      results.push(`YOUTUBE DATA:\n${clean}`);
    }
  } catch (e) {
    console.log('YouTube failed:', e);
  }

  return results.join('\n\n');
}