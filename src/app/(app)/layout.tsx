import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, cookieStore] = await Promise.all([getSessionUser(), cookies()]);
  // O proxy só vê se o cookie existe; sessão inválida ou expirada cai aqui.
  if (!user) redirect("/login");

  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar user={user} isAdmin={isAdminEmail(user.email)} />
      <main className="flex flex-1 min-w-0 flex-col overflow-hidden">
        <header
          className="flex shrink-0 items-center gap-2 border-b bg-background/50 backdrop-blur-md px-4"
          style={{
            height: "calc(3.5rem + env(safe-area-inset-top))",
            paddingTop: "env(safe-area-inset-top)",
          }}
        >
          <SidebarTrigger className="-ml-1 hidden md:flex" />
          <Separator orientation="vertical" className="mx-2 h-4 hidden md:flex" />

          <div className="flex items-center gap-2 md:hidden">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
              MR
            </div>
            <span className="font-semibold text-sm">My Routes</span>
          </div>

          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col min-h-0 overflow-auto">
          {children}
        </div>

        <BottomNav />
      </main>
    </SidebarProvider>
  );
}
