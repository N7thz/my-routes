-- CreateTable
CREATE TABLE "route_point" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "recorded_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_point_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "route_point_route_id_recorded_at_idx" ON "route_point"("route_id", "recorded_at");

-- AddForeignKey
ALTER TABLE "route_point" ADD CONSTRAINT "route_point_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "route"("id") ON DELETE CASCADE ON UPDATE CASCADE;
