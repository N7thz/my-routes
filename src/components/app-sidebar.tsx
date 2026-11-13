"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOutIcon, ChevronsUpDownIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useSignOut } from "@/hooks/use-sign-out";
import { getInitials } from "@/lib/utils";
import { navItems } from "@/components/nav-items";

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export function AppSidebar({ user }: { user?: User | null }) {
  const pathname = usePathname();
  const handleSignOut = useSignOut();

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="My Routes">
              <Link href="/">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                  MR
                </div>
                <span className="font-semibold">My Routes</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={user?.name ?? "Usuário"}
                  className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={user?.image ?? ""} alt={user?.name ?? ""} />
                    <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col leading-none text-left">
                    <span className="truncate text-sm font-medium">{user?.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronsUpDownIcon className="ml-auto size-4 shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-56">
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOutIcon />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
