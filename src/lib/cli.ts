// Usage: echo "Some clean text." | npm run -s humanize [-- <style> <mess level>]
//   style: message (default), text, post, email
//   mess level: 0 to 1. Without it, a random one is drawn.
import { humanize, PRESETS, type PresetName } from "./humanize.ts";

let preset: PresetName = "message";
let sloppiness: number | undefined;

for (const arg of process.argv.slice(2)) {
  if (arg in PRESETS) preset = arg as PresetName;
  else if (Number(arg) >= 0 && Number(arg) <= 1) sloppiness = Number(arg);
  else {
    console.error(
      `Unknown option "${arg}". Use a style (${Object.keys(PRESETS).join(", ")}) or a mess level from 0 to 1.`,
    );
    process.exit(1);
  }
}

let input = "";
for await (const chunk of process.stdin) input += chunk;
process.stdout.write(humanize(input, { sloppiness, rates: PRESETS[preset].rates }).text);
