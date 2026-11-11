"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { humanize, PRESETS, type PresetName } from "@/lib/humanize";

const SAMPLE =
  "Hey, I finally finished the comparison of the design skills. I tested each one on the same landing page prompt, and honestly the results were pretty different. The taste skill produced the cleanest layout, but it did not handle the typography well. I think the frontend design skill was the most consistent overall. I will send you the full report tomorrow, because I still need to clean up the screenshots. Let me know if you want to jump on a quick call this week.";

const presetNames = Object.keys(PRESETS) as PresetName[];
const box = "min-h-72 flex-1 rounded-lg border border-line bg-surface p-4 text-base leading-7";
const noSubscription = () => () => {};

function Command({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex items-start gap-3 rounded-lg border border-line bg-surface p-3">
      <pre className="flex-1 font-mono text-sm break-all whitespace-pre-wrap">{children}</pre>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(children);
          setCopied(true);
        }}
        className="shrink-0 text-sm font-medium underline"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function Home() {
  const [text, setText] = useState(SAMPLE);
  const [style, setStyle] = useState<PresetName>("message");
  const [seed, setSeed] = useState(4);
  const [random, setRandom] = useState(true);
  const [level, setLevel] = useState(0.4);
  const [copied, setCopied] = useState(false);

  // the address this page is served from, so the commands below can be pasted as they are
  const origin = useSyncExternalStore(
    noSubscription,
    () => window.location.origin,
    () => "https://your-domain",
  );
  const mcpUrl = `${origin}/api/mcp`;

  const result = useMemo(
    () => humanize(text, { seed, sloppiness: random ? undefined : level, rates: PRESETS[style].rates }),
    [text, seed, random, level, style],
  );

  // slips never touch whitespace, so the tokens line up one to one
  const before = result.clean.split(/(\s+)/);
  const after = result.text.split(/(\s+)/);
  const slips = after.filter((t, i) => t !== before[i]).length;
  const reworded = result.clean !== text;

  function roll() {
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setCopied(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-20">
      <h1 className="max-w-3xl text-5xl leading-[1.02] font-semibold tracking-tight sm:text-7xl">
        looks like i typed it,, not a robot
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted">
        Paste clean text and get it back the way a person types it: contractions, lowercase starts,
        a missing period, the odd typo. No AI, just random numbers, so it is free.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
        <label className="flex items-center gap-3">
          Style
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as PresetName)}
            className="rounded-lg border border-line bg-surface px-3 py-2"
          >
            {presetNames.map((name) => (
              <option key={name} value={name}>
                {PRESETS[name].label}
              </option>
            ))}
          </select>
        </label>

        <label className={`flex items-center gap-3 ${random ? "text-muted" : ""}`}>
          Mess level
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={random ? result.sloppiness : level}
            disabled={random}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="w-40 accent-action"
          />
          <span className="w-10 tabular-nums">{Math.round(result.sloppiness * 100)}%</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={random}
            onChange={(e) => setRandom(e.target.checked)}
            className="size-4 accent-action"
          />
          Random each time
        </label>
      </div>
      <p className="mt-3 text-sm text-muted">
        The style sets which slips appear. The mess level sets how many.
      </p>

      <ol className="mt-6 grid gap-6 lg:grid-cols-2">
        <li className="flex flex-col gap-2">
          <label htmlFor="input" className="font-medium">
            1. Your text
          </label>
          <textarea
            id="input"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setCopied(false);
            }}
            placeholder="Paste or type the text you want to humanize"
            className={`${box} resize-y`}
          />
        </li>

        <li className="flex flex-col gap-2">
          <h2 className="font-medium">2. Typed version</h2>
          <p aria-live="polite" className={`${box} whitespace-pre-wrap`}>
            {text.trim() ? (
              after.map((t, i) => (t === before[i] ? t : <mark key={i}>{t}</mark>))
            ) : (
              <span className="text-muted">Your text shows up here once you add some.</span>
            )}
          </p>
          <div className="flex gap-3">
            <button
              onClick={roll}
              className="flex-1 rounded-lg border border-ink px-5 py-2.5 font-medium hover:bg-surface"
            >
              Roll again
            </button>
            <button
              onClick={copy}
              disabled={!text.trim()}
              className="flex-1 rounded-lg bg-ink px-5 py-2.5 font-medium text-paper hover:opacity-90 disabled:opacity-40"
            >
              {copied ? "Copied" : "Copy text"}
            </button>
          </div>
          <p className="text-sm text-muted">
            {slips === 0
              ? "No slips this time. Real typing is often clean, so that happens on purpose."
              : `${slips} ${slips === 1 ? "slip" : "slips"}, marked in yellow.`}
            {reworded && " Contractions and other wording fixes are not marked."}
          </p>
        </li>
      </ol>

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="text-3xl font-semibold tracking-tight">Three ways to use it</h2>

        <div className="mt-8 grid gap-10 lg:grid-cols-3">
          <div>
            <h3 className="text-lg font-medium">1. On this page</h3>
            <p className="mt-2 text-muted">
              Paste your text above, pick a style and copy the result. Roll again until you like
              it. This runs in your browser, so your text is not sent anywhere.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium">2. In your AI assistant</h3>
            <p className="mt-2 text-muted">
              Add this site as an MCP server. Your assistant writes the text, then passes it
              through the same function. In Claude Code:
            </p>
            <Command>{`claude mcp add --transport http humanize-typing ${mcpUrl}`}</Command>
            <p className="mt-4 text-muted">
              In the Claude app, open Settings, then Connectors, add a custom connector and paste
              this address. Other MCP apps take the same address.
            </p>
            <Command>{mcpUrl}</Command>
            <p className="mt-4 text-muted">Then ask: &quot;humanize this message&quot;.</p>
          </div>

          <div>
            <h3 className="text-lg font-medium">3. As a Claude Code skill</h3>
            <p className="mt-2 text-muted">
              The skill makes Claude rewrite the text in your voice first, then call the MCP
              server from step 2. Add the server, then the skill:
            </p>
            <Command>{`mkdir -p ~/.claude/skills/humanize-typing && curl -fsS ${origin}/humanize-typing/SKILL.md -o ~/.claude/skills/humanize-typing/SKILL.md`}</Command>
            <p className="mt-4 text-muted">
              To sound like yourself, save 5 to 10 real messages you wrote as voice-samples.md in
              the same folder.
            </p>
          </div>
        </div>

        <p className="mt-10 max-w-2xl text-sm text-muted">
          About your text: ways 2 and 3 send it to this server, which changes it in memory and
          sends it back. It is not stored or logged. To keep it on your own machine, run the same
          server locally. The README shows how.
        </p>
      </section>
    </main>
  );
}
