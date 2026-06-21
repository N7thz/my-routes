import { isFullDataSource, isFullPage } from "@notionhq/client";
import type {
  PageObjectResponse,
  PartialPageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints/common";
import type {
  DataSourceObjectResponse,
  PartialDataSourceObjectResponse,
} from "@notionhq/client/build/src/api-endpoints/data-sources";

export type NotionSearchResult =
  | PageObjectResponse
  | PartialPageObjectResponse
  | DataSourceObjectResponse
  | PartialDataSourceObjectResponse;

export function getNotionTitle(item: NotionSearchResult): string {
  if (isFullDataSource(item)) {
    return item.title[0]?.plain_text ?? "Sem título";
  }
  if (isFullPage(item)) {
    const titleProp = Object.values(item.properties).find(
      (p) => p.type === "title"
    );
    if (titleProp?.type === "title") {
      return titleProp.title[0]?.plain_text ?? "Sem título";
    }
  }
  return "Sem título";
}

export function getNotionIcon(item: NotionSearchResult): string {
  if (isFullDataSource(item) || isFullPage(item)) {
    if (item.icon?.type === "emoji") return item.icon.emoji;
  }
  return item.object === "data_source" ? "🗃️" : "📄";
}
