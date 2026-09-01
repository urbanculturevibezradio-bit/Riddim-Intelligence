import { Filter, Document } from "mongodb";
import getMongoClient from "./mongodb";

// Archive Ask Bot — MongoDB lookup. Archive data only (B.md hard rules).
export async function searchArchive(topic: string): Promise<Document[]> {
  try {
    const client = await getMongoClient();
    const db = client.db("riddim-intelligence");
    const collection = db.collection("artists");

    const words = topic
      .toLowerCase()
      .replace(/[?.,!;:'"“”‘’()]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    if (!words.length) return [];

    const clauses: Filter<Document>[] = [];
    for (const w of words) {
      clauses.push({ name: { $regex: w, $options: "i" } });
      clauses.push({ realName: { $regex: w, $options: "i" } });
      clauses.push({ aliases: { $regex: w, $options: "i" } });
    }

    return await collection.find({ $or: clauses }).limit(6).toArray();
  } catch (error) {
    console.error("searchArchive error:", error);
    return [];
  }
}
