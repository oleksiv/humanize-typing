// The MCP server over Streamable HTTP. Stateless, so every reply is plain JSON.
// Only POST is exported: Next answers GET and DELETE with 405, which tells MCP
// clients there is no event stream and no session to close.
import { handle, PARSE_ERROR } from "../../../lib/mcp.ts";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(PARSE_ERROR, { status: 400 });
  }
  const reply = handle(body);
  return reply === undefined ? new Response(null, { status: 202 }) : Response.json(reply);
}
