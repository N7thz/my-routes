import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";
import { databaseSizeBytes, usageByService, type UsageWindow } from "@/lib/usage";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin · uso das ferramentas",
  description: "Consumo das ferramentas com plano grátis e cota.",
  robots: { index: false },
};

// Limites dos planos grátis em uso (conferir nas páginas de preço se mudarem).
const LIMITS = {
  geoapifyPerDay: 3_000,
  maptilerSessionsPerMonth: 5_000,
  neonStorageBytes: 1024 ** 3,
  neonComputeHoursPerMonth: 100,
};

const nf = new Intl.NumberFormat("pt-BR");

function formatBytes(bytes: number) {
  return bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function UsageBar({ value, limit }: { value: number; limit: number }) {
  const pct = Math.min(100, (value / limit) * 100);
  const tone = pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-500" : "bg-primary";
  return (
    // Só visual: o número e a porcentagem já estão no texto ao lado.
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(pct, value > 0 ? 1 : 0)}%` }} />
    </div>
  );
}

function Metric({ label, value, limit, unit }: { label: string; value: number; limit: number; unit: string }) {
  const pct = (value / limit) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          <span className="font-semibold">{nf.format(value)}</span>
          <span className="text-muted-foreground">
            {" "}
            / {nf.format(limit)} {unit} · {pct < 1 && value > 0 ? "<1" : Math.round(pct)}%
          </span>
        </span>
      </div>
      <UsageBar value={value} limit={limit} />
    </div>
  );
}

/** Barrinhas dos últimos 30 dias (dias sem uso ficam vazios). */
function Last30Days({ usage }: { usage: UsageWindow }) {
  const byDay = new Map(usage.daily.map((d) => [d.day, d.count]));
  const days: { day: string; count: number }[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const day = d.toISOString().slice(0, 10);
    days.push({ day, count: byDay.get(day) ?? 0 });
  }
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div>
      <div className="flex h-12 items-end gap-px" aria-hidden>
        {days.map((d) => (
          <div
            key={d.day}
            title={`${d.day.split("-").reverse().join("/")}: ${nf.format(d.count)}`}
            className="flex-1 rounded-t-sm bg-primary/70"
            style={{ height: `${d.count ? Math.max(4, (d.count / max) * 100) : 0}%` }}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Últimos 30 dias</p>
    </div>
  );
}

function ServiceCard({
  name,
  plan,
  href,
  hrefLabel,
  children,
}: {
  name: string;
  plan: string;
  href: string;
  hrefLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">{name}</h2>
          <Badge variant="secondary">{plan}</Badge>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {hrefLabel}
          <ExternalLinkIcon className="size-3" />
        </a>
      </div>
      {children}
    </Card>
  );
}

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) notFound();

  const [usage, dbBytes] = await Promise.all([usageByService(), databaseSizeBytes()]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 pb-28 sm:px-6 md:pb-10">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Uso das ferramentas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consumo das ferramentas com cota, contado pelo próprio app (dias em UTC). Para o número oficial, use o
            painel de cada serviço.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <ServiceCard name="Geoapify" plan="Free" href="https://myprojects.geoapify.com/" hrefLabel="Painel">
            <Metric label="Buscas hoje" value={usage.geoapify.today} limit={LIMITS.geoapifyPerDay} unit="créditos" />
            <p className="text-xs text-muted-foreground">
              Geocodificação de endereços. {nf.format(usage.geoapify.month)} buscas no mês. A cota zera todo dia.
            </p>
            <Last30Days usage={usage.geoapify} />
          </ServiceCard>

          <ServiceCard
            name="MapTiler"
            plan="Free"
            href="https://cloud.maptiler.com/account/analytics"
            hrefLabel="Análises"
          >
            <Metric
              label="Sessões de mapa no mês"
              value={usage.maptiler.month}
              limit={LIMITS.maptilerSessionsPerMonth}
              unit="sessões"
            />
            <p className="text-xs text-muted-foreground">
              Cada vez que o mapa abre conta 1 sessão ({nf.format(usage.maptiler.today)} hoje). No plano Free, o mapa
              fica suspenso até o mês seguinte se passar da cota.
            </p>
            <Last30Days usage={usage.maptiler} />
          </ServiceCard>

          <ServiceCard name="Neon" plan="Free" href="https://console.neon.tech/" hrefLabel="Console">
            <Metric
              label="Armazenamento do banco"
              value={Math.round(dbBytes / 1024 ** 2)}
              limit={LIMITS.neonStorageBytes / 1024 ** 2}
              unit="MB"
            />
            <p className="text-xs text-muted-foreground">
              {formatBytes(dbBytes)} usados de 1 GB. O consumo de compute (limite de {LIMITS.neonComputeHoursPerMonth}{" "}
              CU-horas/mês) só aparece no console do Neon.
            </p>
          </ServiceCard>
        </div>
      </div>
    </div>
  );
}
