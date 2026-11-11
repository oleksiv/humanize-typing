// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "./route.ts";

const post = (body: string) =>
  POST(new Request("http://localhost/api/mcp", { method: "POST", body }));
// id: null sends a notification (no id at all)
const rpc = async (method: string, params?: unknown, id: number | null = 1) => {
  const res = await post(JSON.stringify({ jsonrpc: "2.0", id: id ?? undefined, method, params }));
  return { status: res.status, json: res.status === 202 ? null : await res.json() };
};
const callTool = (args: unknown) => rpc("tools/call", { name: "humanize_typing", arguments: args });

test("initialize echoes a known protocol version and offers tools", async () => {
  const { json } = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {} });
  assert.equal(json.id, 1);
  assert.equal(json.result.protocolVersion, "2025-06-18");
  assert.deepEqual(json.result.capabilities, { tools: {} });
  assert.equal(json.result.serverInfo.name, "humanize-typing");
});

test("initialize falls back to its newest version for an unknown one", async () => {
  const { json } = await rpc("initialize", { protocolVersion: "1999-01-01" });
  assert.equal(json.result.protocolVersion, "2025-11-25");
});

test("notifications get 202 and no body", async () => {
  const { status } = await rpc("notifications/initialized", undefined, null);
  assert.equal(status, 202);
});

test("tools/list describes the one tool", async () => {
  const { json } = await rpc("tools/list");
  assert.equal(json.result.tools.length, 1);
  const [tool] = json.result.tools;
  assert.equal(tool.name, "humanize_typing");
  assert.deepEqual(tool.inputSchema.required, ["text"]);
  assert.deepEqual(tool.inputSchema.properties.style.enum, ["message", "text", "post", "email"]);
});

test("tools/call humanizes on the server", async () => {
  const clean = await callTool({ text: "I do not know. It is fine.", mess: 0 });
  assert.deepEqual(clean.json.result, { content: [{ type: "text", text: "I don't know. It's fine." }] });

  const messy = await callTool({ text: "I think we are done. Let me know.", style: "text", mess: 1 });
  const out = messy.json.result.content[0].text;
  assert.notEqual(out, "I think we're done. Let me know.");
  assert.match(out, /^i /);
});

test("bad arguments come back as a tool error the model can read", async () => {
  for (const args of [
    {},
    { text: "  " },
    { text: "x".repeat(10_001) },
    { text: "Hello.", style: "nope" },
    { text: "Hello.", style: "constructor" },
    { text: "Hello.", mess: 2 },
    { text: "Hello.", mess: "0.5" },
  ]) {
    const { json } = await callTool(args);
    assert.equal(json.result.isError, true, JSON.stringify(args).slice(0, 60));
  }
});

test("unknown tools and methods are protocol errors", async () => {
  const tool = await rpc("tools/call", { name: "nope", arguments: {} });
  assert.equal(tool.json.error.code, -32602);
  const method = await rpc("resources/list");
  assert.equal(method.json.error.code, -32601);
  assert.deepEqual((await rpc("ping")).json.result, {});
});

test("broken JSON and non-messages are rejected", async () => {
  const broken = await post("{nope");
  assert.equal(broken.status, 400);
  assert.equal((await broken.json()).error.code, -32700);
  assert.equal((await (await post("5")).json()).error.code, -32600);
});

test("a batch gets one reply per request", async () => {
  const res = await post(
    JSON.stringify([
      { jsonrpc: "2.0", id: 1, method: "ping" },
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
    ]),
  );
  const replies = await res.json();
  assert.deepEqual(
    replies.map((r: { id: number }) => r.id),
    [1, 2],
  );
});
