import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('riddim-intelligence');
    const collection = db.collection('riddims');

    const riddims = [
      {
        name: 'Tempo Riddim',
        aliases: ['Tempo Riddim 1', 'Original Tempo'],
        year: 1985,
        producer: 'King Tubby',
        label: 'Firehouse',
        era: 'Digital',
        songs: [
          { artist: 'Anthony Red Rose', title: 'Tempo', notable: true },
          { artist: 'Tenor Saw', title: 'Run Come Call Me', notable: true },
          { artist: 'Cocoa Tea', title: 'I Lost My Son', notable: true },
          { artist: 'Super Cat', title: 'Trash and Ready', notable: true },
          { artist: 'Shabba Ranks', title: '', notable: false },
          { artist: 'Capleton', title: '', notable: false },
          { artist: 'Johnny Osbourne', title: '', notable: false },
          { artist: 'Conroy Smith', title: '', notable: false },
        ],
        culturalSignificance: 'One of the defining digital dancehall riddims of the mid-80s. Produced by dub pioneer King Tubby under his Firehouse imprint.',
        verifiedByBenny: true,
        source: 'Benny cultural knowledge base',
        updatedAt: new Date(),
      },
      {
        name: 'Tempo Riddim',
        aliases: ['Tempo Riddim 2', 'Penthouse Tempo'],
        year: 1990,
        producer: 'Donovan Germain',
        label: 'Penthouse',
        era: 'Dancehall',
        songs: [
          { artist: 'Buju Banton & Garnett Silk', title: 'Complaint', notable: true },
        ],
        culturalSignificance: 'The second Tempo Riddim produced by Donovan Germain on the legendary Penthouse label. Buju Banton and Garnett Silk\'s "Complaint" is one of the most iconic songs in all of Dancehall music history.',
        verifiedByBenny: true,
        source: 'Benny cultural knowledge base',
        updatedAt: new Date(),
      },
    ];

    for (const riddim of riddims) {
      await collection.updateOne(
        { name: riddim.name, year: riddim.year },
        { $set: riddim, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );
    }

    return NextResponse.json({ success: true, message: `Seeded ${riddims.length} riddims` });

  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}