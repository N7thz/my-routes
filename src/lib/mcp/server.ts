import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "@/lib/mcp/tools";

/** Um servidor novo por requisição: o modo é stateless, sem sessão MCP guardada. */
export function createMcpServer(): McpServer {
  const server = new McpServer({ name: "my-routes", version: "1.0.0" });
  registerTools(server);
  return server;
}
