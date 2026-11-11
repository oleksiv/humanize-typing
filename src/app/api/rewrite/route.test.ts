// Run with: npm test. OpenAI is faked, so no key or network is needed.
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { POST } from "./route.ts";

type Sent = {
  url: string;
  headers: Record<string, string>;
  body: { model: string; stream: boolean; messages: { role: string; content: string }[] };
};

const realFetch = globalThis.fetch;
let sent: Sent | undefined;

// respond(): what the fake OpenAI answers with
function fakeOpenAI(respond: () => Response) {
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    sent = { url, headers: init.headers as Record<string, string>, body: JSON.parse(init.body as string) };
    return respond();
  }) as typeof fetch;
}

// a streamed answer, delivered in the given network chunks
function streamOf(chunks: string[]) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
  );
}

const event = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;

const call = (body: unknown) =>
  POST(new Request("http://localhost/api/rewrite", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  sent = undefined;
  process.env.OPENAI_API_KEY = "test-key";
  delete process.env.OPENAI_MODEL;
  fakeOpenAI(() => streamOf([event("hey, "), event("sending it tomorrow."), "data: [DONE]\n\n"]));
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

test("sends the text and style to OpenAI and streams the rewrite back", async () => {
  const res = await call({ text: "I will send it tomorrow.", style: "text" });
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "hey, sending it tomorrow.");

  assert.equal(sent!.url, "https://api.openai.com/v1/chat/completions");
  assert.equal(sent!.headers.Authorization, "Bearer test-key");
  assert.equal(sent!.body.model, "gpt-6.1-sol");
  assert.equal(sent!.body.stream, true);
  assert.match(sent!.body.messages[0].content, /quick text to a friend/);
  assert.match(sent!.body.messages[0].content, /Do not add typos/);
  assert.deepEqual(sent!.body.messages[1], { role: "user", content: "I will send it tomorrow." });
});

test("passes text on piece by piece, not all at the end", async () => {
  const res = await call({ text: "Hello.", style: "message" });
  const reader = res.body!.getReader();
  const pieces: string[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    pieces.push(new TextDecoder().decode(value));
  }
  assert.deepEqual(pieces, ["hey, ", "sending it tomorrow."]);
});

test("handles events split across network chunks and skips broken ones", async () => {
  const all = event("one ") + "data: {broken\n\n" + event("two ") + event("thrée") + "data: [DONE]\n\n";
  // cut the stream at every possible byte position
  const bytes = new TextEncoder().encode(all);
  for (let cut = 1; cut < bytes.length; cut++) {
    fakeOpenAI(
      () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(bytes.slice(0, cut));
              controller.enqueue(bytes.slice(cut));
              controller.close();
            },
          }),
        ),
    );
    const res = await call({ text: "Hello.", style: "message" });
    assert.equal(await res.text(), "one two thrée", `cut at byte ${cut}`);
  }
});

test("includes writing samples and a custom model when given", async () => {
  process.env.OPENAI_MODEL = "some-other-model";
  await call({ text: "Hello.", style: "email", samples: "yo, running late" });
  assert.equal(sent!.body.model, "some-other-model");
  assert.match(sent!.body.messages[0].content, /yo, running late/);
});

test("explains a missing key and calls nothing", async () => {
  delete process.env.OPENAI_API_KEY;
  const res = await call({ text: "Hello.", style: "message" });
  assert.equal(res.status, 500);
  assert.match((await res.json()).error, /OPENAI_API_KEY/);
  assert.equal(sent, undefined);
});

test("rejects bad input before calling OpenAI", async () => {
  for (const body of [
    null,
    { style: "message" },
    { text: "   ", style: "message" },
    { text: "Hello.", style: "nope" },
    { text: "Hello.", style: "constructor" },
    { text: "x".repeat(10_001), style: "message" },
    { text: "Hello.", style: "message", samples: 5 },
  ]) {
    const res = await call(body);
    assert.equal(res.status, 400, JSON.stringify(body)?.slice(0, 60));
  }
  assert.equal(sent, undefined);
});

test("passes on OpenAI's error message", async () => {
  fakeOpenAI(
    () => new Response(JSON.stringify({ error: { message: "Incorrect API key provided" } }), { status: 401 }),
  );
  const res = await call({ text: "Hello.", style: "message" });
  assert.equal(res.status, 502);
  assert.match((await res.json()).error, /Incorrect API key provided/);
});

test("reports a network failure", async () => {
  fakeOpenAI(() => {
    throw new Error("offline");
  });
  const res = await call({ text: "Hello.", style: "message" });
  assert.equal(res.status, 502);
  assert.match((await res.json()).error, /Could not reach OpenAI/);
});
