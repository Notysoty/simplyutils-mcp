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
    { name: "simplyutils", title: "SimplyUtils", version: "1.0.2", websiteUrl: tools.SITE },
    { instructions: "Everyday developer and text utilities from SimplyUtils (simplyutils.com). Results are computed directly, with no AI and no external lookups. Each answer links to the matching free tool on simplyutils.com." },
  );

  server.registerTool("format_json", {
    title: "Format or minify JSON",
    description: "Validate JSON and return it pretty-printed or minified, optionally with object keys sorted A-Z (recursively; array order is kept). Returns the formatted JSON as text. Invalid JSON returns an error naming the problem and its position. Input up to 100 KB.",
    inputSchema: {
      json: z.string().describe("The JSON text to validate and format"),
      indent: z.enum(["2", "4", "tab", "minify"]).default("2").describe("2 or 4 spaces, a tab, or minify to remove all whitespace"),
      sortKeys: z.boolean().default(false).describe("Sort object keys alphabetically at every level"),
    },
    annotations: readOnly,
  }, ({ json, indent, sortKeys }) => run("json-formatter", () => tools.formatJson(json, indent, sortKeys)));

  server.registerTool("generate_qr_code", {
    title: "Generate a QR code",
    description: "Make a static QR code for a link or any text, up to 800 UTF-8 bytes. Returns a 512 px PNG image plus the SVG markup. The data is stored in the code itself, so it never expires and needs no account. Light-on-dark colors are allowed, but some older scanners need dark on light. Errors are returned for empty text, content over 800 bytes, or colors that are not six-digit hex.",
    inputSchema: {
      text: z.string().describe("Link or text to encode"),
      errorCorrection: z.enum(["L", "M", "Q", "H"]).default("M").describe("Error correction: L 7%, M 15%, Q 25%, H 30% of the code can be damaged and still scan; higher is denser"),
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
    description: `Convert a number between two units of the same category and return a line such as "5 mi = 8.04672 km" (up to 10 significant digits). Units are matched by symbol or name, case-insensitive. Errors are returned for unknown units, units from another category, non-numeric values and temperatures below absolute zero. Months are 1/12 of a 365-day year. Units by category (symbols): ${tools.unitList()}.`,
    inputSchema: {
      value: z.string().describe("A plain number such as 12.5, -40 or 1e6 (no commas or unit text)"),
      category: z.enum(tools.unitCategories as [string, ...string[]]).describe("The kind of quantity; both units must belong to it"),
      from: z.string().describe("Unit symbol or name, e.g. km or kilometer"),
      to: z.string().describe("Unit symbol or name, e.g. mi or mile"),
    },
    annotations: readOnly,
  }, ({ value, category, from, to }) => run("unit-converter", () => tools.convertUnits(value, category as never, from, to).text));

  server.registerTool("generate_password", {
    title: "Generate strong passwords",
    description: "Generate random passwords with Node's cryptographically secure generator. Each enabled character set appears at least once and the result is shuffled. Returns one password per line; every call gives new results. An error is returned if all character sets are turned off. Passwords are not stored or logged.",
    inputSchema: {
      length: z.number().int().min(8).max(128).default(16).describe("Characters per password, 8-128"),
      count: z.number().int().min(1).max(20).default(1).describe("How many passwords to generate, 1-20"),
      uppercase: z.boolean().default(true).describe("Include A-Z"),
      lowercase: z.boolean().default(true).describe("Include a-z"),
      numbers: z.boolean().default(true).describe("Include 0-9"),
      symbols: z.boolean().default(true).describe("Include symbols such as !@#$%^&*"),
    },
    annotations: { ...readOnly, idempotentHint: false },
  }, ({ length, count, ...sets }) => run("password-generator", () => tools.generatePasswords(length, count, sets).join("\n")));

  server.registerTool("generate_uuid", {
    title: "Generate UUIDs",
    description: "Generate random version 4 UUIDs (RFC 9562) in lowercase 8-4-4-4-12 form, one per line. Every call gives new values.",
    inputSchema: { count: z.number().int().min(1).max(50).default(1).describe("How many UUIDs to generate, 1-50") },
    annotations: { ...readOnly, idempotentHint: false },
  }, ({ count }) => run("uuid-generator", () => tools.generateUuids(count).join("\n")));

  server.registerTool("hash_text", {
    title: "Hash text",
    description: "Hash text (encoded as UTF-8) and return a line such as 'sha256: ba78...' with the lowercase hex digest. The same input always gives the same hash. MD5 and SHA-1 are only for checksums, not security; do not use plain hashes to store passwords. Input up to 100 KB.",
    inputSchema: {
      text: z.string().describe("The exact text to hash; spaces and line breaks change the result"),
      algorithm: z.enum(["md5", "sha1", "sha256", "sha384", "sha512"]).default("sha256").describe("Hash algorithm; sha256 is the usual choice"),
    },
    annotations: readOnly,
  }, ({ text: value, algorithm }) => run("hash-generator", () => `${algorithm}: ${tools.hashText(value, algorithm)}`));

  server.registerTool("base64", {
    title: "Base64 encode or decode",
    description: "Encode text (as UTF-8) to Base64, or decode Base64 back to text, and return the result. Decoding accepts standard and URL-safe alphabets and ignores whitespace; invalid Base64 returns an error. Bytes that are not valid UTF-8 are shown as replacement characters. Input up to 100 KB.",
    inputSchema: {
      text: z.string().describe("Text to encode, or Base64 to decode"),
      mode: z.enum(["encode", "decode"]).describe("encode: text to Base64; decode: Base64 to text"),
      urlSafe: z.boolean().default(false).describe("When encoding, use - and _ and drop = padding (for URLs and JWTs)"),
    },
    annotations: readOnly,
  }, ({ text: value, mode, urlSafe }) => run("base64", () => tools.base64(value, mode, urlSafe)));

  server.registerTool("test_regex", {
    title: "Test a regular expression",
    description: "Run a JavaScript (ECMAScript) regular expression against text. Returns the match count and, for each match, the matched text, its 0-based index, numbered capture groups and named groups. Returns 'No matches.' when nothing matches. All matches are listed (the g flag is added automatically), up to 200. Invalid patterns or flags return an error explaining why; patterns that run longer than 0.5 seconds are stopped with an error. Text up to 100 KB.",
    inputSchema: {
      pattern: z.string().describe("The pattern without surrounding slashes, for example (\\d+)-(?<unit>[a-z]+)"),
      flags: z.string().default("g").describe("Any of d, g, i, m, s, u, v, y; for example gi for case-insensitive"),
      text: z.string().describe("The text to search"),
    },
    annotations: readOnly,
  }, ({ pattern, flags, text: value }) => run("regex-tester", () => {
    const matches = tools.testRegex(pattern, flags, value);
    if (!matches.length) return "No matches.";
    return `${matches.length} match${matches.length === 1 ? "" : "es"}:\n` + matches.map((m, i) =>
      `${i + 1}. "${m.match}" at ${m.index}` + (m.groups.length ? ` groups: ${JSON.stringify(m.groups)}` : "") + (m.named ? ` named: ${JSON.stringify(m.named)}` : "")).join("\n");
  }));

  server.registerTool("convert_timestamp", {
    title: "Convert a Unix timestamp or date",
    description: "Convert a Unix timestamp or a date to Unix seconds, Unix milliseconds, ISO 8601 (UTC), an HTTP-style UTC string and a readable date in the chosen time zone. Numbers with 13 or more digits are read as milliseconds, shorter ones as seconds. Dates without a time zone are read as UTC. Errors are returned for unreadable dates and unknown time zones.",
    inputSchema: { value: z.string().describe("e.g. 1767225600 or 2026-10-27T09:30:00Z"), timeZone: z.string().default("UTC").describe("IANA time zone, e.g. Asia/Kolkata") },
    annotations: readOnly,
  }, ({ value, timeZone }) => run("timestamp-converter", () => {
    const r = tools.convertTimestamp(value, timeZone);
    return `Unix seconds: ${r.unixSeconds}\nUnix milliseconds: ${r.unixMilliseconds}\nISO 8601: ${r.iso}\nUTC: ${r.utc}\n${r.timeZone}: ${r.local}`;
  }));

  server.registerTool("count_words", {
    title: "Count words and characters",
    description: "Count words, characters (with and without spaces), sentences and paragraphs, and estimate reading time at 238 words per minute. Words are runs of letters or digits in any language; hyphenated words and contractions count once. Paragraphs are separated by blank lines. Input up to 100 KB.",
    inputSchema: { text: z.string().describe("The text to analyze") },
    annotations: readOnly,
  }, ({ text: value }) => run("word-counter", () => {
    const r = tools.countWords(value);
    return `Words: ${r.words}\nCharacters: ${r.characters}\nCharacters (no spaces): ${r.charactersWithoutSpaces}\nSentences: ${r.sentences}\nParagraphs: ${r.paragraphs}\nReading time: about ${r.readingTimeMinutes} min`;
  }));

  return server;
}
