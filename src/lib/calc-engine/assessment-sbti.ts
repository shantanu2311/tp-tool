/**
 * SBTi v2.0 Alignment Checker
 *
 * Tests whether the company's planned trajectory meets SBTi Corporate Net-Zero
 * Standard v2.0 requirements for the steel sector.
 *
 * Near-term: ≥4.2% annual absolute reduction (steel sector pathway)
 * Long-term: Intensity ≤0.4 tCO2/tcs by 2050 (near-zero)
 *
 * Sources: SBTi Corporate Net-Zero Standard v2.0, SBTi Steel Sector Guidance
 */

import type { PeriodResult } from './types';

/** SBTi steel sector required annual reduction rate */
const SBTI_STEEL_ANNUAL_RATE = 0.042; // 4.2% per year

/** Near-zero intensity threshold for long-term target */
const NEAR_ZERO_THRESHOLD = 0.4; // tCO2/tcs

export interface SBTiAlignmentResult {
  nearTermAligned: boolean;
  longTermAligned: boolean;
  overallClassification: 'aligned' | 'partial' | 'not_aligned';
  classificationColor: string;
  annualReductionRate: number; // actual compound rate (%)
  requiredRate: number; // 4.2%
  nearTermGap: number; // % gap between actual and required
  longTermIntensity: number; // LT intensity achieved
  longTermThreshold: number; // 0.4 tCO2/tcs
  details: string;
}

export function calcSBTiAlignment(periods: PeriodResult[]): SBTiAlignmentResult {
  const sorted = [...periods].sort((a, b) => a.year - b.year);

  if (sorted.length < 2) {
    return {
      nearTermAligned: false, longTermAligned: false,
      overallClassification: 'not_aligned', classificationColor: '#ef4444',
      annualReductionRate: 0, requiredRate: SBTI_STEEL_ANNUAL_RATE * 100,
      nearTermGap: SBTI_STEEL_ANNUAL_RATE * 100, longTermIntensity: sorted[0]?.companyIntensity ?? 0,
      longTermThreshold: NEAR_ZERO_THRESHOLD,
      details: 'Insufficient data for SBTi assessment',
    };
  }

  const base = sorted[0];
  const lt = sorted[sorted.length - 1];
  const years = lt.year - base.year;

  // Compound annual reduction rate (intensity-based)
  const annualRate = years > 0 && base.companyIntensity > 0
    ? 1 - Math.pow(lt.companyIntensity / base.companyIntensity, 1 / years)
    : 0;
  const annualRatePct = Math.round(annualRate * 10000) / 100;

  // Near-term: find the period closest to 2030 (or first ST period)
  const stPeriod = sorted.find(p => p.year >= 2028 && p.year <= 2035) ?? sorted[1];
  const stYears = stPeriod.year - base.year;
  const stRate = stYears > 0 && base.companyIntensity > 0
    ? 1 - Math.pow(stPeriod.companyIntensity / base.companyIntensity, 1 / stYears)
    : 0;

  const nearTermAligned = stRate >= SBTI_STEEL_ANNUAL_RATE;
  const nearTermGap = Math.round((SBTI_STEEL_ANNUAL_RATE * 100 - stRate * 100) * 100) / 100;

  // Long-term: does LT intensity reach near-zero?
  const longTermAligned = lt.companyIntensity <= NEAR_ZERO_THRESHOLD;

  // Overall classification
  let overallClassification: SBTiAlignmentResult['overallClassification'];
  let classificationColor: string;
  let details: string;

  if (nearTermAligned && longTermAligned) {
    overallClassification = 'aligned';
    classificationColor = '#059669';
    details = `Fully aligned with SBTi v2.0: ${annualRatePct}% annual reduction (≥4.2% required), LT intensity ${lt.companyIntensity.toFixed(3)} tCO2/tcs (≤0.4 required)`;
  } else if (nearTermAligned || longTermAligned) {
    overallClassification = 'partial';
    classificationColor = '#f59e0b';
    const missing = !nearTermAligned
      ? `Near-term reduction rate ${(stRate * 100).toFixed(1)}% < 4.2% required`
      : `Long-term intensity ${lt.companyIntensity.toFixed(3)} > 0.4 tCO2/tcs threshold`;
    details = `Partially aligned: ${missing}`;
  } else {
    overallClassification = 'not_aligned';
    classificationColor = '#ef4444';
    details = `Not aligned: ${(stRate * 100).toFixed(1)}% annual reduction (need 4.2%), LT intensity ${lt.companyIntensity.toFixed(3)} (need ≤0.4)`;
  }

  return {
    nearTermAligned,
    longTermAligned,
    overallClassification,
    classificationColor,
    annualReductionRate: annualRatePct,
    requiredRate: SBTI_STEEL_ANNUAL_RATE * 100,
    nearTermGap: Math.max(0, nearTermGap),
    longTermIntensity: Math.round(lt.companyIntensity * 1000) / 1000,
    longTermThreshold: NEAR_ZERO_THRESHOLD,
    details,
  };
}
