"use client";

import { useMemo, useState } from "react";
import { humanize, PRESETS, type PresetName } from "@/lib/humanize";

const SAMPLE =
  "Hey, I finally finished the comparison of the design skills. I tested each one on the same landing page prompt, and honestly the results were pretty different. The taste skill produced the cleanest layout, but it struggled with the typography. I think the frontend design skill was the most consistent overall. I will send you the full report tomorrow, because I still need to clean up the screenshots. Let me know if you want to jump on a quick call this week.";

const presetNames = Object.keys(PRESETS) as PresetName[];
const box = "min-h-72 flex-1 rounded-lg border border-line bg-surface p-4 text-base leading-7";

export default function Home() {
  const [text, setText] = useState(SAMPLE);
  const [samples, setSamples] = useState("");
  const [style, setStyle] = useState<PresetName>("message");
  // one style drives both steps: the AI's tone and how often each slip appears
  const rates = PRESETS[style].rates;

  // step 1: AI rewrite. null until the AI has run on the current text.
  const [rewrite, setRewrite] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // step 2: slips
  const [seed, setSeed] = useState(4);
  const [random, setRandom] = useState(true);
  const [level, setLevel] = useState(0.4);
  const [copied, setCopied] = useState(false);

  const source = rewrite ?? text;
  const result = useMemo(
    () => humanize(source, { seed, sloppiness: random ? undefined : level, rates }),
    [source, seed, random, level, rates],
  );

  // the humanizer never touches whitespace, so tokens line up one to one
  const before = source.split(/(\s+)/);
  const after = result.text.split(/(\s+)/);
  const changes = after.filter((t, i) => t !== before[i]).length;

  async function runRewrite() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, style, samples }),
      });
      if (!res.ok || !res.body) throw new Error((await res.json()).error);

      // show the rewrite as it streams in; step 3 follows along
      setSeed(Math.floor(Math.random() * 2 ** 31));
      setCopied(false);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamed = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        streamed += decoder.decode(value, { stream: true });
        setRewrite(streamed);
      }
      if (!streamed.trim()) {
        setRewrite(null);
        throw new Error("OpenAI returned an empty rewrite. Try again.");
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "The rewrite failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function roll() {
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setCopied(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-20">
      <h1 className="max-w-3xl text-5xl leading-[1.02] font-semibold tracking-tight sm:text-7xl">
        looks like i typed it,, not a robot
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted">
        Two steps. First an AI rewrites the wording so it sounds like a person. Then plain random
        numbers add the slips of real typing, which is the part AI is bad at.
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
        The style sets the AI&apos;s tone and which slips appear. The mess level sets how many.
      </p>

      <ol className="mt-6 grid gap-6 lg:grid-cols-3">
        <li className="flex flex-col gap-2">
          <label htmlFor="input" className="font-medium">
            1. Your text
          </label>
          <textarea
            id="input"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setRewrite(null);
              setCopied(false);
            }}
            placeholder="Paste or type the text you want to humanize"
            className={`${box} resize-y`}
          />
          <button
            onClick={runRewrite}
            disabled={busy || !text.trim()}
            className="rounded-lg bg-ink px-5 py-2.5 font-medium text-paper hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Rewriting" : rewrite === null ? "Rewrite with AI" : "Rewrite again"}
          </button>
          <p className="text-sm text-muted">Sends your text to OpenAI.</p>
        </li>

        <li className="flex flex-col gap-2">
          <label htmlFor="rewrite" className="font-medium">
            2. AI rewrite
          </label>
          {rewrite === null ? (
            <p className={`${box} text-muted`} aria-live="polite">
              {busy
                ? "Waiting for OpenAI"
                : "Not run yet. Until you rewrite with AI, step 3 works on your original text."}
            </p>
          ) : (
            <textarea
              id="rewrite"
              value={rewrite}
              readOnly={busy}
              onChange={(e) => {
                setRewrite(e.target.value);
                setCopied(false);
              }}
              className={`${box} resize-y`}
            />
          )}
          {error ? (
            <p role="alert" className="text-sm font-medium text-[#b3261e] dark:text-[#ff9b93]">
              {error}
            </p>
          ) : (
            rewrite !== null && (
              <p className="text-sm text-muted">Clean on purpose. You can edit it before step 3.</p>
            )
          )}
        </li>

        <li className="flex flex-col gap-2">
          <h2 className="font-medium">3. Typed version</h2>
          <p aria-live="polite" className={`${box} whitespace-pre-wrap`}>
            {source.trim() ? (
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
              disabled={!source.trim()}
              className="flex-1 rounded-lg border border-ink px-5 py-2.5 font-medium hover:bg-surface disabled:opacity-40"
            >
              {copied ? "Copied" : "Copy text"}
            </button>
          </div>
          <p className="text-sm text-muted">
            {changes === 0
              ? "Nothing changed this time. Real typing is often clean, so that happens on purpose."
              : `${changes} ${changes === 1 ? "word" : "words"} changed, marked in yellow. Runs in your browser.`}
          </p>
        </li>
      </ol>

      <details className="mt-8 border-t border-line pt-6">
        <summary className="cursor-pointer font-medium">Make the AI sound like me</summary>
        <label htmlFor="samples" className="mt-3 block max-w-xl text-muted">
          Paste 5 to 10 real messages you have written. The AI copies their style, not their
          subject. They are sent to OpenAI with your text.
        </label>
        <textarea
          id="samples"
          value={samples}
          onChange={(e) => setSamples(e.target.value)}
          placeholder="One message per line"
          className="mt-3 min-h-40 w-full max-w-2xl resize-y rounded-lg border border-line bg-surface p-4 leading-7"
        />
      </details>
    </main>
  );
}
