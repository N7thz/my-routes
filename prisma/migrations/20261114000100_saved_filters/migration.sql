-- CreateTable
CREATE TABLE "saved_filter" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "screen" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_filter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saved_filter_user_id_screen_name_key" ON "saved_filter"("user_id", "screen", "name");

-- AddForeignKey
ALTER TABLE "saved_filter" ADD CONSTRAINT "saved_filter_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

