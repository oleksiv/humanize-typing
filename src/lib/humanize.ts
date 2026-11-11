// Makes clean text look hand-typed. No AI: fixed tables and seeded random only.
// Two passes:
//   1. loosen: always the same. Contractions, plain words, no em dashes or curly quotes.
//   2. slips: random. Each call draws its own "sloppiness", so some results are
//      clean and some messy.
// Pass 2 never adds or removes whitespace, so `clean` and `text` align word by word.

// How likely each slip is at full sloppiness (0 = never, 1 = always).
// typo is per word, dropApostrophe per apostrophe; the rest are per sentence.
export type Rates = {
  typo: number;
  dropApostrophe: number;
  lowerI: number;
  lowerStart: number;
  doubleComma: number;
  dropPeriod: number;
  runOn: number;
};

// label: shown in the menu. rates: how often each slip appears.
export const PRESETS = {
  message: {
    label: "Chat message",
    rates: { typo: 0.06, dropApostrophe: 0.3, lowerI: 0.4, lowerStart: 0.7, doubleComma: 0.15, dropPeriod: 0.5, runOn: 0.2 },
  },
  text: {
    label: "Quick text to a friend",
    rates: { typo: 0.08, dropApostrophe: 0.6, lowerI: 0.9, lowerStart: 0.95, doubleComma: 0.1, dropPeriod: 0.9, runOn: 0.4 },
  },
  post: {
    label: "Social post or comment",
    rates: { typo: 0.04, dropApostrophe: 0.15, lowerI: 0.2, lowerStart: 0.3, doubleComma: 0.1, dropPeriod: 0.3, runOn: 0.3 },
  },
  email: {
    label: "Work email",
    rates: { typo: 0.03, dropApostrophe: 0.03, lowerI: 0, lowerStart: 0, doubleComma: 0.05, dropPeriod: 0.05, runOn: 0.1 },
  },
} satisfies Record<string, { label: string; rates: Rates }>;

export type PresetName = keyof typeof PRESETS;

export type Options = { seed?: number; sloppiness?: number; rates?: Rates };

// ---- pass 1: loosen ----

// safe anywhere in a sentence
const SWAPS: Record<string, string> = {
  "do not": "don't",
  "does not": "doesn't",
  "did not": "didn't",
  "is not": "isn't",
  "are not": "aren't",
  "was not": "wasn't",
  "were not": "weren't",
  "will not": "won't",
  "would not": "wouldn't",
  "should not": "shouldn't",
  "could not": "couldn't",
  "have not": "haven't",
  "has not": "hasn't",
  "had not": "hadn't",
  "cannot": "can't",
  "can not": "can't",
  "in order to": "to",
  "due to the fact that": "because",
  "prior to": "before",
  "utilize": "use",
  "utilizes": "uses",
  "utilized": "used",
  "utilizing": "using",
  "additionally": "also",
  "furthermore": "also",
  "moreover": "also",
  "therefore": "so",
  "approximately": "about",
};

// only before another word: "it is fine" -> "it's fine", but "yes, it is." stays
const SWAPS_BEFORE_WORD: Record<string, string> = {
  "i am": "I'm",
  "i will": "I'll",
  "i would": "I'd",
  "you are": "you're",
  "we are": "we're",
  "they are": "they're",
  "you will": "you'll",
  "we will": "we'll",
  "they will": "they'll",
  "it will": "it'll",
  "it is": "it's",
  "that is": "that's",
  "there is": "there's",
  "here is": "here's",
  "what is": "what's",
};

// the lookarounds keep matches out of links, emails and paths
const phrases = (table: Record<string, string>, after: string) =>
  new RegExp(`(?<![\\w/@-])(?:${Object.keys(table).join("|")})${after}`, "gi");
const ANYWHERE = phrases(SWAPS, "(?![\\w/@-])");
const BEFORE_WORD = phrases(SWAPS_BEFORE_WORD, "(?= [a-z])");

const swap = (table: Record<string, string>) => (match: string) => {
  const key = match.toLowerCase();
  const capital = key[0].toUpperCase() + key.slice(1);
  // other casing, such as DO NOT, is emphasis: leave it
  if (match !== key && match !== capital) return match;
  const out = table[key];
  return match === capital ? out[0].toUpperCase() + out.slice(1) : out;
};

export function loosen(text: string) {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/(?<=\S) *— *(?=\S)/g, ", ")
    .replace(/^(Certainly|Sure|Of course|Absolutely|Great question)! +/, "")
    .replace(/I hope this (message|email) finds you well[.!]\s*/g, "")
    .replace(ANYWHERE, swap(SWAPS))
    .replace(BEFORE_WORD, swap(SWAPS_BEFORE_WORD));
}

// ---- pass 2: slips ----

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

// spelling mistakes people really make, each one letter off
const MISSPELL: Record<string, string> = {
  definitely: "definately",
  separate: "seperate",
  receive: "recieve",
  believe: "beleive",
  tomorrow: "tommorow",
  probably: "probaly",
  because: "becuase",
  really: "realy",
  different: "diffrent",
  until: "untill",
  which: "wich",
  weird: "wierd",
  their: "thier",
  friend: "freind",
  business: "buisness",
  calendar: "calender",
  occurred: "occured",
  necessary: "neccessary",
  beginning: "begining",
  government: "goverment",
  immediately: "immediatly",
  actually: "actualy",
  interesting: "intresting",
};

function typo(word: string, rnd: () => number) {
  if (Object.hasOwn(MISSPELL, word) && rnd() < 0.5) return MISSPELL[word];
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
  const clean = loosen(text);

  const lines = clean.split("\n").map((line) => {
    // [sentence, whitespace, sentence, whitespace, ...]
    const parts = line.split(/(?<=[.!?])(\s+)/);
    for (let i = 0; i < parts.length; i += 2) {
      // ponytail: also lowercases names at sentence start ("John" -> "john");
      // add a name list if that matters
      const lowerable = /^([A-Z][a-z]|I\b)/.test(parts[i]);
      let sent = parts[i];
      if (rnd() < s * p.lowerI) sent = sent.replace(/\bI\b/g, "i");

      // typos come in bursts: after one, the rest of the sentence is 3x as likely
      let burst = 1;
      sent = sent
        .split(/(\s+)/)
        .map((token) =>
          PROTECTED.test(token)
            ? token
            : token
                .replace(/\b[a-z]{4,}\b/g, (w) => {
                  if (rnd() >= s * p.typo * burst) return w;
                  burst = 3;
                  return typo(w, rnd);
                })
                .replace(/(?<=[a-zA-Z])'(?=[a-z])/g, (a) => (rnd() < s * p.dropApostrophe ? "" : a)),
        )
        .join("");

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

  return { text: lines.join("\n"), clean, sloppiness: s };
}
