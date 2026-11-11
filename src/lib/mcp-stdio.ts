// The same MCP server over stdio. It runs on your own machine, so no text leaves it.
// Usage: claude mcp add humanize-typing -- node /path/to/humanize-typing/src/lib/mcp-stdio.ts
import { createInterface } from "node:readline";
import { handle, PARSE_ERROR } from "./mcp.ts";

// one JSON-RPC message per line, in and out
for await (const line of createInterface({ input: process.stdin })) {
  if (!line.trim()) continue;
  let reply;
  try {
    reply = handle(JSON.parse(line));
  } catch {
    reply = PARSE_ERROR;
  }
  if (reply !== undefined) process.stdout.write(JSON.stringify(reply) + "\n");
}
