/**
 * Scenario Analysis Engine (Phase 2)
 *
 * Pure functions for comparing company trajectory against IEA/NGFS climate scenarios.
 * Separate from main calculate() — called lazily when user views the Scenario tab.
 */

import type {
  PeriodResult,
  ScenarioData,
  ScenarioGapResult,
  ScenarioAnalysisResult,
  AccelerationResult,
  CarbonBudgetResult,
  CarbonCostResult,
} from './types';
import {
  getRemainingBudgetGt,
  STEEL_SECTOR_EMISSIONS_SHARE,
} from './constants';

// ── Helpers ──

/** Linearly interpolate a value at `year` from a sorted array of { year, value } points */
function interpolateAtYear(
  dataPoints: { year: number; intensity?: number; priceUSD?: number }[],
  year: number,
  field: 'intensity' | 'priceUSD' = 'intensity'
): number {
  if (dataPoints.length === 0) return 0;
  const sorted = [...dataPoints].sort((a, b) => a.year - b.year);

  const val = (pt: typeof sorted[0]) => (field === 'intensity' ? pt.intensity ?? 0 : pt.priceUSD ?? 0);

  if (year <= sorted[0].year) return val(sorted[0]);
  if (year >= sorted[sorted.length - 1].year) return val(sorted[sorted.length - 1]);

  for (let i = 0; i < sorted.length - 1; i++) {
    if (year >= sorted[i].year && year <= sorted[i + 1].year) {
      const t = (year - sorted[i].year) / (sorted[i + 1].year - sorted[i].year);
      return val(sorted[i]) + t * (val(sorted[i + 1]) - val(sorted[i]));
    }
  }
  return val(sorted[sorted.length - 1]);
}

/** Interpolate company intensity at any year using period milestones */
function companyIntensityAtYear(periods: PeriodResult[], year: number): number {
  if (periods.length === 0) return 0;
  const sorted = [...periods].sort((a, b) => a.year - b.year);

  if (year <= sorted[0].year) return sorted[0].companyIntensity;
  if (year >= sorted[sorted.length - 1].year) return sorted[sorted.length - 1].companyIntensity;

  for (let i = 0; i < sorted.length - 1; i++) {
    if (year >= sorted[i].year && year <= sorted[i + 1].year) {
      const t = (year - sorted[i].year) / (sorted[i + 1].year - sorted[i].year);
      return sorted[i].companyIntensity + t * (sorted[i + 1].companyIntensity - sorted[i].companyIntensity);
    }
  }
  return sorted[sorted.length - 1].companyIntensity;
}

/** Interpolate company production at any year using period milestones */
function companyProductionAtYear(periods: PeriodResult[], year: number): number {
  if (periods.length === 0) return 0;
  const sorted = [...periods].sort((a, b) => a.year - b.year);

  if (year <= sorted[0].year) return sorted[0].totalProduction;
  if (year >= sorted[sorted.length - 1].year) return sorted[sorted.length - 1].totalProduction;

  for (let i = 0; i < sorted.length - 1; i++) {
    if (year >= sorted[i].year && year <= sorted[i + 1].year) {
      const t = (year - sorted[i].year) / (sorted[i + 1].year - sorted[i].year);
      return sorted[i].totalProduction + t * (sorted[i + 1].totalProduction - sorted[i].totalProduction);
    }
  }
  return sorted[sorted.length - 1].totalProduction;
}

// ── Core Functions ──

/**
 * Calculate alignment gaps between company and each scenario at period milestones.
 */
export function calcScenarioGaps(
  periods: PeriodResult[],
  scenarios: ScenarioData[]
): ScenarioGapResult[] {
  return scenarios.map((sc) => ({
    scenarioId: sc.id,
    scenarioName: sc.name,
    milestones: periods.map((p) => {
      const scenarioIntensity = interpolateAtYear(sc.dataPoints, p.year);
      const gapAbsolute = p.companyIntensity - scenarioIntensity;
      const gapPercent = scenarioIntensity > 0 ? (gapAbsolute / scenarioIntensity) * 100 : 0;

      let alignmentStatus: 'aligned' | 'at_risk' | 'misaligned';
      if (p.companyIntensity <= scenarioIntensity) {
        alignmentStatus = 'aligned';
      } else if (gapPercent <= 20) {
        alignmentStatus = 'at_risk';
      } else {
        alignmentStatus = 'misaligned';
      }

      return {
        year: p.year,
        companyIntensity: p.companyIntensity,
        scenarioIntensity: Math.round(scenarioIntensity * 10000) / 10000,
        gapAbsolute: Math.round(gapAbsolute * 10000) / 10000,
        gapPercent: Math.round(gapPercent * 100) / 100,
        alignmentStatus,
      };
    }),
  }));
}

/**
 * Calculate the acceleration in annual reduction rate needed to close the gap.
 */
export function calcAccelerationRequired(
  periods: PeriodResult[],
  scenarios: ScenarioData[]
): AccelerationResult[] {
  const sorted = [...periods].sort((a, b) => a.year - b.year);

  return scenarios.map((sc) => {
    const periodResults: AccelerationResult['periods'] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i];
      const to = sorted[i + 1];
      const yearsSpan = to.year - from.year;
      if (yearsSpan <= 0) continue;

      const scenarioTarget = interpolateAtYear(sc.dataPoints, to.year);
      const currentRate = from.companyIntensity > 0
        ? (from.companyIntensity - to.companyIntensity) / (from.companyIntensity * yearsSpan)
        : 0;

      // Rate needed to reach scenario target from current position
      const requiredRate = from.companyIntensity > 0
        ? (from.companyIntensity - scenarioTarget) / (from.companyIntensity * yearsSpan)
        : 0;

      periodResults.push({
        fromYear: from.year,
        toYear: to.year,
        requiredAnnualRate: Math.round(requiredRate * 10000) / 10000,
        currentRate: Math.round(currentRate * 10000) / 10000,
        gapToClose: Math.round((requiredRate - currentRate) * 10000) / 10000,
      });
    }

    return {
      scenarioId: sc.id,
      scenarioName: sc.name,
      periods: periodResults,
    };
  });
}

/**
 * Calculate company's fair-share carbon budget and track cumulative emissions.
 * Uses production-weighted emissions interpolated across years.
 */
export function calcCarbonBudget(periods: PeriodResult[]): CarbonBudgetResult {
  if (periods.length === 0) {
    return {
      fairShareBudgetMt: 0,
      cumulativeEmissionsMt: 0,
      remainingBudgetMt: 0,
      exhaustionYear: null,
      yearlyData: [],
    };
  }

  const sorted = [...periods].sort((a, b) => a.year - b.year);
  const baseYear = sorted[0].year;
  const endYear = sorted[sorted.length - 1].year;

  // Fair-share budget: global budget * sector share, scaled to company's share of global production
  // Company production as fraction of global steel (~1900 Mt/yr)
  const companyProductionMt = sorted[0].totalProduction; // MTPA
  const globalProductionMt = 1900; // Mt/yr approximate
  const companyShareOfGlobal = companyProductionMt / globalProductionMt;

  const fairShareBudgetMt =
    getRemainingBudgetGt(baseYear) * 1000 * // Convert Gt to Mt, time-adjusted
    STEEL_SECTOR_EMISSIONS_SHARE *
    companyShareOfGlobal;

  const yearlyData: CarbonBudgetResult['yearlyData'] = [];
  let cumulative = 0;
  let exhaustionYear: number | null = null;

  for (let y = baseYear; y <= endYear; y++) {
    const intensity = companyIntensityAtYear(periods, y);
    const production = companyProductionAtYear(periods, y);
    const annualEmissions = intensity * production; // MtCO2

    cumulative += annualEmissions;

    yearlyData.push({
      year: y,
      annualEmissions: Math.round(annualEmissions * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
      budget: Math.round(fairShareBudgetMt * 100) / 100,
    });

    if (exhaustionYear === null && cumulative >= fairShareBudgetMt) {
      exhaustionYear = y;
    }
  }

  return {
    fairShareBudgetMt: Math.round(fairShareBudgetMt * 100) / 100,
    cumulativeEmissionsMt: Math.round(cumulative * 100) / 100,
    remainingBudgetMt: Math.round((fairShareBudgetMt - cumulative) * 100) / 100,
    exhaustionYear,
    yearlyData,
  };
}

/**
 * Calculate carbon cost impact under each scenario's carbon price trajectory.
 */
export function calcCarbonCostImpact(
  periods: PeriodResult[],
  scenarios: ScenarioData[]
): CarbonCostResult[] {
  if (periods.length === 0) return [];

  const sorted = [...periods].sort((a, b) => a.year - b.year);
  const baseYear = sorted[0].year;
  const endYear = sorted[sorted.length - 1].year;

  return scenarios.map((sc) => {
    const annualCosts: CarbonCostResult['annualCosts'] = [];
    let cumCost = 0;

    for (let y = baseYear; y <= endYear; y++) {
      const intensity = companyIntensityAtYear(periods, y);
      const production = companyProductionAtYear(periods, y);
      const emissions = intensity * production; // MtCO2
      const price = interpolateAtYear(sc.carbonPrices, y, 'priceUSD');
      const cost = emissions * price; // USD millions (since emissions in Mt and price in USD/t)

      cumCost += cost;
      annualCosts.push({
        year: y,
        emissions: Math.round(emissions * 100) / 100,
        pricePerTonne: Math.round(price * 100) / 100,
        totalCost: Math.round(cost * 100) / 100,
      });
    }

    return {
      scenarioId: sc.id,
      scenarioName: sc.name,
      annualCosts,
      cumulativeCost: Math.round(cumCost * 100) / 100,
    };
  });
}

/**
 * Main orchestrator — runs all scenario analysis calculations.
 */
export function calcScenarioAnalysis(
  periods: PeriodResult[],
  scenarios: ScenarioData[]
): ScenarioAnalysisResult {
  return {
    gaps: calcScenarioGaps(periods, scenarios),
    accelerationRates: calcAccelerationRequired(periods, scenarios),
    carbonBudget: calcCarbonBudget(periods),
    carbonCosts: calcCarbonCostImpact(periods, scenarios),
  };
}
