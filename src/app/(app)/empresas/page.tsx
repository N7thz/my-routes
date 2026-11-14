import type { Metadata } from "next";
import { Suspense } from "react";
import { getNotionClient } from "@/lib/notion-auth";
import { listCompanies, importFromNotion } from "@/lib/company-service";
import { CompaniesView } from "@/components/companies/companies-view";

export const metadata: Metadata = {
  title: "Empresas",
  description: "Empresas atendidas, com status, endereço, grupos e página no Notion.",
};

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
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Empresas</h1>
      <Suspense>
        <CompaniesView />
      </Suspense>
    </div>
  );
}
