-- CreateTable
CREATE TABLE "api_token" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_token_token_hash_key" ON "api_token"("token_hash");

-- CreateIndex
CREATE INDEX "api_token_user_id_idx" ON "api_token"("user_id");

-- AddForeignKey
ALTER TABLE "api_token" ADD CONSTRAINT "api_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
