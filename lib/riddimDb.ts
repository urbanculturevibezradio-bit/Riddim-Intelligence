import clientPromise from './mongodb';

export async function searchRiddims(query: string) {
  try {
    const client = await clientPromise;
    const db = client.db('riddim-intelligence');
    const collection = db.collection('riddims');

    const results = await collection.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { aliases: { $regex: query, $options: 'i' } },
        { producers: { $regex: query, $options: 'i' } },
        { songs: { $elemMatch: { title: { $regex: query, $options: 'i' } } } },
        { songs: { $elemMatch: { artist: { $regex: query, $options: 'i' } } } },
      ]
    }).toArray();

    return results;
  } catch (error) {
    console.error('searchRiddims error:', error);
    return [];
  }
}

export async function saveRiddim(riddim: Record<string, unknown>) {
  try {
    const client = await clientPromise;
    const db = client.db('riddim-intelligence');
    const result = await db.collection('riddims').insertOne(riddim);
    return result;
  } catch (error) {
    console.error('saveRiddim error:', error);
    throw error;
  }
}