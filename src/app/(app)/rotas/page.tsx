import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { RoutesDayView } from "@/components/routes-day-view";

export default async function RotasPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <RoutesDayView userImage={session?.user?.image ?? null} />
    </div>
  );
}
