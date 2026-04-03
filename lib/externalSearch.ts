export async function searchExternalSources(query: string): Promise<string> {
  const results: string[] = [];

  const riddimMatch = query.match(/([a-zA-Z\s]+)\s*riddim/i);
  const searchTerm = riddimMatch
    ? riddimMatch[1].trim().toLowerCase().replace(/\s+/g, '-')
    : query.toLowerCase().replace(/\s+/g, '-');

  // Search Riddim Guide
  try {
    const url = `https://www.riddimguide.com/tunes?riddim=${searchTerm}`;
    const res = await fetch(url, { 
      next: { revalidate: 0 },
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const text = await res.text();
    const clean = text
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1500);
    if (clean.length > 200 && !clean.includes('Not Found')) {
      results.push(`RIDDIM GUIDE: ${clean}`);
    }
  } catch (e) {
    console.log('Riddim Guide failed:', e);
  }

  return results.join('\n\n');
}