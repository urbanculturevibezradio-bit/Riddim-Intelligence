"use client";

import { useState } from "react";

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResults("");

    try {
      const res = await fetch(`/api/riddim?q=${encodeURIComponent(query)}`);

      const data = await res.json();
      if (!res.ok) {
        setResults(`Error: ${data.error || res.statusText}`);
        return;
      }

      if (!data.results?.length) {
        setResults("No results found.");
        return;
      }

      const lines = data.results.map((r: any) => {
        const tracks = r.tracks?.length
          ? r.tracks.slice(0, 3).map((t: any) => `  • ${t.artist} – ${t.title}`).join("\n")
          : "  (no tracklist)";
        return `[${r.source.toUpperCase()}] ${r.title} (${Math.round(r.confidence * 100)}%)\n${tracks}`;
      });
      setResults(lines.join("\n\n"));
    } catch (err) {
      setResults("Error fetching results.");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-black text-zinc-100 px-6 py-16">
      <h1 className="text-4xl font-bold mb-8 tracking-tight">
        Riddim Intelligence
      </h1>

      <form
        onSubmit={handleSearch}
        className="w-full max-w-xl flex gap-3 mb-10"
      >
        <input
          type="text"
          placeholder="Search riddim…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition font-semibold"
        >
          Search
        </button>
      </form>

      {loading && (
        <div className="text-lg text-zinc-400 animate-pulse">
          Searching external sources…
        </div>
      )}

      {!loading && results && (
        <pre className="whitespace-pre-wrap bg-zinc-900 border border-zinc-700 p-6 rounded-lg max-w-2xl w-full text-sm leading-relaxed">
          {results}
        </pre>
      )}
    </div>
  );
}
