"use client";

function greeting(hour: number): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/** Saudação e data por extenso. Depende do relógio do aparelho, por isso suppressHydrationWarning. */
export function TodayHeader({ name }: { name?: string | null }) {
  const now = new Date();
  const firstName = name?.trim().split(/\s+/)[0];
  const date = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <header className="flex flex-col gap-0.5" suppressHydrationWarning>
      <h1 className="text-2xl font-semibold tracking-tight">
        {greeting(now.getHours())}
        {firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="text-sm capitalize text-muted-foreground">{date}</p>
    </header>
  );
}
