import type { Client } from "@notionhq/client";
import type {
  CreatePageParameters,
  UpdatePageParameters,
  QueryDataSourceParameters,
  SearchParameters,
} from "@notionhq/client/build/src/api-endpoints";

export async function searchWorkspace(
  notion: Client,
  query?: string,
  filter?: SearchParameters["filter"]
) {
  const response = await notion.search({
    query,
    sort: { direction: "descending", timestamp: "last_edited_time" },
    page_size: 20,
    filter,
  });
  return response.results;
}

export async function getPage(notion: Client, pageId: string) {
  return notion.pages.retrieve({ page_id: pageId });
}

export async function getPageMarkdown(notion: Client, pageId: string) {
  return notion.pages.retrieveMarkdown({ page_id: pageId });
}

export async function updatePageMarkdown(
  notion: Client,
  pageId: string,
  content: string
) {
  return notion.pages.updateMarkdown({
    page_id: pageId,
    type: "replace_content_range",
    replace_content_range: { content, content_range: "all" },
  });
}

export async function getPageBlocks(notion: Client, blockId: string) {
  const response = await notion.blocks.children.list({
    block_id: blockId,
    page_size: 100,
  });
  return response.results;
}

export async function getDatabase(notion: Client, databaseId: string) {
  return notion.databases.retrieve({ database_id: databaseId });
}

// In Notion API v5, querying rows uses dataSources.query with data_source_id
export async function queryDataSource(
  notion: Client,
  dataSourceId: string,
  options?: Omit<QueryDataSourceParameters, "data_source_id">
) {
  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
    page_size: 20,
    ...options,
  });
  return response;
}

export async function createPage(
  notion: Client,
  params: CreatePageParameters
) {
  return notion.pages.create(params);
}

export async function updatePage(
  notion: Client,
  pageId: string,
  properties: UpdatePageParameters["properties"]
) {
  return notion.pages.update({ page_id: pageId, properties });
}

export async function archivePage(notion: Client, pageId: string) {
  return notion.pages.update({ page_id: pageId, in_trash: true });
}
