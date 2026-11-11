---
name: humanize-typing
description: Rewrite text so it reads like the user typed it themselves. Use when the user asks to humanize text, make it sound like them, or make it look casually typed. You handle the wording; the humanize-typing MCP server adds the typing slips.
---

# Humanize typing

Two steps. Keep them separate: you are good at voice and bad at random mistakes.

## Step 1: rewrite the wording (you)

Rewrite the text in the user's voice.

- Look for `voice-samples.md` next to this file, then in the project root. If it exists, read it and match those messages: word choice, sentence length, contractions, how they open and close, how formal they are. Copy the style, never the subject matter.
- If it does not exist, loosen the text lightly: contractions, shorter sentences, plain words, no filler openers or sign-offs. Tell the user once that saving 5 to 10 of their real messages as `voice-samples.md` next to this skill will make results sound like them.
- Keep every fact, name, number, link and commitment exactly.
- Write it clean. Correct spelling, capitals and punctuation. Do not add any mistakes yourself, not even lowercase starts. Mistakes you add come out evenly spread and look fake.

Step 2 needs regular text to work on, so also:

- Start every sentence with a capital letter and end it with a period, question mark or exclamation mark. Write "I" as a capital.
- Prefer several short sentences to one long one.
- Plain text only: no markdown, bullet points or headings.
- No semicolons or ellipses. Use a comma or start a new sentence.
- Write out abbreviations that contain periods: "for example", not "e.g.".
- Avoid starting a sentence with a person's or product's name when you can. Step 2 may lowercase it.

## Step 2: add the slips (MCP tool)

The tool sends the text to the humanize-typing server. The server does not read, save or log it, but the text does leave the user's machine. If the text holds anything confidential (passwords, keys, personal, medical or financial details, or anything the user called private), do not call the tool yet. Tell the user the text would go through that server and ask whether to send it. Skip this check if the user has said the server runs locally.

Call the `humanize_typing` tool of the humanize-typing MCP server with your rewrite as `text`.

Pick the `style` that fits where the text is going:

| Style | Use for | Slips |
|---|---|---|
| `message` (default) | Slack, chat, DMs | A balanced mix |
| `text` | Quick texts to friends | Mostly lowercase, few periods, more typos |
| `post` | Social posts, comments | Light, mostly clean capitals |
| `email` | Work email | Capitals always kept, a rare typo or run-on |

Match step 1 to the same style: an email rewrite stays more formal than a quick text.

Set `mess` from 0 to 1 only if the user asked for more or fewer mistakes (0 is clean, 1 is very messy). Without it the tool draws a random level, usually low.

If the tool is not available:

- Inside the humanize-typing repository, write your rewrite to a temporary file and run `npm run -s humanize -- <style> <mess> < /path/to/rewrite.txt` from the project root. Both arguments are optional.
- Anywhere else, stop. Tell the user the humanize-typing MCP server is not connected, and that the page they got this skill from has the one-line command to add it. Do not add the slips yourself.

## Step 3: return it

Give the user the tool's output exactly as returned, in a code block so nothing gets auto-corrected.

- Do not fix, tidy or "improve" the output. An output with no slips at all is a normal result.
- If the user wants a different roll, call the tool again with the same rewrite. Do not redo step 1 unless they ask for different wording.
