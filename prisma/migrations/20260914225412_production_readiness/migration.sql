-- CreateTable
CREATE TABLE "IntegrationCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiryDate" DATETIME,
    "scope" TEXT,
    "lastError" TEXT,
    "lastCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AutomationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT,
    "automationName" TEXT NOT NULL,
    "relatedRecordType" TEXT,
    "relatedRecordId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "error" TEXT,
    "metadata" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "testMode" BOOLEAN NOT NULL DEFAULT false,
    "runAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AutomationRun" ("attemptCount", "automationName", "error", "id", "relatedRecordId", "relatedRecordType", "runAt", "status", "testMode", "workspaceId") SELECT "attemptCount", "automationName", "error", "id", "relatedRecordId", "relatedRecordType", "runAt", "status", "testMode", "workspaceId" FROM "AutomationRun";
DROP TABLE "AutomationRun";
ALTER TABLE "new_AutomationRun" RENAME TO "AutomationRun";
CREATE INDEX "AutomationRun_workspaceId_idx" ON "AutomationRun"("workspaceId");
CREATE INDEX "AutomationRun_automationName_idx" ON "AutomationRun"("automationName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationCredential_provider_key" ON "IntegrationCredential"("provider");
