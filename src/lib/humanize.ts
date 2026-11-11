// Adds the small slips of real typing to clean text. No AI: seeded random only.
// Each call draws its own "sloppiness", so some results are clean and some messy.
// Whitespace is never added or removed, so input and output align word by word.

// How likely each slip is at full sloppiness (0 = never, 1 = always).
// typo is per word; the rest are per sentence.
export type Rates = {
  typo: number;
  lowerI: number;
  lowerStart: number;
  doubleComma: number;
  dropPeriod: number;
  runOn: number;
};

// label: shown in the menu. tone: tells the AI step how to word the rewrite.
// rates: tells the function how often to slip.
export const PRESETS = {
  message: {
    label: "Chat message",
    tone: "a casual chat message to a colleague: relaxed, direct, contractions, short sentences",
    rates: { typo: 0.06, lowerI: 0.4, lowerStart: 0.7, doubleComma: 0.15, dropPeriod: 0.5, runOn: 0.2 },
  },
  text: {
    label: "Quick text to a friend",
    tone: "a quick text to a friend: short, informal, no greeting or sign-off unless the original has one",
    rates: { typo: 0.08, lowerI: 0.9, lowerStart: 0.95, doubleComma: 0.1, dropPeriod: 0.9, runOn: 0.4 },
  },
  post: {
    label: "Social post or comment",
    tone: "a social media post or comment: conversational and personal, no hashtags",
    rates: { typo: 0.04, lowerI: 0.2, lowerStart: 0.3, doubleComma: 0.1, dropPeriod: 0.3, runOn: 0.3 },
  },
  email: {
    label: "Work email",
    tone: "a work email: polite and plain, natural instead of formal, keeping the greeting and sign-off",
    rates: { typo: 0.03, lowerI: 0, lowerStart: 0, doubleComma: 0.05, dropPeriod: 0.05, runOn: 0.1 },
  },
} satisfies Record<string, { label: string; tone: string; rates: Rates }>;

export type PresetName = keyof typeof PRESETS;

export type Options = { seed?: number; sloppiness?: number; rates?: Rates };

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

function nearbyKey(c: string, rnd: () => number) {
  for (const [r, row] of ROWS.entries()) {
    const i = row.indexOf(c);
    if (i < 0) continue;
    const keys = [row[i - 1], row[i + 1], ROWS[r - 1]?.[i], ROWS[r + 1]?.[i]].filter(Boolean);
    return keys[Math.floor(rnd() * keys.length)];
  }
  return c;
}

function typo(word: string, rnd: () => number) {
  const i = Math.floor(rnd() * (word.length - 1));
  const r = rnd();
  if (r < 0.4) return word.slice(0, i) + nearbyKey(word[i], rnd) + word.slice(i + 1);
  if (r < 0.7) return word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
  if (r < 0.9) return word.slice(0, i) + word.slice(i + 1);
  return word.slice(0, i + 1) + word.slice(i);
}

// links, emails, paths, anything with digits
const PROTECTED = /[@/\\\d]|\.\w/;

// a single closing period, not an ellipsis
const endsInPeriod = (s: string) => /[^.]\.$/.test(s);

export function humanize(
  text: string,
  { seed, sloppiness, rates: p = PRESETS.message.rates }: Options = {},
) {
  const rnd = mulberry32(seed ?? Math.floor(Math.random() * 2 ** 31));
  // skewed low: most messages come out fairly clean
  const s = sloppiness ?? rnd() ** 1.8;

  const lines = text.split("\n").map((line) => {
    // [sentence, whitespace, sentence, whitespace, ...]
    const parts = line.split(/(?<=[.!?])(\s+)/);
    for (let i = 0; i < parts.length; i += 2) {
      let sent = parts[i]
        .split(/(\s+)/)
        .map((token) =>
          PROTECTED.test(token)
            ? token
            : token.replace(/\b[a-z]{4,}\b/g, (w) => (rnd() < s * p.typo ? typo(w, rnd) : w)),
        )
        .join("");

      if (rnd() < s * p.lowerI) sent = sent.replace(/\bI\b/g, "i");
      // ponytail: also lowercases names at sentence start ("John" -> "john");
      // add a name list if that matters
      const lowerable = /^([A-Z][a-z]|I\b)/.test(sent);
      if (lowerable && rnd() < s * p.lowerStart) sent = sent[0].toLowerCase() + sent.slice(1);
      if (rnd() < s * p.doubleComma) sent = sent.replace(",", ",,");
      if (endsInPeriod(sent) && rnd() < s * p.dropPeriod) sent = sent.slice(0, -1);
      // run-on: join to the previous sentence with a comma
      if (i >= 2 && endsInPeriod(parts[i - 2]) && lowerable && rnd() < s * p.runOn) {
        parts[i - 2] = parts[i - 2].slice(0, -1) + ",";
        sent = sent[0].toLowerCase() + sent.slice(1);
      }
      parts[i] = sent;
    }
    return parts.join("");
  });

  return { text: lines.join("\n"), sloppiness: s };
}
