-- Preferências da rota do dia automática (cron diário e botão "Gerar agora").
CREATE TABLE "auto_route_settings" (
    "user_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "use_runrunit" BOOLEAN NOT NULL DEFAULT true,
    "use_calendar" BOOLEAN NOT NULL DEFAULT true,
    "optimize_order" BOOLEAN NOT NULL DEFAULT true,
    "origin_address" TEXT,
    "origin_lat" DOUBLE PRECISION,
    "origin_lng" DOUBLE PRECISION,
    "last_run_at" TIMESTAMP(3),
    "last_run_ok" BOOLEAN,
    "last_run_summary" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_route_settings_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "auto_route_settings" ADD CONSTRAINT "auto_route_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
