// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { humanize, loosen, PRESETS, type Rates } from "./humanize.ts";

const text =
  "Hey, I finished the comparison. See https://example.com/report.html or mail me@example.com about 2024 numbers.\n\nI think the second one was the most consistent overall. Let me know.";

const OFF: Rates = { typo: 0, dropApostrophe: 0, lowerI: 0, lowerStart: 0, doubleComma: 0, dropPeriod: 0, runOn: 0 };
// one slip always on, everything else off
const only = (key: keyof Rates) => ({ sloppiness: 1, rates: { ...OFF, [key]: 1 } });
const seeds = Array.from({ length: 200 }, (_, i) => i);

test("sloppiness 0 changes nothing", () => {
  for (const { rates } of Object.values(PRESETS))
    assert.equal(humanize(text, { sloppiness: 0, rates }).text, text);
});

test("all rates at 0 change nothing, even at full sloppiness", () => {
  for (const seed of seeds) assert.equal(humanize(text, { seed, sloppiness: 1, rates: OFF }).text, text);
});

test("same seed gives the same result, different seeds differ", () => {
  assert.deepEqual(humanize(text, { seed: 7 }), humanize(text, { seed: 7 }));
  const results = new Set(seeds.map((seed) => humanize(text, { seed, sloppiness: 1 }).text));
  assert.ok(results.size > 150);
});

test("links, emails, numbers and whitespace survive every preset", () => {
  for (const { rates } of Object.values(PRESETS))
    for (const seed of seeds) {
      const out = humanize(text, { seed, sloppiness: 1, rates }).text;
      assert.ok(out.includes("https://example.com/report.html"));
      assert.ok(out.includes("me@example.com"));
      assert.ok(out.includes("2024"));
      assert.deepEqual(out.match(/\s+/g), text.match(/\s+/g));
    }
});

test("lowerI only lowercases the word I", () => {
  assert.equal(humanize(text, only("lowerI")).text, text.replace(/\bI\b/g, "i"));
});

test("lowerStart only lowercases sentence starts", () => {
  const out = humanize(text, only("lowerStart")).text;
  assert.equal(
    out,
    "hey, I finished the comparison. see https://example.com/report.html or mail me@example.com about 2024 numbers.\n\ni think the second one was the most consistent overall. let me know.",
  );
});

test("lowerStart leaves acronyms alone", () => {
  assert.equal(humanize("API keys are ready.", only("lowerStart")).text, "API keys are ready.");
});

test("dropPeriod only removes sentence-ending periods", () => {
  assert.equal(humanize(text, only("dropPeriod")).text, text.replace(/\.(?=\s|$)/g, ""));
});

test("dropPeriod keeps question and exclamation marks", () => {
  assert.equal(humanize("Really? Yes!", only("dropPeriod")).text, "Really? Yes!");
});

test("loosen contracts, keeping case and leaving sentence ends and emphasis alone", () => {
  assert.equal(loosen("I will not go. It is fine."), "I won't go. It's fine.");
  assert.equal(loosen("Do not worry, we are ready and you cannot fail."), "Don't worry, we're ready and you can't fail.");
  assert.equal(loosen("Yes, it is. Here I am."), "Yes, it is. Here I am.");
  assert.equal(loosen("DO NOT touch it."), "DO NOT touch it.");
  assert.equal(loosen("Please let us know."), "Please let us know.");
});

test("loosen swaps stiff words and strips AI openers", () => {
  assert.equal(loosen("Additionally, we utilize it in order to save time."), "Also, we use it to save time.");
  assert.equal(loosen("Certainly! Here it is."), "Here it is.");
  assert.equal(loosen("Hi Sam,\n\nI hope this email finds you well. I have news."), "Hi Sam,\n\nI have news.");
});

test("loosen straightens quotes and removes em dashes", () => {
  assert.equal(loosen("It’s “done” — mostly…"), "It's \"done\", mostly...");
  assert.equal(loosen("one—two"), "one, two");
});

test("loosen leaves links, emails and paths alone", () => {
  const safe = "See https://example.com/utilize/do-not or mail utilize@example.com about src/cannot/x.";
  assert.equal(loosen(safe), safe);
});

test("the result carries the loosened text, and slips never touch its whitespace", () => {
  const stiff = "I do not know. It is what we will utilize.";
  for (const seed of seeds) {
    const out = humanize(stiff, { seed, sloppiness: 1, rates: PRESETS.text.rates });
    assert.equal(out.clean, "I don't know. It's what we'll use.");
    assert.deepEqual(out.text.match(/\s+/g), out.clean.match(/\s+/g));
  }
});

test("dropApostrophe only removes apostrophes inside words", () => {
  assert.equal(
    humanize("I don't think it's Sam's. 'Quoted' stays.", only("dropApostrophe")).text,
    "I dont think its Sams. 'Quoted' stays.",
  );
});

test("lowerI and dropApostrophe together give im, not Im", () => {
  const rates = { ...OFF, lowerI: 1, dropApostrophe: 1 };
  assert.equal(humanize("I am sure I'm right.", { sloppiness: 1, rates }).text, "im sure im right.");
});

test("known misspellings show up, and odd words do not crash", () => {
  const outs = new Set(seeds.map((seed) => humanize("we really do", { seed, ...only("typo") }).text));
  assert.ok(outs.has("we realy do"));
  for (const seed of seeds) humanize("constructor prototype valueof", { seed, ...only("typo") });
});

test("an ellipsis is never cut short or turned into a run-on", () => {
  const dots = "Wait... Let me check.";
  assert.equal(humanize(dots, only("dropPeriod")).text, "Wait... Let me check");
  assert.equal(humanize(dots, only("runOn")).text, dots);
});

test("doubleComma doubles the first comma of a sentence and nothing else", () => {
  const out = humanize(text, only("doubleComma")).text;
  assert.ok(out.startsWith("Hey,, I finished"));
  assert.equal(out.replace(/,,/g, ","), text);
});

test("runOn joins sentences with a comma and changes no words", () => {
  const out = humanize(text, only("runOn")).text;
  assert.ok(out.includes("comparison, see"));
  assert.ok(out.includes("overall, let me know."));
  const flat = (s: string) => s.replace(/,/g, ".").toLowerCase();
  assert.equal(flat(out), flat(text));
});

test("typo only hits lowercase words of 4+ letters, one edit each", () => {
  const before = text.split(/\s+/);
  for (const seed of seeds) {
    const after = humanize(text, { seed, ...only("typo") }).text.split(/\s+/);
    after.forEach((word, i) => {
      if (word === before[i]) return;
      assert.match(before[i], /\b[a-z]{4,}\b/, `"${before[i]}" should not get a typo`);
      assert.ok(Math.abs(word.length - before[i].length) <= 1, `"${before[i]}" -> "${word}"`);
    });
  }
});

test("a rate is the real frequency of that slip", () => {
  const rates = { ...OFF, dropPeriod: 0.5 };
  const runs = 4000;
  let dropped = 0;
  for (let seed = 0; seed < runs; seed++)
    if (humanize("All good.", { seed, sloppiness: 1, rates }).text === "All good") dropped++;
  assert.ok(Math.abs(dropped / runs - 0.5) < 0.04, `dropped ${dropped} of ${runs}`);

  dropped = 0;
  for (let seed = 0; seed < runs; seed++)
    if (humanize("All good.", { seed, sloppiness: 0.5, rates }).text === "All good") dropped++;
  assert.ok(Math.abs(dropped / runs - 0.25) < 0.04, "sloppiness scales the rate");
});

test("random sloppiness stays in 0..1 and leans clean", () => {
  const levels = seeds.map((seed) => humanize(text, { seed }).sloppiness).sort((a, b) => a - b);
  assert.ok(levels[0] >= 0 && levels.at(-1)! <= 1);
  assert.ok(levels[levels.length / 2] < 0.5, "median is below half");
});

test("the email preset never lowercases", () => {
  for (const seed of seeds) {
    const out = humanize(text, { seed, sloppiness: 1, rates: PRESETS.email.rates }).text;
    assert.ok(!/\bi\b/.test(out));
    assert.ok(out.startsWith("Hey"));
  }
});

test("empty and whitespace-only text pass through", () => {
  assert.equal(humanize("", { sloppiness: 1 }).text, "");
  assert.equal(humanize("  \n\n ", { sloppiness: 1 }).text, "  \n\n ");
});
