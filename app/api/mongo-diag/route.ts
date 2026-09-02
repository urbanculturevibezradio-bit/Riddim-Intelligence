import { NextResponse } from "next/server";

// TEMPORARY diagnostic endpoint — inspects MONGODB_URI inside the Vercel
// runtime (decrypted automatically) WITHOUT exposing the secret.
// Reports only: scheme, username, host, password length, special-char flags,
// redacted URI, and a live connection result. DELETE after use.
export async function POST() {
  const uri = process.env.MONGODB_URI || "";

  if (!uri) {
    return NextResponse.json(
      { ok: false, error: "MONGODB_URI not set in this environment" },
      { status: 500 }
    );
  }

  let parsed: any = {};
  try {
    const u = new URL(uri);
    const password = u.password;
    u.password = "***REDACTED***";
    parsed = {
      redactedUri: u.toString(),
      protocol: u.protocol,
      username: u.username,
      host: u.host,
      pathname: u.pathname,
      search: u.search,
      passwordLength: password.length,
      passwordHasSpecialChars: /[^A-Za-z0-9]/.test(password),
      passwordHasPercentEncoding: /%/.test(password),
    };
  } catch (e: any) {
    parsed = { parseError: e?.message || String(e) };
  }

  let conn: any = { tested: false };
  try {
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    conn = { tested: true, ok: true };
    await client.close();
  } catch (e: any) {
    conn = {
      tested: true,
      ok: false,
      errorName: e?.name || "Error",
      errorMessage: e?.message || String(e),
    };
  }

  return NextResponse.json({ ok: true, parsed, conn });
}
