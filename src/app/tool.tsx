"use client";

import Image from "next/image";
import { useMemo, useState, useSyncExternalStore } from "react";
import { humanize, PRESETS, type PresetName } from "@/lib/humanize";
import { primary, secondary } from "./buttons";

const USE: Record<PresetName, string> = {
  message: "Slack, chat, DMs",
  text: "Texts to friends",
  post: "Social posts, comments",
  email: "Clients and colleagues",
};
// one-word names for the compact strip on a phone
const SHORT: Record<PresetName, string> = { message: "Chat", text: "Text", post: "Post", email: "Email" };
const presetNames = Object.keys(PRESETS) as PresetName[];

const noSubscription = () => () => {};

// the address this page is served from, so pasted commands work as they are
function useOrigin() {
  return useSyncExternalStore(
    noSubscription,
    () => window.location.origin,
    () => "https://your-domain",
  );
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return [copied, copy] as const;
}

/**
 * One terminal entry: the tool's logo, a comment line, a Copy button, and the command under them.
 * `{origin}` in the template becomes this site's address.
 */
export function Command({ icon, label, template }: { icon: string; label: string; template: string }) {
  const text = template.replaceAll("{origin}", useOrigin());
  const [copied, copy] = useCopy();
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-3">
        <Image src={`/icons/${icon}.svg`} alt="" width={20} height={20} unoptimized className="h-5 w-auto shrink-0" />
        <p className="flex-1 font-mono text-[13px] leading-5 text-muted"># {label}</p>
        <button onClick={() => copy(text)} className={secondary}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <code className="font-mono text-[13px] leading-5 break-all">{text}</code>
    </div>
  );
}

export function Humanizer({ sample }: { sample: string }) {
  const [text, setText] = useState(sample);
  const [style, setStyle] = useState<PresetName>("message");
  const [seed, setSeed] = useState(4);
  const [random, setRandom] = useState(true);
  const [level, setLevel] = useState(0.4);
  const [copied, copy] = useCopy();

  const result = useMemo(
    () => humanize(text, { seed, sloppiness: random ? undefined : level, rates: PRESETS[style].rates }),
    [text, seed, random, level, style],
  );

  // slips never touch whitespace, so the tokens line up one to one
  const before = result.clean.split(/(\s+)/);
  const after = result.text.split(/(\s+)/);
  const slips = after.filter((t, i) => t !== before[i]).length;
  const reworded = result.clean !== text;
  const mess = Math.round((random ? result.sloppiness : level) * 100);

  return (
    <div
      data-ui="humanizer"
      className="ui grid min-h-0 flex-auto overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_24px_60px_-32px_rgb(0_0_0/.18)] max-lg:grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]"
    >
      {/* the list: styles and the mess level; below a desktop it is one compact strip */}
      <div className="flex flex-col border-b border-line bg-surface lg:border-r lg:border-b-0">
        <div className="flex h-11 items-center gap-2 border-b border-line px-4 text-[13px] text-muted max-lg:hidden">
          <span className="flex gap-1.5" aria-hidden="true">
            <i className="size-2.5 rounded-full bg-line" />
            <i className="size-2.5 rounded-full bg-line" />
            <i className="size-2.5 rounded-full bg-line" />
          </span>
          <span className="ml-2">Style</span>
        </div>
        <ul className="grid grid-cols-4 gap-1 p-2 lg:grid-cols-1">
          {presetNames.map((name) => (
            <li key={name}>
              <button
                aria-pressed={style === name}
                aria-label={PRESETS[name].label}
                onClick={() => setStyle(name)}
                className="min-h-11 w-full rounded-lg px-3 text-center transition-colors duration-150 hover:bg-ink/4 aria-pressed:bg-paper aria-pressed:shadow-[0_0_0_1px_var(--color-line)] lg:py-2.5 lg:text-left"
              >
                <span className="block text-sm font-medium lg:hidden">{SHORT[name]}</span>
                <span className="block text-sm font-medium max-lg:hidden">{PRESETS[name].label}</span>
                <span className="block text-[13px] text-ink/70 max-lg:hidden">{USE[name]}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-auto grid grid-cols-2 items-center gap-x-4 border-t border-line px-4 py-2 lg:grid-cols-1 lg:gap-1">
          <label className="grid min-h-11 content-center gap-1 text-sm">
            <span className="flex justify-between">
              <span>Mess level</span>
              <span className="tabular-nums">{mess}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={random ? result.sloppiness : level}
              disabled={random}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="h-6 accent-ink disabled:opacity-50"
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={random}
              onChange={(e) => setRandom(e.target.checked)}
              className="size-4 accent-ink"
            />
            <span className="lg:hidden">New each roll</span>
            <span className="max-lg:hidden">New level every roll</span>
          </label>
        </div>
      </div>

      {/* the open item: your text and the typed version */}
      <div className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto]">
        <label htmlFor="input" className="flex h-9 items-center border-b border-line px-4 text-[13px] text-muted lg:h-11 lg:px-5">
          Your text
        </label>
        <textarea
          id="input"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type the text you want to humanize"
          className="min-h-0 resize-none px-4 py-3 text-sm leading-6 outline-none placeholder:text-muted lg:px-5 lg:py-4 lg:text-[15px] lg:leading-7"
        />
        <div className="flex h-9 items-center justify-between border-y border-line px-4 text-[13px] text-muted lg:h-11 lg:px-5">
          <span>Typed version</span>
          <span aria-live="polite">
            {slips === 0 ? "No slips this time" : `${slips} ${slips === 1 ? "slip" : "slips"}`}
          </span>
        </div>
        <p className="min-h-[6.5rem] overflow-auto px-4 py-3 text-sm leading-6 whitespace-pre-wrap lg:min-h-0 lg:px-5 lg:py-4 lg:text-[15px] lg:leading-7">
          {text.trim() ? (
            after.map((t, i) => (t === before[i] ? t : <mark key={i}>{t}</mark>))
          ) : (
            <span className="text-muted">Your text shows up here once you add some.</span>
          )}
        </p>
        <div className="flex items-center gap-3 border-t border-line px-4 py-2.5 lg:px-5 lg:py-3">
          <p className="mr-auto text-[13px] text-muted max-sm:hidden">
            {reworded ? "Contractions and wording fixes are not marked." : "Slips are marked in yellow."}
          </p>
          <button onClick={() => setSeed(Math.floor(Math.random() * 2 ** 31))} className={`${secondary} max-sm:flex-1`}>
            Roll again
          </button>
          <button onClick={() => copy(result.text)} disabled={!text.trim()} className={`${primary} max-sm:flex-1`}>
            {copied ? "Copied" : "Copy text"}
          </button>
        </div>
      </div>
    </div>
  );
}
