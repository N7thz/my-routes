"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "@/components/nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="shrink-0 border-t bg-background/50 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid h-16 grid-cols-5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 touch-manipulation transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full border px-3 py-1",
                  isActive ? "border-foreground/20 bg-foreground/10" : "border-transparent"
                )}
              >
                <item.icon
                  strokeWidth={isActive ? 2.5 : 1.75}
                  className="size-[22px]"
                />
              </span>
              <span className="text-[10px] font-medium leading-none">
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
