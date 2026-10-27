# SimplyUtils MCP server

Everyday developer and text tools from [SimplyUtils](https://simplyutils.com) for Claude, ChatGPT, Cursor and any other [Model Context Protocol](https://modelcontextprotocol.io) client.

Ask things like *"format this JSON"*, *"make a QR code for https://example.com"*, *"convert 5 miles to km"* or *"test this regex against my log line"*. The answers are computed directly: no AI calls, no external lookups, and nothing is stored. Each answer links to the matching free tool on simplyutils.com, where you can do more with it.

## Tools

| Tool | What it does | On the web |
|---|---|---|
| `format_json` | Validate, pretty-print or minify JSON, optionally sorting keys | [JSON Formatter](https://simplyutils.com/tool/json-formatter) |
| `generate_qr_code` | Static QR code for a link or text, as PNG and SVG | [QR Code Generator](https://simplyutils.com/tool/qr-code-generator) |
| `convert_units` | Length, weight, temperature, volume, speed, area, data and time | [Unit Converter](https://simplyutils.com/tool/unit-converter) |
| `generate_password` | Cryptographically random passwords (8–128 characters) | [Password Generator](https://simplyutils.com/tool/password-generator) |
| `generate_uuid` | Random version 4 UUIDs | [UUID Generator](https://simplyutils.com/tool/uuid-generator) |
| `hash_text` | MD5, SHA-1, SHA-256, SHA-384, SHA-512 hex digests | [Hash Generator](https://simplyutils.com/tool/hash-generator) |
| `base64` | Encode or decode UTF-8 text (standard or URL-safe) | [Base64 Encoder](https://simplyutils.com/tool/base64) |
| `test_regex` | Run a JavaScript regex and list matches and capture groups | [Regex Tester](https://simplyutils.com/tool/regex-tester) |
| `convert_timestamp` | Unix seconds or milliseconds ↔ ISO 8601, UTC and any time zone | [Timestamp Converter](https://simplyutils.com/tool/timestamp-converter) |
| `count_words` | Words, characters, sentences, paragraphs and reading time | [Word Counter](https://simplyutils.com/tool/word-counter) |

All tools are read-only.

## Connect

The hosted server is free to use at:

```
https://api.simplyutils.com/mcp
```

**Claude (claude.ai and desktop):** Settings → Connectors → *Add custom connector*, then paste the URL above.

**Claude Code:**

```bash
claude mcp add --transport http simplyutils https://api.simplyutils.com/mcp
```

**ChatGPT:** Settings → Apps & Connectors → enable developer mode → *Create*, then paste the URL above.

**Cursor, VS Code and other clients** (`mcp.json`):

```json
{
  "mcpServers": {
    "simplyutils": { "url": "https://api.simplyutils.com/mcp" }
  }
}
```

**Run it locally instead** (no network needed after install):

```json
{
  "mcpServers": {
    "simplyutils": { "command": "npx", "args": ["-y", "simplyutils-mcp"] }
  }
}
```

## Limits

- Text inputs up to 100 KB; QR content up to 800 bytes.
- Regex patterns stop after 0.5 seconds and return at most 200 matches.
- The hosted endpoint allows 60 requests per minute per IP address.

## Privacy

Tool inputs are processed in memory to produce the answer and are not stored or logged by this server. The hosted endpoint runs on SimplyUtils infrastructure; see the [SimplyUtils privacy policy](https://simplyutils.com/privacy).

## Develop

```bash
npm install
npm test          # unit and end-to-end MCP tests
npm run build
npm start         # HTTP server on http://127.0.0.1:5016/mcp
npm run start:stdio
```

## License

MIT © Memegician LLC. SimplyUtils is a product of Memegician LLC.
