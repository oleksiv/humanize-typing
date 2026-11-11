import { humanize, PRESETS, type PresetName } from "@/lib/humanize";
import { primary } from "./buttons";
import { Command, Humanizer } from "./tool";

// the text each style opens with, written the clean way an assistant would draft it
const SAMPLES: Record<PresetName, string> = {
  message:
    "I will send you the full report tomorrow, because I still need to clean up the screenshots. Let me know if you want to jump on a quick call this week.",
  text: "Hey, are you still coming tonight? I am running about ten minutes late, so do not wait for me outside. I will text you when I am close.",
  post: "I have been testing three design tools this week, and honestly the results were very different. Here is what I learned, and what I would do again.",
  email:
    "Thank you for the update. I have reviewed the proposal and I do not have any major concerns. I will send my comments by Friday so we can finalize it.",
};

// one run in the chat style; slips never touch whitespace, so before and after line up token by token
function run(text: string, seed: number) {
  const r = humanize(text, { seed, rates: PRESETS.message.rates });
  const before = r.clean.split(/(\s+)/);
  const after = r.text.split(/(\s+)/);
  return { before, after, slips: after.filter((t, i) => t !== before[i]).length };
}

// real output, measured when the page is built: nothing on it is made up
const RUNS = 1000;
const counts = Array.from({ length: RUNS }, (_, i) => run(SAMPLES.message, i + 1).slips);
const share = (keep: (n: number) => boolean) => Math.round((counts.filter(keep).length / RUNS) * 100);
const figures = [
  { value: `${share((n) => n === 0)}%`, label: "come back with no slips" },
  { value: `${share((n) => n > 0 && n < 5)}%`, label: "have one to four" },
  { value: `${share((n) => n >= 5)}%`, label: "have five or more" },
];
// six runs in a row of the chat sample (seeds 4 to 9), shown as they came out
const runs = [4, 5, 6, 7, 8, 9].map((seed) => run(SAMPLES.message, seed));

// hint: the comment line above the command in the terminal
const setups = [
  {
    icon: "claude-code",
    title: "Add the server to Claude Code",
    body: "One command adds the MCP server. Other MCP apps take the same address.",
    hint: "Claude Code: add the MCP server",
    cmd: "claude mcp add --transport http humanize-typing {origin}/api/mcp",
  },
  {
    icon: "claude",
    title: "Connect the Claude app",
    body: "In Settings, open Connectors, add a custom connector and paste the address.",
    hint: "Claude app: Settings, Connectors, add a custom connector",
    cmd: "{origin}/api/mcp",
  },
  {
    icon: "claude",
    title: "Install the Claude Code skill",
    body: "Claude rewrites the text in your voice first. Save 5 to 10 of your messages as voice-samples.md.",
    hint: "Claude Code skill: rewrites in your voice first",
    cmd: "mkdir -p ~/.claude/skills/humanize-typing && curl -fsS {origin}/humanize-typing/SKILL.md -o ~/.claude/skills/humanize-typing/SKILL.md",
  },
  {
    icon: "nodejs",
    title: "Run the server on your machine",
    body: "The same server over stdio, so your text never leaves your computer. Needs Node 22.18 or newer.",
    hint: "Local server: text stays on your machine",
    cmd: "claude mcp add humanize-typing -- node /path/to/humanize-typing/src/lib/mcp-stdio.ts",
  },
];

const faq = [
  {
    q: "Where does my text go?",
    a: "On this page, nowhere. The hosted MCP server changes it in memory and sends it back without storing it. The local server keeps it on your machine.",
  },
  { q: "What does Humanize typing cost?", a: "Nothing. There is no model behind it and no account to make." },
  {
    q: "Which links does Humanize typing skip?",
    a: "Links, email addresses, file paths and anything with a digit. Typos skip capitalised words and words under four letters.",
  },
  {
    q: "Does Humanize typing lowercase names?",
    a: "Sometimes, when a name starts a sentence. Check names before you send.",
  },
];

const nav = [
  ["#try", "Tool"],
  ["#setup", "Setup"],
  ["#faq", "Questions"],
  ["#why", "Method"],
];

const footerGroups = [
  { title: "Use it", links: [["#try", "Tool"], ["#setup", "Setup"]] },
  { title: "Read", links: [["#faq", "Questions"], ["#why", "Method"], ["/humanize-typing/SKILL.md", "SKILL.md"]] },
];

const h2 = "text-[30px] leading-[1.1] lg:text-5xl";

function Logo() {
  return (
    <a href="#top" className="flex h-11 items-center gap-2.5 font-display text-xl tracking-tight whitespace-nowrap">
      <span aria-hidden="true" className="grid size-7 place-items-center rounded-md bg-ink text-sm font-semibold text-paper">
        h
      </span>
      Humanize typing
    </a>
  );
}

// a terminal window holding commands to paste
function Terminal({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      data-ui="terminal"
      className={`ui overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_24px_60px_-32px_rgb(0_0_0/.18)] ${className}`}
    >
      <div className="flex h-11 items-center gap-2 border-b border-line bg-surface px-4 text-[13px] text-muted">
        <span className="flex gap-1.5" aria-hidden="true">
          <i className="size-2.5 rounded-full bg-line" />
          <i className="size-2.5 rounded-full bg-line" />
          <i className="size-2.5 rounded-full bg-line" />
        </span>
        <span className="ml-2">Terminal</span>
      </div>
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <header className="nav fixed inset-x-0 top-0 z-10 h-14 border-b border-line bg-paper sm:h-18">
        <div className="wrap flex h-full items-center gap-8">
          <Logo />
          <nav aria-label="Main" className="ml-auto hidden gap-8 text-[15px] font-medium lg:flex">
            {nav.map(([href, label]) => (
              <a key={href} href={href} className="flex h-11 items-center text-muted transition-colors hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <a href="#try" className={`${primary} ml-auto max-sm:hidden lg:ml-0`}>
            Try it on your text
          </a>
        </div>
      </header>

      <main id="top">
        {/* hero: what it is, then the working editor on the same screen */}
        <section id="try" className="hero screen" data-enter aria-labelledby="hero-h">
          <div className="wrap">
            <div className="hero-text flex min-h-0 flex-auto flex-col">
              <div className="grid gap-3 lg:grid-cols-12 lg:gap-6">
                <h1 id="hero-h" className="text-[36px] leading-[1.02] tracking-[-0.04em] motion-safe:animate-rise lg:col-span-6 lg:text-[56px]">
                  Typing slips for AI-drafted messages
                </h1>
                <p className="leading-relaxed motion-safe:animate-rise [animation-delay:120ms] lg:col-span-6 lg:col-start-7 lg:text-lg">
                  Paste clean text and get it back the way people type
                  <span className="max-sm:hidden">: contractions, lowercase starts, the odd typo</span>. 4 styles,
                  free in your browser and in Claude Code.
                </p>
              </div>
              <div className="mt-5 flex min-h-0 flex-auto motion-safe:animate-rise [animation-delay:200ms] lg:mt-10">
                <Humanizer samples={SAMPLES} />
              </div>
            </div>
          </div>
        </section>

        {/* setup: the MCP server and the skill */}
        <section id="setup" className="screen" aria-labelledby="setup-h">
          <div className="wrap">
            <div className="grid flex-auto content-start gap-6 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <h2 id="setup-h" className={h2}>
                  Works inside Claude.{" "}
                  <span className="text-muted max-sm:hidden">Your assistant writes, the function adds the slips.</span>
                </h2>
                {/* a phone shows the terminal alone: its comment lines say the same in fewer words */}
                <ol className="mt-8 grid gap-6 max-sm:hidden">
                  {setups.map((s) => (
                    <li key={s.title} className="grid gap-2">
                      <h3 className="text-xl tracking-[-0.01em]">{s.title}</h3>
                      <p className="leading-relaxed">{s.body}</p>
                    </li>
                  ))}
                </ol>
              </div>

              {/* the commands, in the terminal where they are pasted */}
              <Terminal className="self-start lg:col-span-6 lg:col-start-7">
                <ol className="divide-y divide-line">
                  {setups.map((s) => (
                    <li key={s.title} className="p-4 lg:px-5">
                      <Command icon={s.icon} label={s.hint} template={s.cmd} />
                    </li>
                  ))}
                  <li className="grid gap-2 p-5 max-sm:hidden">
                    <p className="font-mono text-[13px] text-muted"># Then, in Claude</p>
                    <p className="font-mono text-[13px] leading-5">humanize this message</p>
                  </li>
                </ol>
              </Terminal>
            </div>
          </div>
        </section>

        <section id="faq" className="screen" aria-labelledby="faq-h">
          <div className="wrap">
            <div className="grid flex-auto gap-6 max-lg:grid-rows-[auto_1fr] lg:grid-cols-12">
              <h2 id="faq-h" className={`${h2} lg:col-span-5`}>
                Questions
              </h2>
              <div className="flex flex-col justify-between lg:col-span-6 lg:col-start-7">
                {faq.map((f) => (
                  <div key={f.q} className="border-b border-line py-4 first:pt-0 lg:py-8">
                    <h3 className="text-xl tracking-[-0.01em]">{f.q}</h3>
                    <p className="mt-2 leading-relaxed">{f.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* why: the slips are uneven on purpose, measured over 1,000 runs */}
        <section id="why" className="screen" aria-labelledby="why-h">
          <div className="wrap">
            <div className="grid flex-auto gap-6 lg:grid-cols-12">
              <div className="flex flex-col lg:col-span-5">
                <h2 id="why-h" className={h2}>
                  Real typing is uneven. <span className="text-muted">Some messages are clean, some have five slips.</span>
                </h2>
                <p className="mt-6 leading-relaxed lg:text-lg">
                  Ask a model to add mistakes and it spreads them evenly, one typo per message.
                  <span className="max-sm:hidden">
                    {" "}
                    Humanize typing draws a mess level for every run, and one typo makes the next more likely in
                    the same sentence.
                  </span>
                </p>
                <div className="mt-auto pt-8 lg:pt-10">
                  <p className="text-[13px] text-muted">Out of {RUNS.toLocaleString("en")} rolls of that message</p>
                  <dl className="mt-3 grid grid-cols-3 gap-4 lg:gap-6">
                    {figures.map((f) => (
                      <div key={f.label} className="flex flex-col-reverse justify-end">
                        <dt className="mt-2 leading-snug">{f.label}</dt>
                        <dd className="font-display text-[30px] leading-none tracking-[-0.03em] tabular-nums lg:text-5xl">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
              {/* the same message, run again and again: some runs clean, some messy */}
              <div
                data-ui="runs"
                className="ui self-start overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_24px_60px_-32px_rgb(0_0_0/.18)] lg:col-span-6 lg:col-start-7"
              >
                <p className="flex h-11 items-center border-b border-line bg-surface px-4 text-[13px] text-muted lg:px-5">
                  The same message, rolled again and again
                </p>
                <ol className="divide-y divide-line">
                  {runs.map((r, i) => (
                    // a phone shows three of the six
                    <li key={i} className={`flex items-start gap-4 px-4 py-3 lg:px-5 lg:py-4 ${[2, 4, 5].includes(i) ? "max-sm:hidden" : ""}`}>
                      <p className="flex-1 text-[13px] leading-5 lg:text-[15px] lg:leading-6">
                        {r.after.map((t, j) => (t === r.before[j] ? t : <mark key={j}>{t}</mark>))}
                      </p>
                      <span className="shrink-0 rounded-full bg-surface px-2.5 py-0.5 text-[13px] tabular-nums">
                        {r.slips === 0 ? "Clean" : `${r.slips} ${r.slips === 1 ? "slip" : "slips"}`}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

      </main>

      <footer id="contact" className="closing screen" aria-labelledby="close-h">
        <div className="wrap justify-between gap-12">
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-12">
            <div className="col-span-2 lg:col-span-6">
              <h2 id="close-h" className={h2}>
                Paste a message and copy it typed
              </h2>
              <p className="mt-4 text-lg">Free, no sign-up, runs in your browser.</p>
              <a href="#try" className={`${primary} mt-8`}>
                Try it on your text
              </a>
            </div>
            <nav aria-label="Footer" className="contents">
              {footerGroups.map((g) => (
                <div key={g.title} className="lg:col-span-3">
                  <h3 className="text-xl tracking-[-0.01em]">{g.title}</h3>
                  <ul className="mt-2">
                    {g.links.map(([href, label]) => (
                      <li key={href}>
                        <a href={href} className="flex h-11 items-center underline decoration-line underline-offset-4 transition-colors hover:decoration-ink">
                          {label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
          <div>
            <p aria-hidden="true" className="font-display text-[min(12.5vw,176px)] leading-[0.85] tracking-[-0.05em] whitespace-nowrap">
              Humanize typing
            </p>
            <p className="mt-6 border-t border-line pt-6 text-sm">
              Product names and logos are trademarks of their owners.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
