import "server-only";
import {
  Client,
  isFullBlock,
  iteratePaginatedAPI,
  type BlockObjectRequest,
  type BlockObjectResponse,
  type RichTextItemResponse,
} from "@notionhq/client";

/** Página "MODELO INSPEÇÃO", cujo conteúdo vira o corpo da página de cada empresa. */
export const INSPECTION_TEMPLATE_ID =
  process.env.NOTION_INSPECTION_TEMPLATE_ID ?? "304f6788631d809dbb63e474a9667975";

/** Limite da API por chamada de criação/append. */
const MAX_BLOCKS_PER_REQUEST = 100;

// Blocos que a API lê mas não deixa criar (ou que só fazem sentido na página
// original): ficam de fora da cópia.
const NOT_COPYABLE = new Set([
  "unsupported",
  "child_page",
  "child_database",
  "link_preview",
  "meeting_notes",
  "transcription",
  "template",
  "synced_block",
]);

type TemplateBlock = { block: BlockObjectResponse; children: TemplateBlock[] };

async function readTree(client: Client, blockId: string): Promise<TemplateBlock[]> {
  const nodes: TemplateBlock[] = [];
  for await (const block of iteratePaginatedAPI(client.blocks.children.list, { block_id: blockId })) {
    if (!isFullBlock(block) || NOT_COPYABLE.has(block.type)) continue;
    // Arquivo hospedado no Notion tem URL temporária: não dá para recriar por link.
    const content = (block as Record<string, unknown>)[block.type] as { type?: string } | undefined;
    if (content?.type === "file") continue;
    nodes.push({
      block,
      children: block.has_children ? await readTree(client, block.id) : [],
    });
  }
  return nodes;
}

/** Lê o conteúdo do modelo (recursivo). Lança se a conexão não tiver acesso a ele. */
export function readInspectionTemplate(client: Client): Promise<TemplateBlock[]> {
  return readTree(client, INSPECTION_TEMPLATE_ID);
}

const text = (content: string): RichTextItemResponse[] =>
  [{ type: "text", text: { content: content.slice(0, 2000), link: null } }] as RichTextItemResponse[];

const plainText = (rich: RichTextItemResponse[]) =>
  rich.map((r) => r.plain_text).join("").trim().toUpperCase();

/**
 * Preenche células de tabela no formato "RÓTULO | valor": a linha cujo
 * primeiro texto bate com o rótulo recebe o valor na segunda célula, se vazia.
 */
export function fillTableCells(nodes: TemplateBlock[], values: Record<string, string | null>): void {
  const wanted = Object.fromEntries(
    Object.entries(values).flatMap(([label, value]) => (value ? [[label.toUpperCase(), value]] : []))
  );
  for (const node of nodes) {
    const { block } = node;
    if (block.type === "table_row") {
      const [label, value] = block.table_row.cells;
      const fill = label && wanted[plainText(label)];
      if (fill && value && plainText(value) === "") block.table_row.cells[1] = text(fill);
    }
    fillTableCells(node.children, values);
  }
}

/** Corpo de criação do bloco a partir da resposta da API (sem id, datas etc.). */
function toRequest(node: TemplateBlock, inlineChildren: BlockObjectRequest[] | null): BlockObjectRequest {
  const { type } = node.block;
  const content = { ...((node.block as Record<string, unknown>)[type] as object) };
  if (inlineChildren) Object.assign(content, { children: inlineChildren });
  return { type, [type]: content } as unknown as BlockObjectRequest;
}

/** Filhos vão junto na criação só quando não têm netos (a API aceita 2 níveis). */
const canInline = (node: TemplateBlock) =>
  node.children.length > 0 && node.children.every((c) => c.children.length === 0);

/**
 * Anexa a árvore sob `parentId`, em lotes de 100. Tabelas precisam das linhas
 * na criação, e linhas nunca têm filhos, então sempre cabem inline; filhos
 * mais fundos são anexados depois, usando o id devolvido pela API.
 */
export async function appendTree(client: Client, parentId: string, nodes: TemplateBlock[]): Promise<void> {
  for (let i = 0; i < nodes.length; i += MAX_BLOCKS_PER_REQUEST) {
    const batch = nodes.slice(i, i + MAX_BLOCKS_PER_REQUEST);
    const res = await client.blocks.children.append({
      block_id: parentId,
      children: batch.map((node) =>
        toRequest(node, canInline(node) ? node.children.map((c) => toRequest(c, null)) : null)
      ),
    });
    for (const [j, node] of batch.entries()) {
      if (node.children.length > 0 && !canInline(node)) {
        await appendTree(client, res.results[j].id, node.children);
      }
    }
  }
}
