import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import clientPromise from '../../../lib/mongodb';
import { searchRiddims } from '../../../lib/riddimDb';
import { searchExternalSources } from '../../../lib/externalSearch';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are Riddim Intelligence — a Dancehall and Reggae knowledge system.

STRICT RULES:
1. If VERIFIED DATABASE RESULTS are provided, use ONLY that data. Do not add anything not in the verified data.
2. If EXTERNAL SEARCH DATA is provided, present it clearly and factually. Do not add anything beyond what the data contains.
3. If NO data at all is provided, say: "I don't have verified data on that riddim yet."
4. NEVER hallucinate. NEVER guess. NEVER invent artists, songs, or facts.
5. Wrong Dancehall information destroys credibility. Silence is better than a lie.`;

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
      contextPrompt = `EXTERNAL SEARCH DATA:
${externalData}

USER QUESTION: ${question}

Answer using the data above. Be factual and direct.`;
    } else {
      contextPrompt = `USER QUESTION: ${question}

No data found for this query. Follow your strict rules.`;
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
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}