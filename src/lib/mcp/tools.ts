import "server-only";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { CompanyStatus } from "../../../prisma/generated/enums";
import { HttpError } from "@/lib/http-errors";
import { requireUserId } from "@/lib/session";
import { dayKey, nextDayKey, todayKey } from "@/lib/dates";
import { listCompanies, updateCompany } from "@/lib/company-service";
import { addStop, listRoutes, markStopVisited, reorderStops, type RouteRecord } from "@/lib/route-service";
import { runAutoRouteForUser } from "@/lib/auto-route-service";
import { getGoogleCalendarTokenForUser } from "@/lib/google-auth";
import { listCalendarEvents } from "@/lib/google-calendar-service";

const APP_TIME_ZONE = "America/Sao_Paulo";
const MAX_COMPANIES = 100;

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD")
  .describe("Dia no formato AAAA-MM-DD. Padrão: hoje (fuso America/Sao_Paulo).");

const ok = (data: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
});

const fail = (message: string): CallToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

/** Erros de negócio (HttpError) viram resposta de erro da tool; o resto é logado e fica genérico. */
function safe<A>(handler: (args: A) => Promise<CallToolResult>) {
  return async (args: A): Promise<CallToolResult> => {
    try {
      return await handler(args);
    } catch (err) {
      if (err instanceof HttpError) return fail(err.message);
      if (err instanceof Error && "code" in err && err.code === "P2025") return fail("Não encontrado");
      console.error("[mcp]", err);
      return fail("Erro interno");
    }
  };
}

function routeView(route: RouteRecord) {
  return {
    id: route.id,
    nome: route.name,
    dia: dayKey(route.date),
    status: route.status,
    paradas: route.stops.map((s) => ({
      id: s.id,
      ordem: s.order,
      nome: s.label ?? s.company?.name ?? null,
      empresaId: s.companyId,
      endereco: s.address,
      visitadaEm: s.visitedAt,
    })),
  };
}

/** Registra as tools do my-routes. Os serviços leem o usuário da requisição (cookie ou bearer). */
export function registerTools(server: McpServer) {
  server.registerTool(
    "listar_empresas",
    {
      description: `Lista empresas cadastradas (até ${MAX_COMPANIES}), com filtro opcional por status e nome.`,
      inputSchema: {
        status: z.enum(CompanyStatus).optional().describe("PENDENTE, EM_ANDAMENTO, CONCLUIDO ou REVISAO"),
        nome: z.string().trim().min(1).optional().describe("Trecho do nome (sem diferenciar maiúsculas)"),
      },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ status, nome }) => {
      await requireUserId();
      const term = nome?.toLowerCase();
      const all = (await listCompanies()).filter(
        (c) => (!status || c.status === status) && (!term || c.name.toLowerCase().includes(term))
      );
      return ok({
        total: all.length,
        empresas: all.slice(0, MAX_COMPANIES).map((c) => ({
          id: c.id,
          nome: c.name,
          cnpj: c.cnpj,
          endereco: c.address,
          data: dayKey(c.date),
          status: c.status,
          observacoes: c.observations,
        })),
      });
    })
  );

  server.registerTool(
    "rota_do_dia",
    {
      description: "Rotas do usuário em um dia, com as paradas em ordem e quais já foram visitadas.",
      inputSchema: { dia: day.optional() },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ dia }) => {
      const target = dia ?? todayKey(APP_TIME_ZONE);
      const routes = (await listRoutes({ from: target, to: target })).filter((r) => dayKey(r.date) === target);
      return ok({ dia: target, rotas: routes.map(routeView) });
    })
  );

  server.registerTool(
    "agenda_do_dia",
    {
      description: "Eventos do Google Agenda do usuário em um dia.",
      inputSchema: { dia: day.optional() },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ dia }) => {
      const userId = await requireUserId();
      const target = dia ?? todayKey(APP_TIME_ZONE);
      const google = await getGoogleCalendarTokenForUser(userId);
      if (!google.hasCalendarScope) return fail(`Google Agenda indisponível (${google.reason}). Conecte em Configurações.`);

      // Brasil sem horário de verão: America/Sao_Paulo é UTC-03 o ano todo.
      const events = await listCalendarEvents(google.accessToken, {
        timeMin: `${target}T00:00:00-03:00`,
        timeMax: `${nextDayKey(target)}T00:00:00-03:00`,
      });
      return ok({
        dia: target,
        eventos: events
          .filter((e) => e.status !== "cancelled")
          .map((e) => ({
            id: e.id,
            titulo: e.summary ?? "(sem título)",
            inicio: e.start.dateTime ?? e.start.date,
            fim: e.end.dateTime ?? e.end.date,
            local: e.location ?? null,
          })),
      });
    })
  );

  server.registerTool(
    "gerar_rota_do_dia",
    {
      description:
        'Igual ao botão "Gerar agora": junta empresas agendadas e Google Agenda nas rotas dos próximos dias e reordena as paradas pelo melhor trajeto.',
      inputSchema: {},
    },
    safe(async () => ok(await runAutoRouteForUser(await requireUserId())))
  );

  server.registerTool(
    "adicionar_parada",
    {
      description: "Adiciona uma parada ao fim de uma rota do usuário. Informe a empresa ou um endereço.",
      inputSchema: {
        rotaId: z.string().min(1),
        empresaId: z.string().min(1).optional().describe("Parada de uma empresa cadastrada"),
        endereco: z.string().trim().min(1).optional().describe("Obrigatório sem empresaId"),
        rotulo: z.string().trim().min(1).optional().describe("Nome da parada quando não é de empresa"),
      },
    },
    safe(async ({ rotaId, empresaId, endereco, rotulo }) => {
      await requireUserId();
      let address = endereco;
      if (empresaId) {
        const company = (await listCompanies()).find((c) => c.id === empresaId);
        if (!company) return fail("Empresa não encontrada");
        address ??= company.address ?? undefined;
      }
      if (!address) return fail("Informe o endereço (a empresa não tem endereço cadastrado)");
      const stop = await addStop(rotaId, { companyId: empresaId ?? null, label: rotulo ?? null, address });
      return ok({ id: stop.id, ordem: stop.order, endereco: stop.address });
    })
  );

  server.registerTool(
    "marcar_parada_visitada",
    {
      description: "Marca (ou desmarca) uma parada como visitada; atualiza o status da rota.",
      inputSchema: {
        rotaId: z.string().min(1),
        paradaId: z.string().min(1),
        visitada: z.boolean().default(true),
      },
    },
    safe(async ({ rotaId, paradaId, visitada }) => {
      await requireUserId();
      const stop = await markStopVisited(rotaId, paradaId, visitada);
      return ok({ id: stop.id, visitadaEm: stop.visitedAt });
    })
  );

  server.registerTool(
    "reordenar_rota",
    {
      description: "Define a nova ordem das paradas de uma rota: passe os ids das paradas na ordem desejada.",
      inputSchema: {
        rotaId: z.string().min(1),
        paradaIds: z.array(z.string().min(1)).min(1).describe("Ids das paradas, na nova ordem"),
      },
    },
    safe(async ({ rotaId, paradaIds }) => {
      await requireUserId();
      await reorderStops(rotaId, paradaIds);
      return ok({ ok: true, paradas: paradaIds.length });
    })
  );

  server.registerTool(
    "atualizar_status_empresa",
    {
      description: "Altera o status de uma empresa.",
      inputSchema: {
        empresaId: z.string().min(1),
        status: z.enum(CompanyStatus),
      },
    },
    safe(async ({ empresaId, status }) => {
      await requireUserId();
      const company = await updateCompany(empresaId, { status });
      return ok({ id: company.id, nome: company.name, status: company.status });
    })
  );
}
