<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ui-sdk

Before using ui-sdk, follow the `ui-sdk` skill if it's installed, and read `node_modules/@ui-sdk/react/docs/llms.txt`. To build a new component, also search `node_modules/@ui-sdk/react/docs/core.md` by heading, and read `rendering.md` next to it.

Neste projeto, `src/components/ui/*` são wrappers do ui-sdk com a API do shadcn (mesmos nomes, `asChild`, variantes) e o visual em Tailwind do DESIGN.md. Use esses wrappers nas telas; o `@ui-sdk/core/web.css` não é importado. Estilize estado pelos atributos do ui-sdk (`data-open`, `data-highlighted`, `data-selected`, `data-starting-style`, `data-ending-style`), não pelos do Radix (`data-[state=open]`).
