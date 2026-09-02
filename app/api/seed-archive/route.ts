import { NextResponse } from "next/server";
import { getMongoClient } from "@/lib/mongodb";
import { ARCHIVE_ENTITIES } from "@/lib/entities.mts";

// TEMPORARY one-off seeding endpoint — runs in Vercel runtime where
// MONGODB_URI is decrypted automatically. DELETE after use.
export async function POST() {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { ok: false, error: "MONGODB_URI not set in this environment" },
      { status: 500 }
    );
  }

  try {
    const client = await getMongoClient();
    const db = client.db("riddim-intelligence");
    const collection = db.collection("artists");

    let saved = 0;
    for (const entity of ARCHIVE_ENTITIES) {
      await collection.updateOne(
        { id: entity.id },
        {
          $set: { ...entity, updatedAt: new Date() },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
      saved += 1;
    }

    const total = await collection.countDocuments();
    return NextResponse.json({ ok: true, saved, total });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "seed failed" },
      { status: 500 }
    );
  }
}
