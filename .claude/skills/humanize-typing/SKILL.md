---
name: humanize-typing
description: Rewrite text so it reads like the user typed it themselves. Use when the user asks to humanize text, make it sound like them, or make it look casually typed. You handle the wording; a script adds the typing slips.
---

# Humanize typing

Two steps. Keep them separate: you are good at voice and bad at random mistakes.

## Step 1: rewrite the wording (you)

Rewrite the text in the user's voice.

- If `voice-samples.md` exists in the project root, read it and match those messages: word choice, sentence length, contractions, how they open and close, how formal they are. Copy the style, never the subject matter.
- If it does not exist, loosen the text lightly: contractions, shorter sentences, plain words, no filler openers or sign-offs. Tell the user once that adding 5 to 10 of their real messages to `voice-samples.md` will make results sound like them.
- Keep every fact, name, number, link and commitment exactly.
- Write it clean. Correct spelling, capitals and punctuation. Do not add any mistakes yourself, not even lowercase starts. Mistakes you add come out evenly spread and look fake.

The script in step 2 needs regular text to work on, so also:

- Start every sentence with a capital letter and end it with a period, question mark or exclamation mark. Write "I" as a capital.
- Prefer several short sentences to one long one.
- Plain text only: no markdown, bullet points or headings.
- Use straight apostrophes and quotes, and keep the apostrophe in contractions.
- No em dashes, semicolons or ellipses. Use a comma or start a new sentence.
- Write out abbreviations that contain periods: "for example", not "e.g.".
- Avoid starting a sentence with a person's or product's name when you can. The script may lowercase it.

## Step 2: add the slips (script)

Write your rewrite to a temporary file, then run from the project root:

```bash
npm run -s humanize < /path/to/rewrite.txt
```

Pick the style that fits where the text is going and pass it after `--`:

| Style | Use for | Slips |
|---|---|---|
| `message` (default) | Slack, chat, DMs | A balanced mix |
| `text` | Quick texts to friends | Mostly lowercase, few periods, more typos |
| `post` | Social posts, comments | Light, mostly clean capitals |
| `email` | Work email | Capitals always kept, a rare typo or run-on |

```bash
npm run -s humanize -- email < /path/to/rewrite.txt
```

Match step 1 to the same style: an email rewrite stays more formal than a quick text.

Add a number from 0 to 1 to fix the mess level (`-- text 0.6`; 0 is clean, 1 is very messy) if the user asked for more or fewer mistakes. Without it the script draws a random level, usually low.

## Step 3: return it

Give the user the script's output exactly as printed, in a code block so nothing gets auto-corrected.

- Do not fix, tidy or "improve" the output. An output with no slips at all is a normal result.
- If the user wants a different roll, run the script again on the same rewrite. Do not redo step 1 unless they ask for different wording.
