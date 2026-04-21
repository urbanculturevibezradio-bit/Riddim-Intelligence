import { NextResponse } from "next/server";
import { externalSearch } from "@/lib/externalSearch";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  if (!q) {
    return NextResponse.json(
      { error: "Missing ?q parameter" },
      { status: 400 }
    );
  }

  try {
    const data = await externalSearch(q, {
      maxPerSource: 5,
      debug: true,
      youtubeApiKey: process.env.YT_API_KEY,
      sources: {
        riddimGuide: true,
        riddimId: true,
        youtube: true,
      },
    });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Search failed" },
      { status: 500 }
    );
  }
}
