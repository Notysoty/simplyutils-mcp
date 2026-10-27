import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as tools from "./tools.js";

const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;
const text = (body: string, slug: string) => ({
  content: [{ type: "text" as const, text: `${body}\n\nOpen in SimplyUtils: ${tools.toolUrl(slug)}` }],
});
/** Tool errors go back to the model as readable text instead of failing the call. */
async function run(slug: string, work: () => Promise<string> | string) {
  try { return text(await work(), slug); }
  catch (error) { return { ...text(`Error: ${(error as Error).message}`, slug), isError: true }; }
}

export function createServer() {
  const server = new McpServer(
    { name: "simplyutils", title: "SimplyUtils", version: "1.0.0", websiteUrl: tools.SITE },
    { instructions: "Everyday developer and text utilities from SimplyUtils (simplyutils.com). Results are computed directly, with no AI and no external lookups. Each answer links to the matching free tool on simplyutils.com." },
  );

  server.registerTool("format_json", {
    title: "Format or minify JSON",
    description: "Validate JSON and pretty-print or minify it, optionally sorting object keys. Returns the error position for invalid JSON.",
    inputSchema: { json: z.string().describe("The JSON text"), indent: z.enum(["2", "4", "tab", "minify"]).default("2"), sortKeys: z.boolean().default(false) },
    annotations: readOnly,
  }, ({ json, indent, sortKeys }) => run("json-formatter", () => tools.formatJson(json, indent, sortKeys)));

  server.registerTool("generate_qr_code", {
    title: "Generate a QR code",
    description: "Make a static QR code for a link or text (up to 800 bytes). Returns a PNG image and the SVG markup. Static codes never expire.",
    inputSchema: {
      text: z.string().describe("Link or text to encode"),
      errorCorrection: z.enum(["L", "M", "Q", "H"]).default("M"),
      foreground: z.string().default("#000000").describe("Six-digit hex color for the modules"),
      background: z.string().default("#ffffff").describe("Six-digit hex color for the background"),
    },
    annotations: readOnly,
  }, async ({ text: value, errorCorrection, foreground, background }) => {
    try {
      const { svg, pngBase64 } = await tools.qrCode(value, errorCorrection, foreground, background);
      return { content: [
        { type: "image" as const, data: pngBase64, mimeType: "image/png" },
        { type: "text" as const, text: `SVG:\n${svg}\n\nTest the code with your phone before printing. Customize colors and add a logo: ${tools.toolUrl("qr-code-generator")}` },
      ] };
    } catch (error) { return { ...text(`Error: ${(error as Error).message}`, "qr-code-generator"), isError: true }; }
  });

  server.registerTool("convert_units", {
    title: "Convert units",
    description: `Convert a value between units of the same category. Units (symbol or name): ${tools.unitList()}.`,
    inputSchema: {
      value: z.string().describe("A plain number, e.g. 12.5"),
      category: z.enum(tools.unitCategories as [string, ...string[]]),
      from: z.string().describe("Unit symbol or name, e.g. km or kilometer"),
      to: z.string().describe("Unit symbol or name, e.g. mi or mile"),
    },
    annotations: readOnly,
  }, ({ value, category, from, to }) => run("unit-converter", () => tools.convertUnits(value, category as never, from, to).text));

  server.registerTool("generate_password", {
    title: "Generate strong passwords",
    description: "Generate random passwords with a cryptographically secure generator. Each chosen character set appears at least once.",
    inputSchema: {
      length: z.number().int().min(8).max(128).default(16),
      count: z.number().int().min(1).max(20).default(1),
      uppercase: z.boolean().default(true), lowercase: z.boolean().default(true), numbers: z.boolean().default(true), symbols: z.boolean().default(true),
    },
    annotations: { ...readOnly, idempotentHint: false },
  }, ({ length, count, ...sets }) => run("password-generator", () => tools.generatePasswords(length, count, sets).join("\n")));

  server.registerTool("generate_uuid", {
    title: "Generate UUIDs",
    description: "Generate random version 4 UUIDs.",
    inputSchema: { count: z.number().int().min(1).max(50).default(1) },
    annotations: { ...readOnly, idempotentHint: false },
  }, ({ count }) => run("uuid-generator", () => tools.generateUuids(count).join("\n")));

  server.registerTool("hash_text", {
    title: "Hash text",
    description: "Hash UTF-8 text with MD5, SHA-1, SHA-256, SHA-384 or SHA-512 and return the hex digest. MD5 and SHA-1 are for checksums only, not security.",
    inputSchema: { text: z.string(), algorithm: z.enum(["md5", "sha1", "sha256", "sha384", "sha512"]).default("sha256") },
    annotations: readOnly,
  }, ({ text: value, algorithm }) => run("hash-generator", () => `${algorithm}: ${tools.hashText(value, algorithm)}`));

  server.registerTool("base64", {
    title: "Base64 encode or decode",
    description: "Encode UTF-8 text to Base64 (standard or URL-safe) or decode Base64 back to text.",
    inputSchema: { text: z.string(), mode: z.enum(["encode", "decode"]), urlSafe: z.boolean().default(false) },
    annotations: readOnly,
  }, ({ text: value, mode, urlSafe }) => run("base64", () => tools.base64(value, mode, urlSafe)));

  server.registerTool("test_regex", {
    title: "Test a regular expression",
    description: "Run a JavaScript regular expression against text and list every match with its position and capture groups (up to 200 matches, 0.5 s limit).",
    inputSchema: { pattern: z.string().describe("Pattern without slashes"), flags: z.string().default("g").describe("JavaScript flags such as gi"), text: z.string() },
    annotations: readOnly,
  }, ({ pattern, flags, text: value }) => run("regex-tester", () => {
    const matches = tools.testRegex(pattern, flags, value);
    if (!matches.length) return "No matches.";
    return `${matches.length} match${matches.length === 1 ? "" : "es"}:\n` + matches.map((m, i) =>
      `${i + 1}. "${m.match}" at ${m.index}` + (m.groups.length ? ` groups: ${JSON.stringify(m.groups)}` : "") + (m.named ? ` named: ${JSON.stringify(m.named)}` : "")).join("\n");
  }));

  server.registerTool("convert_timestamp", {
    title: "Convert a Unix timestamp or date",
    description: "Convert a Unix timestamp (seconds or milliseconds) or a date string to Unix seconds, milliseconds, ISO 8601, UTC and a chosen time zone.",
    inputSchema: { value: z.string().describe("e.g. 1767225600 or 2026-10-27T09:30:00Z"), timeZone: z.string().default("UTC").describe("IANA time zone, e.g. Asia/Kolkata") },
    annotations: readOnly,
  }, ({ value, timeZone }) => run("timestamp-converter", () => {
    const r = tools.convertTimestamp(value, timeZone);
    return `Unix seconds: ${r.unixSeconds}\nUnix milliseconds: ${r.unixMilliseconds}\nISO 8601: ${r.iso}\nUTC: ${r.utc}\n${r.timeZone}: ${r.local}`;
  }));

  server.registerTool("count_words", {
    title: "Count words and characters",
    description: "Count words, characters, sentences and paragraphs in text, with an estimated reading time.",
    inputSchema: { text: z.string() },
    annotations: readOnly,
  }, ({ text: value }) => run("word-counter", () => {
    const r = tools.countWords(value);
    return `Words: ${r.words}\nCharacters: ${r.characters}\nCharacters (no spaces): ${r.charactersWithoutSpaces}\nSentences: ${r.sentences}\nParagraphs: ${r.paragraphs}\nReading time: about ${r.readingTimeMinutes} min`;
  }));

  return server;
}
