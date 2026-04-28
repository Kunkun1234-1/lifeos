-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "name" TEXT NOT NULL DEFAULT 'Player One',
    "class" TEXT NOT NULL DEFAULT 'Scholar',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    "visionStatement" TEXT,
    "coreValues" TEXT NOT NULL DEFAULT '[]',
    "identityStatements" TEXT NOT NULL DEFAULT '[]',
    "equippedTitleKey" TEXT,
    "preferences" TEXT NOT NULL DEFAULT '{}',
    "onboardedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "pullsSinceRare" INTEGER NOT NULL DEFAULT 0,
    "pullsSinceEpic" INTEGER NOT NULL DEFAULT 0,
    "totalPulls" INTEGER NOT NULL DEFAULT 0,
    "resin" INTEGER NOT NULL DEFAULT 200,
    "resinUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("class", "coreValues", "createdAt", "email", "equippedTitleKey", "id", "identityStatements", "name", "onboardedAt", "preferences", "pullsSinceEpic", "pullsSinceRare", "timezone", "totalPulls", "updatedAt", "visionStatement") SELECT "class", "coreValues", "createdAt", "email", "equippedTitleKey", "id", "identityStatements", "name", "onboardedAt", "preferences", "pullsSinceEpic", "pullsSinceRare", "timezone", "totalPulls", "updatedAt", "visionStatement" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
