// End to end: a real MCP client talks to the server, as Claude or ChatGPT would.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

async function connect() {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverSide);
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(clientSide);
  return client;
}

test("lists the ten tools, all read-only", async () => {
  const client = await connect();
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(t => t.name).sort(), ["base64", "convert_timestamp", "convert_units", "count_words", "format_json", "generate_password", "generate_qr_code", "generate_uuid", "hash_text", "test_regex"]);
  for (const tool of tools) assert.equal(tool.annotations?.readOnlyHint, true, tool.name);
});

test("answers include a link back to the matching SimplyUtils tool", async () => {
  const client = await connect();
  const result = await client.callTool({ name: "convert_units", arguments: { value: "1", category: "length", from: "m", to: "cm" } });
  const text = (result.content as { type: string; text: string }[])[0].text;
  assert.match(text, /1 m = 100 cm/);
  assert.match(text, /https:\/\/simplyutils\.com\/tool\/unit-converter/);
});

test("tool errors come back as readable text, not a crash", async () => {
  const client = await connect();
  const result = await client.callTool({ name: "format_json", arguments: { json: "{oops" } });
  assert.equal(result.isError, true);
  assert.match((result.content as { text: string }[])[0].text, /Invalid JSON/);
});

test("the QR tool returns a PNG image", async () => {
  const client = await connect();
  const result = await client.callTool({ name: "generate_qr_code", arguments: { text: "https://simplyutils.com" } });
  const image = (result.content as { type: string; mimeType?: string }[]).find(part => part.type === "image");
  assert.equal(image?.mimeType, "image/png");
});
