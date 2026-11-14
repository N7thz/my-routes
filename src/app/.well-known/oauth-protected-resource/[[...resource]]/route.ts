import { appOrigin, metadataResponse, protectedResourceMetadata } from "@/lib/mcp/oauth";

// RFC 9728: o cliente MCP chega aqui pelo `resource_metadata` do 401 de /api/mcp
// (ou tentando /.well-known/oauth-protected-resource[/api/mcp] direto).
export function GET(request: Request) {
  return metadataResponse(protectedResourceMetadata(appOrigin(request)));
}

export function OPTIONS() {
  return metadataResponse(null);
}
