import { getSessionUser } from "@/lib/session";
import { TodayView } from "@/components/today/today-view";

export default async function Home() {
  const user = await getSessionUser();
  return <TodayView name={user?.name} />;
}
