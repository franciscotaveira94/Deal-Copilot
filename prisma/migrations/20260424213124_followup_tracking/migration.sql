-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN "slaHours" INTEGER;

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "googleChatWebhookUrl" TEXT,
    "slackWebhookUrl" TEXT,
    "slaDistributorHours" INTEGER NOT NULL DEFAULT 4,
    "slaPartnerHours" INTEGER NOT NULL DEFAULT 24,
    "slaCustomerHours" INTEGER NOT NULL DEFAULT 72,
    "slaOtherHours" INTEGER NOT NULL DEFAULT 48,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TimelineEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "source" TEXT,
    "sentiment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "direction" TEXT,
    "awaitingReplyFromId" TEXT,
    "awaitingReplyDueAt" DATETIME,
    "awaitedReplyResolvedAt" DATETIME,
    "overdueNotifiedAt" DATETIME,
    CONSTRAINT "TimelineEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimelineEntry_awaitingReplyFromId_fkey" FOREIGN KEY ("awaitingReplyFromId") REFERENCES "Organisation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TimelineEntry" ("accountId", "content", "createdAt", "id", "kind", "occurredAt", "sentiment", "source", "summary", "title") SELECT "accountId", "content", "createdAt", "id", "kind", "occurredAt", "sentiment", "source", "summary", "title" FROM "TimelineEntry";
DROP TABLE "TimelineEntry";
ALTER TABLE "new_TimelineEntry" RENAME TO "TimelineEntry";
CREATE INDEX "TimelineEntry_accountId_occurredAt_idx" ON "TimelineEntry"("accountId", "occurredAt");
CREATE INDEX "TimelineEntry_kind_idx" ON "TimelineEntry"("kind");
CREATE INDEX "TimelineEntry_awaitingReplyFromId_idx" ON "TimelineEntry"("awaitingReplyFromId");
CREATE INDEX "TimelineEntry_awaitingReplyDueAt_idx" ON "TimelineEntry"("awaitingReplyDueAt");
CREATE INDEX "TimelineEntry_awaitedReplyResolvedAt_idx" ON "TimelineEntry"("awaitedReplyResolvedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
