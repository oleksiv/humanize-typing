// A minimal MCP server: one tool, no state, no dependencies.
// handle() takes a parsed JSON-RPC message and returns the reply, or undefined
// when there is nothing to reply. The HTTP route and the stdio script share it.
import { humanize, PRESETS, type PresetName } from "./humanize.ts";

const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const MAX_CHARS = 10_000;
const styles = Object.keys(PRESETS);

export const TOOL = {
  name: "humanize_typing",
  title: "Humanize typing",
  description: `Makes clean text look hand-typed. It adds the small slips of real typing: lowercase sentence starts, missing periods, dropped apostrophes, typos, run-on sentences. It also turns formal phrasing into contractions and removes em dashes and curly quotes. No AI is involved: the slips are random, so some results come back almost clean. That is intended.

Before calling: write the text the way the user would say it, clean and correct. Do not add mistakes yourself. Start every sentence with a capital letter, end it with a period, prefer short sentences, and use plain text without markdown.

After calling: give the user the result exactly as returned, in a code block. Do not fix its mistakes. For a different roll, call again with the same text.`,
  inputSchema: {
    type: "object",
    properties: {
      text: { type: "string", description: `The clean text to humanize, up to ${MAX_CHARS} characters.` },
      style: {
        type: "string",
        enum: styles,
        description: `Where the text is going. ${styles
          .map((name) => `${name}: ${PRESETS[name as PresetName].label}`)
          .join(". ")}. Default: message.`,
      },
      mess: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "How many slips: 0 is none, 1 is very messy. Leave out for a random level, usually low.",
      },
    },
    required: ["text"],
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
};

type Message = { id?: string | number | null; method?: unknown; params?: Record<string, unknown> };

function callTool(params: Message["params"]) {
  if (params?.name !== TOOL.name)
    return { error: { code: -32602, message: `Unknown tool: ${String(params?.name)}` } };

  const { text, style = "message", mess } = (params.arguments ?? {}) as Record<string, unknown>;
  // a bad argument is a tool error, not a protocol error, so the model can read it and retry
  const problem =
    typeof text !== "string" || !text.trim()
      ? "text must be a non-empty string."
      : text.length > MAX_CHARS
        ? `text can be up to ${MAX_CHARS} characters.`
        : typeof style !== "string" || !Object.hasOwn(PRESETS, style)
          ? `style must be one of: ${styles.join(", ")}.`
          : mess !== undefined && !(typeof mess === "number" && mess >= 0 && mess <= 1)
            ? "mess must be a number from 0 to 1."
            : "";
  if (problem) return { result: { content: [{ type: "text", text: problem }], isError: true } };

  const out = humanize(text as string, {
    sloppiness: mess as number | undefined,
    rates: PRESETS[style as PresetName].rates,
  });
  return { result: { content: [{ type: "text", text: out.text }] } };
}

function respond({ method, params }: Message) {
  switch (method) {
    case "initialize": {
      const asked = params?.protocolVersion;
      return {
        result: {
          protocolVersion: VERSIONS.includes(asked as string) ? asked : VERSIONS[0],
          capabilities: { tools: {} },
          serverInfo: { name: "humanize-typing", version: "0.1.0" },
          instructions:
            "Use humanize_typing as the last step when the user wants text to look hand-typed. Write the text clean first, then return the tool's output unchanged.",
        },
      };
    }
    case "ping":
      return { result: {} };
    case "tools/list":
      return { result: { tools: [TOOL] } };
    case "tools/call":
      return callTool(params);
    default:
      return { error: { code: -32601, message: `Method not found: ${String(method)}` } };
  }
}

function one(msg: unknown) {
  if (!msg || typeof msg !== "object" || Array.isArray(msg))
    return { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid request" } };
  const { id, method } = msg as Message;
  // no id: a notification. no method: the client answering us. Neither gets a reply.
  if (id === undefined || typeof method !== "string") return undefined;
  return { jsonrpc: "2.0", id, ...respond(msg as Message) };
}

export function handle(body: unknown) {
  if (!Array.isArray(body)) return one(body);
  const replies = body.map(one).filter((reply) => reply !== undefined);
  return replies.length ? replies : undefined;
}

export const PARSE_ERROR = { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } };
