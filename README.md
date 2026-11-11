# Humanize typing

Paste clean text and get it back the way a person types it: contractions, lowercase sentence starts, a missing period, a dropped apostrophe, a swapped or neighbouring letter, the odd run-on sentence.

There is no AI in it and nothing to pay for. It is one dependency-free function, [src/lib/humanize.ts](src/lib/humanize.ts), that works in two passes:

1. **Loosen** (always the same): "do not" becomes "don't", "utilize" becomes "use", em dashes become commas, curly quotes become straight, and openers like "Certainly!" are removed.
2. **Slips** (random): a seeded random number generator adds the mistakes.

## Three ways to use it

### 1. On the web page

```bash
npm install
npm run dev
```

Open http://localhost:3000, paste your text, pick a style and copy the result. This runs in your browser.

### 2. As an MCP server

The site serves an MCP server at `/api/mcp`. It has one tool, `humanize_typing`, which takes `text`, an optional `style` and an optional `mess` level from 0 to 1. Your assistant writes the text and then passes it through the function.

In Claude Code:

```bash
claude mcp add --transport http humanize-typing https://your-domain/api/mcp
```

In the Claude app: Settings, then Connectors, then add a custom connector with that address. Other MCP apps take the same address.

The server keeps no state and needs no login. Anyone who knows the address can use it.

### 3. As a Claude Code skill

The skill makes Claude rewrite the text in your voice first, then call the MCP server. Add the server as above, then install the skill:

```bash
mkdir -p ~/.claude/skills/humanize-typing
curl -fsS https://your-domain/humanize-typing/SKILL.md -o ~/.claude/skills/humanize-typing/SKILL.md
```

To make it sound like you, save 5 to 10 real messages you have written as `voice-samples.md` in the same folder.

The skill file lives in [public/humanize-typing/SKILL.md](public/humanize-typing/SKILL.md). This repo links to it from `.claude/skills`, so the skill also works when you open the repo in Claude Code.

## Where your text goes

- **Web page:** nowhere. The function runs in your browser.
- **Hosted MCP server:** your text is sent to the server, changed in memory and sent back. The code does not store or log it.
- **Local MCP server:** nowhere. Run the same server on your own machine instead:

```bash
claude mcp add humanize-typing -- node /path/to/humanize-typing/src/lib/mcp-stdio.ts
```

This needs Node 22.18 or newer. The skill works with either server.

## Why not just ask an AI to add mistakes?

A language model adds mistakes on purpose, so they come out evenly spread: one typo and one lowercase start per message. Real typing is uneven. Most messages are clean and then one has three slips in a row.

This tool draws a random "mess level" for each run, skewed toward clean, and then rolls separately for every sentence and word. A typo makes more typos likely in the same sentence. Some results are untouched and some are messy.

So the two halves do different jobs:

| | Your assistant | The function |
|---|---|---|
| Job | Wording: your phrases, sentence length, tone | Slips: casing, punctuation, typos |
| Why | Good at style, bad at randomness | Truly random, knows nothing about style |
| Rule | Writes clean text, adds no mistakes | Never changes the facts |

## Styles

A style sets how often each kind of slip appears. The mess level then scales all of them for one run.

| Style | Use for | Slips |
|---|---|---|
| `message` (default) | Slack, chat, DMs | A balanced mix |
| `text` | Quick texts to friends | Mostly lowercase, few periods, more typos |
| `post` | Social posts, comments | Light, mostly clean capitals |
| `email` | Work email | Capitals always kept, a rare typo or run-on |

To add a style of your own, add an entry to `PRESETS` in [src/lib/humanize.ts](src/lib/humanize.ts). It then shows up on the page, in the MCP tool and on the command line.

## Use the function in code

```ts
import { humanize, PRESETS } from "./src/lib/humanize";

humanize("I will send the report tomorrow. Let me know.");
// {
//   text: "ill send the reprot tomorrow, let me know",
//   clean: "I'll send the report tomorrow. Let me know.",
//   sloppiness: 0.61,
// }

humanize(text, { seed: 42 }); // same seed, same result
humanize(text, { sloppiness: 0.3 }); // fixed mess level from 0 to 1
humanize(text, { rates: PRESETS.email.rates }); // a style
humanize(text, { rates: { ...PRESETS.message.rates, typo: 0, dropPeriod: 1 } }); // your own rates
```

`clean` is the text after the first pass. The second pass never adds or removes whitespace, so `clean` and `text` line up word by word.

From the repo you can also pipe text through it:

```bash
echo "I will send the report tomorrow." | npm run -s humanize
echo "I will send the report tomorrow." | npm run -s humanize -- email 0.6   # style and mess level
```

## What it leaves alone

- Links, emails, paths and anything containing a digit
- Capitalised words and words shorter than four letters (no typos in them)
- Whitespace and line breaks, in the second pass
- Words in unusual casing such as "DO NOT"

Known limit: a name at the start of a sentence can be lowercased.

## Test

```bash
npm test
```
