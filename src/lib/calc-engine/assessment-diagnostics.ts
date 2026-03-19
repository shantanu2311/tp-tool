/**
 * Framework Diagnostic Checks
 *
 * Binary and quantitative checks derived from multiple frameworks:
 * - 7% Self-Decarbonization Rate (MSCI PAB, S&P PAB, FTSE)
 * - Green-to-Brown Revenue Ratio (MSCI PAB, FTSE Green Revenue)
 * - Locked-In Emissions (ACT Module 2, Carbon Tracker)
 * - Sector Percentile (FTSE, MSCI)
 */

import type { PeriodResult, MethodData } from './types';
import { GLOBAL_STEEL_BASELINE_INTENSITY } from './constants';

// ── Self-Decarbonization Rate ──

export interface SelfDecarbResult {
  annualRate: number; // compound annual intensity reduction (%)
  passes7Percent: boolean;
  classification: 'pass' | 'marginal' | 'fail';
  classificationColor: string;
  details: string;
}

export function calcSelfDecarbRate(periods: PeriodResult[]): SelfDecarbResult {
  const sorted = [...periods].sort((a, b) => a.year - b.year);
  if (sorted.length < 2 || sorted[0].companyIntensity <= 0) {
    return { annualRate: 0, passes7Percent: false, classification: 'fail', classificationColor: '#ef4444', details: 'Insufficient data' };
  }

  const base = sorted[0];
  const lt = sorted[sorted.length - 1];
  const years = lt.year - base.year;

  const rate = years > 0
    ? (1 - Math.pow(lt.companyIntensity / base.companyIntensity, 1 / years)) * 100
    : 0;

  const annualRate = Math.round(rate * 100) / 100;
  const passes = annualRate >= 7;
  const marginal = annualRate >= 5;

  return {
    annualRate,
    passes7Percent: passes,
    classification: passes ? 'pass' : marginal ? 'marginal' : 'fail',
    classificationColor: passes ? '#059669' : marginal ? '#f59e0b' : '#ef4444',
    details: passes
      ? `${annualRate}% annual reduction exceeds 7% PAB minimum`
      : `${annualRate}% annual reduction ${marginal ? 'approaches but misses' : 'falls short of'} 7% PAB minimum`,
  };
}

// ── Green-to-Brown Revenue Ratio ──

export interface GreenBrownResult {
  ratio: number;
  greenRevenue: number;
  brownRevenue: number;
  passes4x: boolean;
  classification: 'strong' | 'moderate' | 'weak';
  classificationColor: string;
  details: string;
}

interface GreenBrownFinancials {
  annualRevenue?: number;
  revenueLowCarbonPercent?: number;
}

export function calcGreenBrownRatio(periods: PeriodResult[], financials: GreenBrownFinancials = {}): GreenBrownResult {
  const revPct = financials.revenueLowCarbonPercent ?? 0;
  const totalRev = financials.annualRevenue ?? 0;

  const greenRev = totalRev * (revPct / 100);
  const brownRev = totalRev * (1 - revPct / 100);
  const ratio = brownRev > 0 ? Math.round((greenRev / brownRev) * 100) / 100 : revPct > 0 ? 999 : 0;

  return {
    ratio,
    greenRevenue: Math.round(greenRev),
    brownRevenue: Math.round(brownRev),
    passes4x: ratio >= 4,
    classification: ratio >= 4 ? 'strong' : ratio >= 1 ? 'moderate' : 'weak',
    classificationColor: ratio >= 4 ? '#059669' : ratio >= 1 ? '#f59e0b' : '#ef4444',
    details: ratio >= 4
      ? `Green/Brown ratio ${ratio}:1 exceeds 4x PAB target`
      : `Green/Brown ratio ${ratio}:1 — PAB target is 4x`,
  };
}

// ── Locked-In Emissions ──

export interface LockedInResult {
  lockedInMt: number;
  lockedInIntensity: number;
  bfBofShareLT: number; // % of production still BF-BOF in LT
  yearsRemaining: number;
  classification: 'low' | 'moderate' | 'high' | 'critical';
  classificationColor: string;
  details: string;
}

interface LockedInFinancials {
  bfBofAssetLifetime?: number;
}

export function calcLockedInEmissions(
  periods: PeriodResult[],
  methodDataMap: Record<string, MethodData>,
  financials: LockedInFinancials = {}
): LockedInResult {
  const sorted = [...periods].sort((a, b) => a.year - b.year);
  const assetLife = financials.bfBofAssetLifetime ?? 20;

  if (sorted.length < 2) {
    return {
      lockedInMt: 0, lockedInIntensity: 0, bfBofShareLT: 0, yearsRemaining: 0,
      classification: 'low', classificationColor: '#059669', details: 'Insufficient data',
    };
  }

  // Find BF-BOF share in the LT period
  const lt = sorted[sorted.length - 1];
  const base = sorted[0];
  const bfBofMethods = lt.methods.filter(m => {
    const md = methodDataMap[m.methodId];
    return md && (md.name.includes('Blast Furnace') || md.name.includes('BOF'));
  });
  const bfBofShare = bfBofMethods.reduce((s, m) => s + m.share, 0);

  // Locked-in emissions: BF-BOF production × BF-BOF base intensity × remaining years
  const bfBofIntensity = 2.7; // tCO2/tcs for BF-BOF (approximate)
  const bfBofProduction = lt.totalProduction * bfBofShare;
  const remainingYears = Math.max(0, assetLife - (lt.year - base.year));
  const lockedInMt = bfBofProduction * bfBofIntensity * remainingYears;

  const bfBofSharePct = Math.round(bfBofShare * 10000) / 100;

  let classification: LockedInResult['classification'];
  let color: string;
  if (bfBofSharePct <= 10) { classification = 'low'; color = '#059669'; }
  else if (bfBofSharePct <= 30) { classification = 'moderate'; color = '#f59e0b'; }
  else if (bfBofSharePct <= 50) { classification = 'high'; color = '#f97316'; }
  else { classification = 'critical'; color = '#ef4444'; }

  return {
    lockedInMt: Math.round(lockedInMt * 100) / 100,
    lockedInIntensity: bfBofIntensity,
    bfBofShareLT: bfBofSharePct,
    yearsRemaining: remainingYears,
    classification,
    classificationColor: color,
    details: bfBofSharePct > 0
      ? `${bfBofSharePct}% of LT production is BF-BOF, locking in ${lockedInMt.toFixed(0)} Mt CO2 over ${remainingYears} remaining asset years`
      : 'No BF-BOF capacity in long-term plan — zero locked-in emissions',
  };
}

// ── Sector Percentile ──

export interface SectorPercentileResult {
  percentile: number; // 0-100
  intensityVsGlobal: number; // ratio to global average
  classification: 'top_quartile' | 'above_average' | 'below_average' | 'bottom_quartile';
  classificationColor: string;
  details: string;
}

/**
 * Approximate global steel intensity distribution (tCO2/tcs):
 * 10th percentile: 0.4 (best EAF recyclers)
 * 25th percentile: 0.7
 * 50th percentile: 1.4 (global average)
 * 75th percentile: 2.2
 * 90th percentile: 2.8 (inefficient integrated)
 */
export function calcSectorPercentile(periods: PeriodResult[]): SectorPercentileResult {
  const sorted = [...periods].sort((a, b) => a.year - b.year);
  const baseIntensity = sorted[0]?.companyIntensity ?? 0;

  // Map intensity to approximate percentile using piecewise linear
  const benchmarks = [
    { intensity: 0, percentile: 100 },
    { intensity: 0.4, percentile: 90 },
    { intensity: 0.7, percentile: 75 },
    { intensity: 1.4, percentile: 50 },
    { intensity: 2.2, percentile: 25 },
    { intensity: 2.8, percentile: 10 },
    { intensity: 3.5, percentile: 1 },
  ];

  let percentile = 1;
  for (let i = 0; i < benchmarks.length - 1; i++) {
    if (baseIntensity >= benchmarks[i].intensity && baseIntensity <= benchmarks[i + 1].intensity) {
      const t = (baseIntensity - benchmarks[i].intensity) / (benchmarks[i + 1].intensity - benchmarks[i].intensity);
      percentile = benchmarks[i].percentile + t * (benchmarks[i + 1].percentile - benchmarks[i].percentile);
      break;
    }
  }
  if (baseIntensity <= 0) percentile = 100;
  if (baseIntensity >= 3.5) percentile = 1;

  percentile = Math.round(percentile);
  const ratio = GLOBAL_STEEL_BASELINE_INTENSITY > 0 ? Math.round((baseIntensity / GLOBAL_STEEL_BASELINE_INTENSITY) * 100) / 100 : 0;

  let classification: SectorPercentileResult['classification'];
  let color: string;
  if (percentile >= 75) { classification = 'top_quartile'; color = '#059669'; }
  else if (percentile >= 50) { classification = 'above_average'; color = '#10b981'; }
  else if (percentile >= 25) { classification = 'below_average'; color = '#f59e0b'; }
  else { classification = 'bottom_quartile'; color = '#ef4444'; }

  return {
    percentile,
    intensityVsGlobal: ratio,
    classification,
    classificationColor: color,
    details: `Base intensity ${baseIntensity.toFixed(3)} tCO2/tcs places the company in the ${percentile}th percentile of global steel producers (${ratio}x global average)`,
  };
}
