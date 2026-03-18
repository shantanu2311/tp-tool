/**
 * Implied Temperature Rise (ITR) Assessment Engine
 *
 * Calculates the implied warming alignment of a company's emission trajectory
 * using the TCRE method (GFANZ / IPCC AR6).
 *
 * Formula:
 *   companyBudget = (companyProd / globalProd) × sectorShare × globalBudget
 *   overshoot = cumulativeEmissions - companyBudget
 *   ITR = 1.5°C + (overshoot_Gt × TCRE)
 */

import type { PeriodResult, ITRResult } from './types';
import {
  GLOBAL_REMAINING_CARBON_BUDGET_GT,
  STEEL_SECTOR_EMISSIONS_SHARE,
  GLOBAL_STEEL_PRODUCTION_GT,
  TCRE_FACTOR,
} from './constants';

// ── Helpers ──

/** Interpolate company intensity at any year using period milestones */
function interpolateAtYear(periods: PeriodResult[], year: number, field: 'companyIntensity' | 'totalProduction'): number {
  const sorted = [...periods].sort((a, b) => a.year - b.year);
  if (sorted.length === 0) return 0;
  if (year <= sorted[0].year) return sorted[0][field];
  if (year >= sorted[sorted.length - 1].year) return sorted[sorted.length - 1][field];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (year >= sorted[i].year && year <= sorted[i + 1].year) {
      const t = (year - sorted[i].year) / (sorted[i + 1].year - sorted[i].year);
      return sorted[i][field] + t * (sorted[i + 1][field] - sorted[i][field]);
    }
  }
  return sorted[sorted.length - 1][field];
}

// ── Temperature Classification ──

interface TempClassification {
  label: string;
  color: string;
}

export function classifyTemperature(temp: number): TempClassification {
  if (temp <= 1.5) return { label: 'Well Below 2°C', color: '#059669' };      // emerald-600
  if (temp <= 1.75) return { label: 'Below 2°C', color: '#10b981' };           // emerald-500
  if (temp <= 2.0) return { label: '2°C Aligned', color: '#84cc16' };          // lime-500
  if (temp <= 2.5) return { label: 'Above 2°C', color: '#f59e0b' };            // amber-500
  if (temp <= 3.0) return { label: 'Well Above 2°C', color: '#f97316' };       // orange-500
  return { label: 'Strongly Misaligned', color: '#ef4444' };                    // red-500
}

// ── Core ITR Calculation ──

/**
 * Calculate the Implied Temperature Rise for a company based on its emission trajectory.
 */
export function calcITR(periods: PeriodResult[]): ITRResult {
  if (periods.length === 0) {
    const cls = classifyTemperature(999);
    return {
      impliedTemperature: 0,
      classification: 'No Data',
      classificationColor: '#9ca3af',
      companyBudgetMt: 0,
      cumulativeEmissionsMt: 0,
      overshootMt: 0,
      yearlyBreakdown: [],
      sensitivity: [],
    };
  }

  const sorted = [...periods].sort((a, b) => a.year - b.year);
  const baseYear = sorted[0].year;
  const endYear = Math.max(sorted[sorted.length - 1].year, 2050);

  // Company's fair-share carbon budget
  const companyProductionMt = sorted[0].totalProduction; // MTPA
  const globalProductionMt = GLOBAL_STEEL_PRODUCTION_GT * 1000; // Gt → Mt
  const companyShare = companyProductionMt / globalProductionMt;
  const companyBudgetMt = GLOBAL_REMAINING_CARBON_BUDGET_GT * 1000 * STEEL_SECTOR_EMISSIONS_SHARE * companyShare;

  // Calculate yearly emissions and cumulative
  const yearlyBreakdown: ITRResult['yearlyBreakdown'] = [];
  let cumulative = 0;

  for (let y = baseYear; y <= endYear; y++) {
    const intensity = interpolateAtYear(periods, y, 'companyIntensity');
    const production = interpolateAtYear(periods, y, 'totalProduction');
    const emissions = intensity * production; // MtCO2 (intensity is tCO2/t, production is Mt)
    cumulative += emissions;

    yearlyBreakdown.push({
      year: y,
      emissions: Math.round(emissions * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
    });
  }

  // Overshoot and implied temperature
  const overshootMt = cumulative - companyBudgetMt;
  const overshootGt = overshootMt / 1000; // Convert Mt → Gt for TCRE
  const impliedTemperature = Math.round((1.5 + overshootGt * TCRE_FACTOR) * 100) / 100;

  const cls = classifyTemperature(impliedTemperature);

  // Sensitivity analysis: what if annual reduction changes?
  const sensitivity = calcITRSensitivity(periods, companyBudgetMt);

  return {
    impliedTemperature,
    classification: cls.label,
    classificationColor: cls.color,
    companyBudgetMt: Math.round(companyBudgetMt * 100) / 100,
    cumulativeEmissionsMt: Math.round(cumulative * 100) / 100,
    overshootMt: Math.round(overshootMt * 100) / 100,
    yearlyBreakdown,
    sensitivity,
  };
}

// ── Sensitivity Analysis ──

/**
 * What-if: how does the ITR change if the company increases its annual reduction rate?
 * Tests additional reduction rates from 0% to 10% in 0.5% steps.
 */
function calcITRSensitivity(
  periods: PeriodResult[],
  companyBudgetMt: number
): ITRResult['sensitivity'] {
  const sorted = [...periods].sort((a, b) => a.year - b.year);
  if (sorted.length < 2) return [];

  const baseYear = sorted[0].year;
  const endYear = Math.max(sorted[sorted.length - 1].year, 2050);
  const baseIntensity = sorted[0].companyIntensity;
  const baseProduction = sorted[0].totalProduction;

  const results: ITRResult['sensitivity'] = [];

  // Test additional annual reduction rates from 0% to 10%
  for (let additionalRate = 0; additionalRate <= 0.10; additionalRate += 0.005) {
    let cumulative = 0;

    for (let y = baseYear; y <= endYear; y++) {
      const yearsFromBase = y - baseYear;
      // Apply the company's actual trajectory + additional linear reduction
      const actualIntensity = interpolateAtYear(periods, y, 'companyIntensity');
      const additionalReduction = baseIntensity * additionalRate * yearsFromBase;
      const adjustedIntensity = Math.max(0, actualIntensity - additionalReduction);
      const production = interpolateAtYear(periods, y, 'totalProduction');
      cumulative += adjustedIntensity * production;
    }

    const overshootGt = (cumulative - companyBudgetMt) / 1000;
    const temp = Math.round((1.5 + overshootGt * TCRE_FACTOR) * 100) / 100;

    results.push({
      rateChange: Math.round(additionalRate * 10000) / 100, // as percentage (0-10%)
      resultingTemp: temp,
    });
  }

  return results;
}
