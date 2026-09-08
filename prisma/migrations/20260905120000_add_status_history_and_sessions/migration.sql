CREATE TABLE "UserCustomStatus" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserCustomStatus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "logoutAt" TIMESTAMP(3),
  "durationSeconds" INTEGER,
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCustomStatus_userId_emoji_text_key" ON "UserCustomStatus"("userId", "emoji", "text");
CREATE INDEX "UserCustomStatus_userId_updatedAt_idx" ON "UserCustomStatus"("userId", "updatedAt");
CREATE INDEX "UserSession_userId_loginAt_idx" ON "UserSession"("userId", "loginAt");

ALTER TABLE "UserCustomStatus" ADD CONSTRAINT "UserCustomStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
