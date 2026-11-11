# Humanize typing

Paste clean text and get it back with the small slips of real typing: lowercase sentence starts, a missing period, a doubled comma, a swapped or neighbouring letter, the odd run-on sentence.

It works in two steps:

1. **AI rewrite** (optional, OpenAI): rewrites the wording so it sounds like a person, in the style you pick. It writes clean text and adds no mistakes.
2. **Slips** (no AI): a seeded random number generator adds the mistakes, in your browser.

## Set up the AI step

Create `.env.local` in the project root:

```bash
OPENAI_API_KEY=your-key
# optional, defaults to gpt-6.1-sol
# OPENAI_MODEL=another-model
```

The key stays on the server and is never sent to the browser. Without a key, step 2 still works on your original text.

If you deploy this publicly with your key, anyone who opens the page can spend your OpenAI credit. Add a login or a rate limit first.

## Why not just ask an AI to add mistakes?

A language model adds mistakes on purpose, so they come out evenly spread: one typo and one lowercase start per message. Real typing is uneven. Most messages are clean and then one has three slips in a row.

This tool draws a random "mess level" for each run, skewed toward clean, and then rolls separately for every sentence and word. Some results are untouched and some are messy.

## Using it with AI

The two halves do different jobs:

| | AI | Function |
|---|---|---|
| Job | Wording: your phrases, sentence length, tone | Slips: casing, punctuation, typos |
| Why | Good at style, bad at randomness | Truly random, knows nothing about style |
| Rule | Writes clean text, adds no mistakes | Never changes a word's meaning or the facts |

The repo ships a Claude Code skill that runs both in order. Open the project in Claude Code and ask it to humanize some text, or type `/humanize-typing`. Claude rewrites the wording, then pipes it through the function.

To make it sound like you, put 5 to 10 real messages you have written into `voice-samples.md` in the project root. That file is in `.gitignore`, so it stays private.

Without Claude Code, pipe any text through the function yourself:

```bash
echo "I will send the report tomorrow." | npm run -s humanize
echo "I will send the report tomorrow." | npm run -s humanize -- 0.6   # fixed mess level
echo "I will send the report tomorrow." | npm run -s humanize -- email # a style
```

## Styles

A style sets how often each kind of slip appears. The mess level then scales all of them for one run.

| Style | Use for | Slips |
|---|---|---|
| `message` (default) | Slack, chat, DMs | A balanced mix |
| `text` | Quick texts to friends | Mostly lowercase, few periods, more typos |
| `post` | Social posts, comments | Light, mostly clean capitals |
| `email` | Work email | Capitals always kept, a rare typo or run-on |

On the web page, pick a style from the menu, or open "Adjust each kind of slip" to set every rate yourself. In code, pass your own rates:

```ts
import { humanize, PRESETS } from "./src/lib/humanize";

humanize(text, { rates: PRESETS.email.rates });
humanize(text, { rates: { ...PRESETS.message.rates, typo: 0, dropPeriod: 1 } });
```

To add a style of your own, add an entry to `PRESETS` in [src/lib/humanize.ts](src/lib/humanize.ts). It then shows up on the page and on the command line.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Use the function on its own

The logic is one dependency-free file, [src/lib/humanize.ts](src/lib/humanize.ts).

```ts
import { humanize } from "./src/lib/humanize";

humanize("I will send the report tomorrow. Let me know.");
// { text: "i will send the reprot tomorrow, let me know", sloppiness: 0.61 }

humanize(text, { seed: 42 }); // same seed, same result
humanize(text, { sloppiness: 0.3 }); // fixed mess level from 0 to 1
```

## What it leaves alone

- Links, emails, paths and anything containing a digit
- Capitalised words and words shorter than four letters (no typos in them)
- Whitespace and line breaks

Known limit: a name at the start of a sentence can be lowercased.

## Test

```bash
npm test
```
