import type { Metadata } from "next";
import { getSessionUser } from "@/lib/session";
import { TodayView } from "@/components/today/today-view";

export const metadata: Metadata = {
  title: "Hoje",
  description: "A rota e os compromissos de hoje.",
};

export default async function Home() {
  const user = await getSessionUser();
  return <TodayView name={user?.name} />;
}
