-- AlterTable
ALTER TABLE "TripOption" ADD COLUMN "overseasInfo" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdById" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "nights" INTEGER NOT NULL,
    "origin" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "wantsDessert" BOOLEAN NOT NULL DEFAULT false,
    "mode" TEXT NOT NULL DEFAULT 'recommend',
    "isOverseas" BOOLEAN NOT NULL DEFAULT false,
    "destination" TEXT,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trip_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Trip" ("createdAt", "createdById", "endDate", "id", "nights", "origin", "startDate", "status", "style", "wantsDessert") SELECT "createdAt", "createdById", "endDate", "id", "nights", "origin", "startDate", "status", "style", "wantsDessert" FROM "Trip";
DROP TABLE "Trip";
ALTER TABLE "new_Trip" RENAME TO "Trip";
CREATE INDEX "Trip_createdAt_idx" ON "Trip"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
