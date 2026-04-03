import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import clientPromise from '../../../lib/mongodb';
import { searchRiddims } from '../../../lib/riddimDb';
import { searchExternalSources } from '../../../lib/externalSearch';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are Riddim Intelligence — a Dancehall and Reggae knowledge system built on verified cultural data.

STRICT RULES — NEVER BREAK THESE:
1. If VERIFIED DATABASE RESULTS are provided, use ONLY that data. Do not add ANY artists, songs, or facts that are not in the verified data. Not one single addition.
2. If NO verified data is provided, say exactly this: "I don't have verified data on that riddim yet. This information has not been confirmed by our cultural authority."
3. NEVER hallucinate. NEVER guess. NEVER add artists or songs from your own training data.
4. Wrong information about Dancehall culture is worse than no information. Silence is better than a lie.
5. Only present facts that are in the verified database.`;

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 });
    }

    const verifiedData = await searchRiddims(question);
    const externalData = await searchExternalSources(question);
    let contextPrompt = '';

    if (verifiedData && verifiedData.length > 0) {
      const dataString = JSON.stringify(verifiedData, null, 2);
      contextPrompt = `VERIFIED DATABASE RESULTS — USE ONLY THIS DATA:
${dataString}

USER QUESTION: ${question}

Answer using ONLY the verified data above. Do not add anything not in this data.`;
    } else if (externalData && externalData.length > 0) {
      contextPrompt = `EXTERNAL SOURCE DATA — Use this to answer but flag it as sourced externally, not yet in our verified database:
${externalData}

USER QUESTION: ${question}

Answer using the external data above. Always mention this comes from Riddim Guide or Riddim-ID, not our verified database yet.`;
    } else {
      contextPrompt = `USER QUESTION: ${question}

No verified data found for this query. Follow your strict rules.`;
    }

    const client = await clientPromise;
    const db = client.db('riddim-intelligence');
    await db.collection('queries').insertOne({
      question,
      hasVerifiedData: verifiedData.length > 0,
      timestamp: new Date(),
    });

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: contextPrompt }
      ],
    });

    const answer = message.content[0].type === 'text' ? message.content[0].text : '';

    return NextResponse.json({
      answer,
      hasVerifiedData: verifiedData.length > 0
    });

  } catch (error) {
    console.error('Riddim Intelligence error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}