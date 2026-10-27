// Remote MCP endpoint (Streamable HTTP, stateless). Runs behind Nginx at https://api.simplyutils.com/mcp.
import express from "express";
import { rateLimit } from "express-rate-limit";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";

const port = Number(process.env.PORT ?? 5016);
const host = process.env.HOST ?? "127.0.0.1";
const allowedHosts = (process.env.ALLOWED_HOSTS ?? "api.simplyutils.com,localhost,127.0.0.1").split(",").map(h => h.trim()).filter(Boolean);

const app = createMcpExpressApp({ host, allowedHosts: allowedHosts.flatMap(h => [h, `${h}:${port}`]) });
app.set("trust proxy", 1); // Nginx in front: rate-limit by the real client IP.
app.use(express.json({ limit: "200kb" }));
app.use("/mcp", rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: "draft-7", legacyHeaders: false }));

app.post("/mcp", async (req, res) => {
  // Stateless: a fresh server and transport per request, closed when the response ends.
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => { void transport.close(); void server.close(); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch {
    if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
  }
});
// No sessions or server-sent streams in stateless mode.
app.all("/mcp", (_req, res) => res.status(405).set("Allow", "POST").json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null }));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(port, host, () => console.log(`SimplyUtils MCP listening on http://${host}:${port}/mcp`));
