-- CreateTable
CREATE TABLE "ignored_event_title" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ignored_event_title_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ignored_event_title_user_id_title_key" ON "ignored_event_title"("user_id", "title");

-- AddForeignKey
ALTER TABLE "ignored_event_title" ADD CONSTRAINT "ignored_event_title_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
