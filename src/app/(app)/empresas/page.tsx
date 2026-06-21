import { Suspense } from "react";
import { getNotionClient } from "@/lib/notion-auth";
import { listCompanies, importFromNotion } from "@/lib/company-service";
import { CompaniesView } from "@/components/companies-view";

export default async function EmpresasPage() {
  const existing = await listCompanies();

  if (existing.length === 0) {
    const notion = await getNotionClient();
    if (notion.client) {
      await importFromNotion(notion.client);
    }
  }

  return (
    <div className="flex flex-1 flex-col p-6">
      <Suspense>
        <CompaniesView />
      </Suspense>
    </div>
  );
}
