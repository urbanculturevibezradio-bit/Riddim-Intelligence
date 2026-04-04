import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function searchExternalSources(query: string): Promise<string> {
  const riddimMatch = query.match(/([a-zA-Z\s]+)\s*riddim/i);
  const searchTerm = riddimMatch
    ? riddimMatch[1].trim()
    : query;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [
        {
          role: 'user',
          content: `Search riddimguide.com and riddim-id.com for information about the "${searchTerm} Riddim". Return only factual data: riddim name, year, producer, label, and list of songs with artists. No commentary.`
        }
      ]
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    return text || '';

  } catch (e) {
    console.log('External search failed:', e);
    return '';
  }
}