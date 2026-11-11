// the page's one button pair: one shape, one height, one label size
const base =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-medium whitespace-nowrap transition duration-150 hover:-translate-y-px active:translate-y-px active:scale-[.985] disabled:pointer-events-none disabled:opacity-40";

export const primary = `${base} bg-ink text-paper hover:bg-ink/85`;
export const secondary = `${base} border border-line bg-paper hover:border-ink/30`;
