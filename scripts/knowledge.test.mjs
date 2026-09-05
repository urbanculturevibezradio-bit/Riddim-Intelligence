// scripts/knowledge.test.mjs — regression tests for Archive Ask Bot entity resolution.
// Run:  node scripts/knowledge.test.mjs   (or npm test)
import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEntityText,
  bareTopic,
  resolveEntity,
  buildEntityContext,
  searchEntities,
  topEntityScore,
  ARCHIVE_ENTITIES,
} from "../lib/entities.mts";

test("normalizeEntityText lowercases and strips punctuation", () => {
  assert.equal(normalizeEntityText("Ninja Man?"), "ninja man");
  assert.equal(normalizeEntityText("  DESMOND   Ballentine "), "desmond ballentine");
  assert.equal(normalizeEntityText("Who's Ninja-Man?!"), "who s ninja man");
});

test("bareTopic strips question phrasing", () => {
  assert.equal(bareTopic("Who is Ninja Man?"), "ninja man");
  assert.equal(
    bareTopic("What era was Ninjaman most associated with?"),
    "was ninjaman most associated with"
  );
});

test("Ninja Man / Ninjaman / Desmond Ballentine / Brother Desmond all resolve to Ninjaman", () => {
  assert.equal(resolveEntity("Who is Ninja Man?")?.name, "Ninjaman");
  assert.equal(resolveEntity("Who is Ninjaman?")?.name, "Ninjaman");
  assert.equal(resolveEntity("Who is Desmond Ballentine?")?.name, "Ninjaman");
  assert.equal(resolveEntity("Who is Brother Desmond?")?.name, "Ninjaman");
});

test("other dancehall stage-name / real-name aliases resolve", () => {
  assert.equal(resolveEntity("Who is Bounty Killer?")?.name, "Bounty Killer");
  assert.equal(resolveEntity("Who is Rodney Price?")?.name, "Bounty Killer");
  assert.equal(resolveEntity("Who is Beenie Man?")?.name, "Beenie Man");
  assert.equal(resolveEntity("Who is Moses Davis?")?.name, "Beenie Man");
  assert.equal(resolveEntity("Who is Vybz Kartel?")?.name, "Vybz Kartel");
  assert.equal(resolveEntity("Who is Adidja Palmer?")?.name, "Vybz Kartel");
  assert.equal(resolveEntity("Who is Super Cat?")?.name, "Super Cat");
  assert.equal(resolveEntity("Who is Wild Apache?")?.name, "Super Cat");
  assert.equal(resolveEntity("Who is Capleton?")?.name, "Capleton");
  assert.equal(resolveEntity("Who is Clifton Bailey?")?.name, "Capleton");
  assert.equal(resolveEntity("Who is Sizzla?")?.name, "Sizzla");
  assert.equal(resolveEntity("Who is Miguel Collins?")?.name, "Sizzla");
  assert.equal(resolveEntity("Who is Shabba Ranks?")?.name, "Shabba Ranks");
  assert.equal(resolveEntity("Who is Rexton Gordon?")?.name, "Shabba Ranks");
  assert.equal(resolveEntity("Who is Buju Banton?")?.name, "Buju Banton");
  assert.equal(resolveEntity("Who is Mark Myrie?")?.name, "Buju Banton");
});

test("era question still resolves the artist", () => {
  const e = resolveEntity("What era was Ninjaman most associated with?");
  assert.ok(e);
  assert.ok(e.name === "Ninjaman" || e.type === "era");
});

test("'Who is Ninja Man?' context contains the Desmond Ballentine record", () => {
  const ctx = buildEntityContext("Who is Ninja Man?");
  assert.equal(ctx.resolved?.name, "Ninjaman");
  assert.ok(ctx.context.includes("Desmond John Ballentine"));
  assert.ok(ctx.context.includes("1980s"));
});

test("broad archive questions still return context", () => {
  const clash = buildEntityContext("Tell me about Jamaican sound clash culture.");
  assert.ok(clash.context.length > 0);

  const nineties = buildEntityContext("Which artists were important in 1990s dancehall?");
  assert.ok(nineties.context.length > 0);
  assert.ok(nineties.context.includes("1990s"));

  const deejays = searchEntities("Who are some major dancehall deejays from the 80s and 90s?");
  assert.ok(deejays.length > 0);
});

test("archive store contains all required major artists", () => {
  const names = new Set(ARCHIVE_ENTITIES.map((e) => e.name));
  for (const n of [
    "Ninjaman",
    "Bounty Killer",
    "Beenie Man",
    "Vybz Kartel",
    "Super Cat",
    "Capleton",
    "Sizzla",
    "Shabba Ranks",
    "Buju Banton",
  ]) {
    assert.ok(names.has(n), `missing archive record: ${n}`);
  }
});

test("topEntityScore separates real archive topics from keyword noise", () => {
  // Real broad archive topics score high enough to stay in the Archive.
  assert.ok(topEntityScore("Tell me about Jamaican sound clash culture.") >= 2);
  assert.ok(topEntityScore("Who are the pioneers of dub music?") >= 2);
  // Unknown names must score low so /api/knowledge falls through to live research.
  assert.ok(topEntityScore("Who is Roots By Nature?") < 2);
  assert.ok(topEntityScore("Who is Stonebwoy?") < 2);
});
