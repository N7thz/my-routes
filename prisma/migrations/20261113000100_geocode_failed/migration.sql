-- AlterTable
ALTER TABLE "company" ADD COLUMN     "geocode_failed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "stop" ADD COLUMN     "geocode_failed_at" TIMESTAMP(3);

