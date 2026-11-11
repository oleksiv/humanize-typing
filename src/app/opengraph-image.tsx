// The share image for links (Open Graph) and the LinkedIn post: 1200x630, rendered at build time.
// The "after" line is real output of the function, not typed by hand.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { humanize, PRESETS } from "@/lib/humanize";

export const alt =
  "Humanize typing. Typing slips for AI-drafted messages. A clean sentence and the same sentence typed with a dropped apostrophe, a run-on and two typos.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));
const [gabarito, figtree, figtreeSemi] = await Promise.all([
  font("Gabarito-Regular.ttf"),
  font("Figtree-Regular.ttf"),
  font("Figtree-SemiBold.ttf"),
]);

const BEFORE = "I will send you the full report tomorrow. Let me know if you want to jump on a quick call.";
// seed 44: a dropped apostrophe, a run-on and two typos. ("Ill" with a capital reads as "lll".)
const typed = humanize(BEFORE, { seed: 44, rates: PRESETS.message.rates });
const clean = typed.clean.split(" ");
const after = typed.text.split(" ").map((word, i) => ({ word, slip: word !== clean[i] }));

const ink = "#141414";
const muted = "#6b6b68";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
      <div style={{ width: 80, paddingTop: 5, fontSize: 20, fontWeight: 600, color: muted }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", flex: 1, fontSize: 28, lineHeight: 1.45 }}>
        {children}
      </div>
    </div>
  );
}

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "#ffffff",
          color: ink,
          fontFamily: "Figtree",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: "Gabarito", fontSize: 28 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 9,
              background: ink,
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            h
          </div>
          Humanize typing
        </div>

        <div style={{ fontFamily: "Gabarito", fontSize: 68, lineHeight: 1.02, letterSpacing: -2.5, maxWidth: 820 }}>
          Typing slips for AI-drafted messages
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            padding: "28px 32px",
            borderRadius: 24,
            background: "#f6f6f4",
          }}
        >
          <Row label="Before">
            <span style={{ color: muted }}>{BEFORE}</span>
          </Row>
          <Row label="Typed">
            {after.map(({ word, slip }, i) => (
              <span
                key={i}
                style={{
                  marginRight: 8,
                  ...(slip && { background: "#fde68a", borderRadius: 5, padding: "0 4px", margin: "0 8px 0 -4px" }),
                }}
              >
                {word}
              </span>
            ))}
          </Row>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Gabarito", data: gabarito, weight: 400, style: "normal" },
        { name: "Figtree", data: figtree, weight: 400, style: "normal" },
        { name: "Figtree", data: figtreeSemi, weight: 600, style: "normal" },
      ],
    },
  );
}
