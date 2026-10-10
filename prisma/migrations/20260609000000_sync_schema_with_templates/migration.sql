-- CreateTable
CREATE TABLE "EventTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "blockTypes" TEXT NOT NULL DEFAULT '[]',
    "foodNorms" TEXT NOT NULL DEFAULT '[]',
    "equipmentItems" TEXT NOT NULL DEFAULT '[]',
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Block" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dayIndex" INTEGER,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Block_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Block" ("config", "dayIndex", "eventId", "id", "sortOrder", "title", "type") SELECT "config", "dayIndex", "eventId", "id", "sortOrder", "title", "type" FROM "Block";
DROP TABLE "Block";
ALTER TABLE "new_Block" RENAME TO "Block";
CREATE INDEX "Block_eventId_idx" ON "Block"("eventId");
CREATE TABLE "new_BlockItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlockItem_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BlockItem" ("blockId", "data", "id", "name") SELECT "blockId", "data", "id", "name" FROM "BlockItem";
DROP TABLE "BlockItem";
ALTER TABLE "new_BlockItem" RENAME TO "BlockItem";
CREATE INDEX "BlockItem_blockId_idx" ON "BlockItem"("blockId");
CREATE TABLE "new_Claim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "claimType" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Claim_blockItemId_fkey" FOREIGN KEY ("blockItemId") REFERENCES "BlockItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Claim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Claim" ("blockItemId", "claimType", "data", "id", "userId") SELECT "blockItemId", "claimType", "data", "id", "userId" FROM "Claim";
DROP TABLE "Claim";
ALTER TABLE "new_Claim" RENAME TO "Claim";
CREATE INDEX "Claim_userId_idx" ON "Claim"("userId");
CREATE UNIQUE INDEX "Claim_blockItemId_userId_claimType_key" ON "Claim"("blockItemId", "userId", "claimType");
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "numDays" INTEGER NOT NULL DEFAULT 1,
    "eventTypeId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("createdAt", "createdBy", "description", "endDate", "id", "numDays", "startDate", "title", "updatedAt") SELECT "createdAt", "createdBy", "description", "endDate", "id", "numDays", "startDate", "title", "updatedAt" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE INDEX "Event_eventTypeId_idx" ON "Event"("eventTypeId");
CREATE TABLE "new_Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attending" TEXT NOT NULL DEFAULT 'unknown',
    "arrivalDay" INTEGER,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Participant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Participant" ("arrivalDay", "attending", "eventId", "id", "userId") SELECT "arrivalDay", "attending", "eventId", "id", "userId" FROM "Participant";
DROP TABLE "Participant";
ALTER TABLE "new_Participant" RENAME TO "Participant";
CREATE INDEX "Participant_eventId_idx" ON "Participant"("eventId");
CREATE UNIQUE INDEX "Participant_eventId_userId_key" ON "Participant"("eventId", "userId");
CREATE TABLE "new_SurveyResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participantId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "response" TEXT NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SurveyResponse_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SurveyResponse_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SurveyResponse" ("blockId", "id", "participantId", "response") SELECT "blockId", "id", "participantId", "response" FROM "SurveyResponse";
DROP TABLE "SurveyResponse";
ALTER TABLE "new_SurveyResponse" RENAME TO "SurveyResponse";
CREATE UNIQUE INDEX "SurveyResponse_participantId_blockId_key" ON "SurveyResponse"("participantId", "blockId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
