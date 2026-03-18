-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "ProductionMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "baseCO2" REAL NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "commercialStatus" TEXT,
    "trl" TEXT,
    "capex" TEXT,
    "energyDemand" TEXT,
    "deploymentTimeframe" TEXT,
    "description" TEXT,
    "baselineAssumptions" TEXT,
    "references" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ProductionMethod_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lever" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "LeverOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "factor" REAL NOT NULL,
    "assumptionNote" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "LeverOption_leverId_fkey" FOREIGN KEY ("leverId") REFERENCES "Lever" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MethodLeverApplicability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "methodId" TEXT NOT NULL,
    "leverId" TEXT NOT NULL,
    CONSTRAINT "MethodLeverApplicability_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "ProductionMethod" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MethodLeverApplicability_leverId_fkey" FOREIGN KEY ("leverId") REFERENCES "Lever" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BenchmarkPathway" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    CONSTRAINT "BenchmarkPathway_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PathwayAnnualRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pathwayId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "rate" REAL NOT NULL,
    CONSTRAINT "PathwayAnnualRate_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "BenchmarkPathway" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Sector_name_key" ON "Sector"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Lever_name_key" ON "Lever"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LeverOption_leverId_name_key" ON "LeverOption"("leverId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MethodLeverApplicability_methodId_leverId_key" ON "MethodLeverApplicability"("methodId", "leverId");

-- CreateIndex
CREATE UNIQUE INDEX "PathwayAnnualRate_pathwayId_year_key" ON "PathwayAnnualRate"("pathwayId", "year");
