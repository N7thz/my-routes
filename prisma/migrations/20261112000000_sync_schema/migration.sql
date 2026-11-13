-- Baseline: o banco de produção foi evoluído com `prisma db push` e a migration
-- init não tinha route, stop, route_status, company.address/lat/lng, grupos nem
-- calendar_event_id. Esta migration leva um banco novo ao schema atual.
-- No banco que já existe, NÃO rode: marque como aplicada com
--   bunx prisma migrate resolve --applied 20261112000000_sync_schema

-- CreateEnum
CREATE TYPE "route_status" AS ENUM ('RASCUNHO', 'EM_ANDAMENTO', 'CONCLUIDA');

-- AlterTable
ALTER TABLE "company" ADD COLUMN     "address" TEXT,
ADD COLUMN     "group_id" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "company_group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE,
    "status" "route_status" NOT NULL DEFAULT 'RASCUNHO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stop" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "company_id" TEXT,
    "calendar_event_id" TEXT,
    "label" TEXT,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visited_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_group_name_key" ON "company_group"("name");

-- CreateIndex
CREATE UNIQUE INDEX "stop_route_id_calendar_event_id_key" ON "stop"("route_id", "calendar_event_id");

-- CreateIndex
CREATE INDEX "company_group_id_idx" ON "company"("group_id");

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "company_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route" ADD CONSTRAINT "route_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stop" ADD CONSTRAINT "stop_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stop" ADD CONSTRAINT "stop_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

