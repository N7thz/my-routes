import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRoute, parseBody } from "@/lib/api-handler";
import { requireUserId } from "@/lib/session";
import { getAutoRouteSettings, updateAutoRouteSettings } from "@/lib/auto-route-service";

const autoRouteSettingsSchema = z
  .object({
    enabled: z.boolean(),
    useRunrunit: z.boolean(),
    useCalendar: z.boolean(),
    optimizeOrder: z.boolean(),
    originAddress: z.string().trim().max(300).nullable(),
  })
  .partial();

export const GET = apiRoute(async () => {
  return NextResponse.json(await getAutoRouteSettings(await requireUserId()));
});

export const PATCH = apiRoute(async (req) => {
  const input = await parseBody(req, autoRouteSettingsSchema);
  return NextResponse.json(await updateAutoRouteSettings(await requireUserId(), input));
});
