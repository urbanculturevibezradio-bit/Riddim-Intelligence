// data/seedArtists.mjs — seed the MongoDB archive entities collection.
// Single source of truth: lib/entities.mts (B.md hard rules: archive data only).
// Run:  npm run seed:archive
import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { ARCHIVE_ENTITIES } from "../lib/entities.mts";

function mongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  try {
    const envFile = readFileSync(".env.local", "utf8");
    const m = envFile.match(/MONGODB_URI=(.+)/);
    return m?.[1]?.trim() ?? "";
  } catch {
    return "";
  }
}

const uri = mongoUri();
if (!uri) {
  console.error("MONGODB_URI is missing. Set it in .env.local or the environment.");
  process.exit(1);
}

const client = new MongoClient(uri);

async function seed() {
  await client.connect();
  const db = client.db("riddim-intelligence");
  const collection = db.collection("artists");

  for (const entity of ARCHIVE_ENTITIES) {
    await collection.updateOne(
      { id: entity.id },
      { $set: { ...entity, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    console.log(`Saved: ${entity.name} (${entity.type})`);
  }

  console.log(`Seeded ${ARCHIVE_ENTITIES.length} archive entities into 'artists'.`);
  await client.close();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
