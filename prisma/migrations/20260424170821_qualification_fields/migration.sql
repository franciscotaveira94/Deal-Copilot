-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "industry" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'discovery',
    "stageChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arr" INTEGER,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'active',
    "summary" TEXT,
    "nextAction" TEXT,
    "nextActionDue" DATETIME,
    "lastTouch" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "meddicMetrics" TEXT,
    "meddicEconomicBuyer" TEXT,
    "meddicDecisionCriteria" TEXT,
    "meddicDecisionProcess" TEXT,
    "meddicPainIdentified" TEXT,
    "meddicChampion" TEXT,
    "briefContent" TEXT,
    "briefGeneratedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Account" ("arr", "createdAt", "domain", "id", "industry", "lastTouch", "name", "nextAction", "nextActionDue", "notes", "priority", "stage", "status", "summary", "updatedAt") SELECT "arr", "createdAt", "domain", "id", "industry", "lastTouch", "name", "nextAction", "nextActionDue", "notes", "priority", "stage", "status", "summary", "updatedAt" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE INDEX "Account_stage_idx" ON "Account"("stage");
CREATE INDEX "Account_priority_idx" ON "Account"("priority");
CREATE INDEX "Account_lastTouch_idx" ON "Account"("lastTouch");
CREATE TABLE "new_Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "persona" TEXT NOT NULL DEFAULT 'unknown',
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Contact" ("accountId", "createdAt", "email", "id", "name", "notes", "phone", "role", "updatedAt") SELECT "accountId", "createdAt", "email", "id", "name", "notes", "phone", "role", "updatedAt" FROM "Contact";
DROP TABLE "Contact";
ALTER TABLE "new_Contact" RENAME TO "Contact";
CREATE INDEX "Contact_accountId_idx" ON "Contact"("accountId");
CREATE INDEX "Contact_persona_idx" ON "Contact"("persona");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
