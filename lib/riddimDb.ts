import clientPromise from './mongodb';
import { RiddimEntry } from './riddimSchema';

const DB_NAME = 'riddim-intelligence';
const COLLECTION = 'riddims';

export async function saveRiddim(entry: RiddimEntry) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION);

  const doc = {
    ...entry,
    updatedAt: new Date(),
  };

  const result = await collection.updateOne(
    { name: entry.name, year: entry.year },
    { $set: doc, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );

  return result;
}

export async function getRiddim(name: string) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION);

  return collection.findOne({
    name: { $regex: new RegExp(name, 'i') }
  });
}

export async function searchRiddims(query: string) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION);

  return collection.find({
    $or: [
      { name: { $regex: new RegExp(query, 'i') } },
      { producer: { $regex: new RegExp(query, 'i') } },
      { 'songs.artist': { $regex: new RegExp(query, 'i') } },
      { 'songs.title': { $regex: new RegExp(query, 'i') } },
    ]
  }).toArray();
}

export async function getAllRiddims() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION);

  return collection.find({}).sort({ year: -1 }).toArray();
}