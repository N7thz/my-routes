import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ThemeSetting } from "@/components/settings/theme-setting";
import { AutoRouteSettings } from "@/components/settings/auto-route-settings";
import { ApiTokens } from "@/components/settings/api-tokens";
import { ClearCacheButton, ConnectButton, SignOutButton } from "@/components/settings/settings-actions";
import { LinkEmailButton, UnlinkAccountButton, type LinkedAccount } from "@/components/settings/linked-emails";
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
  ChevronDownIcon,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Configurações",
  description: "Conta, aparência, rota automática e integrações do My Routes.",
};

function memberSince(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(date));
}

const FEATURES = [
  { done: true, icon: BuildingIcon, title: "Gestão de empresas", desc: "CRUD completo com status, observações e CNPJ" },
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
    done: true,
    icon: DatabaseIcon,
    title: "Sincronização offline",
    desc: "PWA instalável com cache local e dados persistidos para uso offline",
  },
  {
    done: true,
    icon: CalendarIcon,
    title: "Integração Google Calendar",
    desc: "Rotas sincronizadas com eventos do Google Agenda",
  },
  {
    done: true,
    icon: BrainCircuitIcon,
    title: "Rota automática do dia",
    desc: "Cron diário cria as rotas a partir das empresas agendadas e da agenda",
  },
  {
    done: false,
    icon: UsersIcon,
    title: "Multiusuário e equipes",
    desc: "Compartilhamento de rotas entre membros da equipe",
  },
];

type ConnStatus = "connected" | "configured" | "missing";

function ConnectionBadge({ status }: { status: ConnStatus }) {
  if (status === "missing")
    return (
      <Badge className="gap-1 border-transparent bg-muted text-xs text-muted-foreground">
        <XCircleIcon className="size-3" /> Desconectado
      </Badge>
    );
  return (
    <Badge className="gap-1 border-transparent bg-emerald-100 text-xs text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
      <CheckCircle2Icon className="size-3" /> {status === "connected" ? "Conectado" : "Configurado"}
    </Badge>
  );
}

/** Mensagens dos códigos de erro que o better-auth devolve em `?error=` no retorno do OAuth. */
const LINK_ERRORS: Record<string, string> = {
  account_already_linked_to_different_user:
    "Esse e-mail já tem uma conta própria no app. Ele só pode ser vinculado se ainda não tiver entrado sozinho.",
  unable_to_link_account: "Não foi possível vincular a conta. Tente de novo.",
  access_denied: "O vínculo foi cancelado na tela do Google.",
};

function linkErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  return LINK_ERRORS[code] ?? `Não foi possível vincular a conta (${code}).`;
}

/** E-mail da conta OAuth, lido do id_token (o Google manda; o Notion não). */
function emailFromIdToken(idToken: string | null): string | null {
  const payload = idToken?.split(".")[1];
  if (!payload) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: unknown };
    return typeof data.email === "string" ? data.email : null;
  } catch {
    return null;
  }
}

/** Bloco de configurações: título e descrição à esquerda, conteúdo à direita (empilha no mobile). */
function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 md:grid-cols-[14rem_1fr] md:gap-8">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Card className="relative isolate overflow-hidden">
        <CardBackground />
        <div className="divide-y">{children}</div>
      </Card>
    </section>
  );
}

/** Linha de configuração: rótulo + descrição e uma ação à direita. */
function Row({
  title,
  description,
  leading,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  leading?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:flex-nowrap">
      {leading}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

export default async function PerfilPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error: linkError } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [accounts, companyCount, routeCount, visitedToday] = await Promise.all([
    prisma.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, providerId: true, accountId: true, idToken: true },
    }),
    prisma.company.count(),
    prisma.route.count({ where: { userId: user.id } }),
    prisma.stop.count({
      where: { route: { userId: user.id }, visitedAt: { gte: startOfToday } },
    }),
  ]);

  const providers = new Set(accounts.map((a) => a.providerId));

  // Cada login (e-mail do Google ou conta do Notion) vinculado ao mesmo usuário.
  // O principal é o mais antigo com o e-mail do usuário, ou o primeiro de todos.
  const linkedAccounts: LinkedAccount[] = accounts.map((a) => ({
    id: a.id,
    providerId: a.providerId,
    accountId: a.accountId,
    email: emailFromIdToken(a.idToken),
    primary: false,
  }));
  const primary = linkedAccounts.find((a) => a.email?.toLowerCase() === user.email.toLowerCase()) ?? linkedAccounts[0];
  if (primary) primary.primary = true;
  const linkErrorText = linkErrorMessage(linkError);

  const oauthConnections = [
    {
      provider: "google" as const,
      label: "Google",
      desc: "Login e Google Agenda. Reconecte se a sincronização de eventos falhar.",
      logo: "/integrations/google.png",
    },
    {
      provider: "notion" as const,
      label: "Notion",
      desc: "Importação e sincronização de empresas a partir do banco do Notion.",
      logo: "/integrations/notion.png",
    },
  ];

  const envConnections: { label: string; desc: string; logo: string; status: ConnStatus; envHint: string }[] = [
    {
      label: "Geoapify",
      desc: "Geocodificação dos endereços (plano grátis). Sem a chave, o app usa o Nominatim, mais lento e menos preciso em número de rua.",
      logo: "/integrations/geoapify.svg",
      status: process.env.GEOAPIFY_API_KEY?.trim() ? "configured" : "missing",
      envHint: "GEOAPIFY_API_KEY",
    },
  ];

  const doneCount = FEATURES.filter((f) => f.done).length;
  const createdAt = (user as { createdAt?: string | Date }).createdAt ?? new Date();

  const stats = [
    { icon: BuildingIcon, value: companyCount, label: "Empresas" },
    { icon: RouteIcon, value: routeCount, label: "Rotas" },
    { icon: MapPinIcon, value: visitedToday, label: "Visitas hoje" },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-10 px-4 py-6 pb-28 sm:px-6 md:pb-10">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sua conta, aparência e as integrações do app.</p>
        </header>

        {/* Conta */}
        <Card className="relative isolate overflow-hidden">
          <CardBackground />
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
            <Avatar className="size-16 shrink-0 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
              <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
              <AvatarFallback className="text-lg">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold leading-tight">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">Membro desde {memberSince(createdAt)}</p>
            </div>
          </div>
          <dl className="grid grid-cols-3 divide-x border-t bg-card/60 backdrop-blur-sm">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center gap-0.5 px-2 py-4">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="size-3.5" />
                  {label}
                </dt>
                <dd className="text-2xl font-bold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Section title="Aparência" description="Como o app aparece neste dispositivo.">
          <Row title="Tema" description="Escolha entre o tema claro e o escuro.">
            <ThemeSetting />
          </Row>
        </Section>

        <Section
          title="Rota automática"
          description="Monta as rotas do dia sozinha, a partir das empresas agendadas e da agenda, na melhor ordem."
        >
          <AutoRouteSettings />
        </Section>

        <Section
          title="E-mails vinculados"
          description="Entre com qualquer um destes logins e caia na mesma conta, com as mesmas empresas e rotas."
        >
          {linkedAccounts.map((a) => (
            <Row
              key={a.id}
              leading={
                <Logo
                  src={a.providerId === "notion" ? "/integrations/notion.png" : "/integrations/google.png"}
                  alt={a.providerId === "notion" ? "Notion" : "Google"}
                />
              }
              title={
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">
                    {a.email ?? (a.providerId === "notion" ? "Conta do Notion" : "Conta do Google")}
                  </span>
                  {a.primary && (
                    <Badge className="border-transparent bg-primary/10 text-xs text-primary">Principal</Badge>
                  )}
                </span>
              }
              description={a.providerId === "notion" ? "Login pelo Notion" : "Login pelo Google"}
            >
              <UnlinkAccountButton account={a} disabled={a.primary || linkedAccounts.length <= 1} />
            </Row>
          ))}
          <Row
            title="Vincular outro e-mail"
            description={
              linkErrorText ? (
                <span className="text-destructive">{linkErrorText}</span>
              ) : (
                "Escolha outra conta do Google. Ela passa a entrar nesta conta."
              )
            }
          >
            <LinkEmailButton />
          </Row>
        </Section>

        <Section
          title="Servidor MCP"
          description="Tokens pessoais para o Claude Code e outros clientes MCP acessarem suas empresas e rotas."
        >
          <ApiTokens />
        </Section>

        <Section title="Integrações" description="Contas e serviços externos de onde o app lê e grava dados.">
          {oauthConnections.map((c) => {
            const connected = providers.has(c.provider);
            return (
              <Row
                key={c.label}
                leading={<Logo src={c.logo} alt={c.label} />}
                title={
                  <span className="flex items-center gap-2">
                    {c.label} <ConnectionBadge status={connected ? "connected" : "missing"} />
                  </span>
                }
                description={c.desc}
              >
                <ConnectButton provider={c.provider} connected={connected} />
              </Row>
            );
          })}
          {envConnections.map((c) => (
            <Row
              key={c.label}
              leading={<Logo src={c.logo} alt={c.label} />}
              title={
                <span className="flex items-center gap-2">
                  {c.label} <ConnectionBadge status={c.status} />
                </span>
              }
              description={
                c.status === "missing" ? (
                  <>
                    {c.desc} Defina <code className="font-mono text-[11px]">{c.envHint}</code> no ambiente.
                  </>
                ) : (
                  c.desc
                )
              }
            />
          ))}
        </Section>

        <Section title="Dados" description="Cache local usado para o app funcionar offline.">
          <Row
            title="Cache offline"
            description="Apaga os dados guardados neste dispositivo. Eles são baixados de novo na próxima vez que você abrir uma tela."
          >
            <ClearCacheButton />
          </Row>
        </Section>

        <Section title="Sessão" description="Encerrar o acesso neste dispositivo.">
          <Row title="Sair" description={`Conectado como ${user.email}`}>
            <SignOutButton />
          </Row>
        </Section>

        {/* Sobre: o roadmap fica recolhido para não competir com as configurações */}
        <details className="group relative isolate overflow-hidden rounded-lg border">
          <CardBackground />
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Sobre o My Routes</p>
              <p className="text-xs text-muted-foreground">
                {doneCount} de {FEATURES.length} funcionalidades prontas
              </p>
            </div>
            <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-muted sm:block">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(doneCount / FEATURES.length) * 100}%` }}
              />
            </div>
            <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <ul className="grid gap-3 border-t p-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-2.5">
                {f.done ? (
                  <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
                ) : (
                  <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
                )}
                <div className="min-w-0">
                  <p className={`text-sm leading-tight ${f.done ? "" : "text-muted-foreground"}`}>{f.title}</p>
                  <p className="mt-0.5 text-xs leading-tight text-muted-foreground">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}

/** Fundo decorativo dos cards: brilhos radiais na cor primária + grade sutil que some para baixo. */
function CardBackground() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_70%_at_0%_0%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_70%),radial-gradient(ellipse_60%_60%_at_100%_0%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--foreground)_6%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--foreground)_6%,transparent)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]"
      />
    </>
  );
}

function Logo({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-white">
      {/* biome-ignore lint/performance/noImgElement: ícone estático de 20px em public/, next/image não traz ganho aqui */}
      <img src={src} alt={alt} className="size-5 rounded-[3px] object-contain" />
    </div>
  );
}
