#!/usr/bin/env node
// Local MCP server over stdio, for `npx simplyutils-mcp` in Claude Desktop, Claude Code, Cursor and others.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

await createServer().connect(new StdioServerTransport());
