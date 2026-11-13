/** URL da página no Notion a partir do id (com ou sem hífens). Seguro no cliente. */
export function notionPageUrl(notionId: string): string {
  return `https://www.notion.so/${notionId.replace(/-/g, "")}`;
}
