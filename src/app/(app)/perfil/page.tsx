import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  BuildingIcon,
  RouteIcon,
  MapPinIcon,
  CalendarIcon,
  MapIcon,
  DatabaseIcon,
  BrainCircuitIcon,
  SmartphoneIcon,
  SlidersIcon,
  NotebookIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function memberSince(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(date));
}

// ── Feature definitions ────────────────────────────────────────────────────────

const FEATURES = [
  {
    done: true,
    icon: BuildingIcon,
    title: "Gestão de empresas",
    desc: "CRUD completo com status, observações e CNPJ",
  },
  {
    done: true,
    icon: SlidersIcon,
    title: "Filtros e paginação",
    desc: "Filtro por status, busca e itens por página via URL",
  },
  {
    done: true,
    icon: NotebookIcon,
    title: "Importação do Notion",
    desc: "Sincronização de empresas a partir de banco Notion",
  },
  {
    done: true,
    icon: RouteIcon,
    title: "Planejamento de rotas",
    desc: "Criação de rotas com paradas ordenadas e empresas vinculadas",
  },
  {
    done: true,
    icon: MapIcon,
    title: "Mapa integrado (OpenStreetMap)",
    desc: "Mapa gratuito com rota calculada via OSRM, sem billing",
  },
  {
    done: true,
    icon: SmartphoneIcon,
    title: "Rastreamento GPS em tempo real",
    desc: "watchPosition com marcador pulsante usando avatar do usuário",
  },
  {
    done: true,
    icon: MapPinIcon,
    title: "Controle de paradas visitadas",
    desc: "Toggle por clique com horário de visita registrado",
  },
  {
    done: true,
    icon: ZapIcon,
    title: "Rota do dia em destaque",
    desc: "Página principal exibe automaticamente a rota do dia atual",
  },
  {
    done: false,
    icon: CalendarIcon,
    title: "Integração Google Calendar",
    desc: "Ler eventos da agenda e criar empresas/visitas automaticamente",
  },
  {
    done: false,
    icon: BrainCircuitIcon,
    title: "Rota automática pela agenda",
    desc: "Gerar rota do dia baseada nos eventos do calendário",
  },
  {
    done: false,
    icon: UsersIcon,
    title: "Multiusuário e equipes",
    desc: "Compartilhamento de rotas entre membros da equipe",
  },
  {
    done: true,
    icon: DatabaseIcon,
    title: "Sincronização offline",
    desc: "PWA instalável com cache local e dados persistidos para uso offline",
  },
];

// ── Connection check helper ────────────────────────────────────────────────────

type ConnStatus = "connected" | "configured" | "missing";

function ConnectionBadge({ status }: { status: ConnStatus }) {
  if (status === "connected")
    return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-transparent text-xs">
        <CheckCircle2Icon className="size-3" /> Conectado
      </Badge>
    );
  if (status === "configured")
    return (
      <Badge className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-transparent text-xs">
        <CheckCircle2Icon className="size-3" /> Configurado
      </Badge>
    );
  return (
    <Badge className="gap-1 bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border-transparent text-xs">
      <XCircleIcon className="size-3" /> Não configurado
    </Badge>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PerfilPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const user = session.user;

  const [accounts, companyCount, routeCount, visitedToday] = await Promise.all([
    prisma.account.findMany({ where: { userId: user.id }, select: { providerId: true } }),
    prisma.company.count(),
    prisma.route.count({ where: { userId: user.id } }),
    prisma.stop.count({
      where: {
        route: { userId: user.id },
        visitedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  const providers = new Set(accounts.map((a) => a.providerId));

  const connections: { label: string; desc: string; logo: string; status: ConnStatus }[] = [
    {
      label: "Google",
      desc: "Login OAuth + acesso ao Google Calendar",
      logo: "https://www.google.com/favicon.ico",
      status: providers.has("google") ? "connected" : "missing",
    },
    {
      label: "Notion",
      desc: "Importação de empresas do banco de dados",
      logo: "https://www.notion.so/favicon.ico",
      status: providers.has("notion") ? "connected" : "missing",
    },
    {
      label: "RunRunit",
      desc: "Integração com gestão de tarefas",
      logo: "https://runrunit.com/favicon.ico",
      status:
        process.env.RUNRUNIT_APP_KEY && process.env.RUNRUNIT_USER_TOKEN ? "configured" : "missing",
    },
    {
      label: "Google Maps API",
      desc: "Mapa avançado com Directions API (billing requerido)",
      logo: "https://maps.google.com/favicon.ico",
      status: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "configured" : "missing",
    },
  ];

  const doneCount = FEATURES.filter((f) => f.done).length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        {/* ── User hero ───────────────────────────────────────────────────── */}
        <Card>
          <CardContent className="flex items-center gap-5 pt-6">
            <Avatar className="size-20 shrink-0 ring-2 ring-primary/20 ring-offset-2">
              <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
              <AvatarFallback className="text-xl">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight">{user.name}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Membro desde{" "}
                {memberSince((user as { createdAt?: string | Date }).createdAt ?? new Date())}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: BuildingIcon, value: companyCount, label: "Empresas" },
            { icon: RouteIcon, value: routeCount, label: "Rotas criadas" },
            { icon: MapPinIcon, value: visitedToday, label: "Visitadas hoje" },
          ].map(({ icon: Icon, value, label }) => (
            <Card key={label}>
              <CardContent className="flex flex-col items-center justify-center gap-1 py-5">
                <Icon className="size-5 text-muted-foreground mb-1" />
                <span className="text-3xl font-bold tabular-nums">{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* ── Connections ─────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Conexões</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {connections.map((c) => (
                <div key={c.label} className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.logo} alt={c.label} className="size-4" onError={undefined} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none">{c.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{c.desc}</p>
                  </div>
                  <ConnectionBadge status={c.status} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ── Feature progress ────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Progresso do produto</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {doneCount}/{FEATURES.length} implementadas
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted mt-2">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(doneCount / FEATURES.length) * 100}%` }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-2.5">
                  {f.done ? (
                    <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  ) : (
                    <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
                  )}
                  <div className="min-w-0">
                    <p className={`text-sm leading-none ${!f.done ? "text-muted-foreground" : ""}`}>
                      {f.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{f.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
