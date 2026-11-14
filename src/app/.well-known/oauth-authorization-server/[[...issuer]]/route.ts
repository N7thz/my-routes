import { appOrigin, authorizationServerMetadata, metadataResponse } from "@/lib/mcp/oauth";

// RFC 8414: endpoints do servidor OAuth (plugin `mcp` do Better Auth em /api/auth/mcp/*).
export function GET(request: Request) {
  return metadataResponse(authorizationServerMetadata(appOrigin(request)));
}

export function OPTIONS() {
  return metadataResponse(null);
}
