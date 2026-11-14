import { appOrigin, authorizationServerMetadata, metadataResponse } from "@/lib/mcp/oauth";

// Alguns clientes MCP procuram a descoberta OIDC em vez da RFC 8414; é o mesmo conteúdo.
export function GET(request: Request) {
  return metadataResponse(authorizationServerMetadata(appOrigin(request)));
}

export function OPTIONS() {
  return metadataResponse(null);
}
