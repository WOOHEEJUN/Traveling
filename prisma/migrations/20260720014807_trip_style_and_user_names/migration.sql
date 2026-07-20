/*
  Warnings:

  - You are about to drop the column `budgetTheme` on the `Trip` table. All the data in the column will be lost.
  - Added the required column `style` to the `Trip` table without a default value. This is not possible if the table is not empty.

*/
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
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trip_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Trip" ("createdAt", "createdById", "endDate", "id", "nights", "origin", "startDate", "status", "wantsDessert") SELECT "createdAt", "createdById", "endDate", "id", "nights", "origin", "startDate", "status", "wantsDessert" FROM "Trip";
DROP TABLE "Trip";
ALTER TABLE "new_Trip" RENAME TO "Trip";
CREATE INDEX "Trip_createdAt_idx" ON "Trip"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
