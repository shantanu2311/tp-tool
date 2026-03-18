/**
 * Low Carbon Transition Readiness (LCT) Assessment
 *
 * Scores company 0-10 across 5 categories measuring transition preparedness.
 * Each category: 0 (unprepared), 1 (developing), 2 (advanced).
 */

import type { PeriodResult, LCTResult } from './types';

interface FinancialsInput {
  capexLowCarbonPercent?: number;
  emissionTargetType?: string;
  hasBoardClimateOversight?: boolean;
  netZeroYear?: number;
}

// ── Classification ──

function classifyLCT(score: number): { label: string; color: string } {
  if (score >= 9) return { label: 'Leader', color: '#059669' };
  if (score >= 7) return { label: 'Advanced', color: '#10b981' };
  if (score >= 5) return { label: 'Developing', color: '#f59e0b' };
  if (score >= 3) return { label: 'Lagging', color: '#f97316' };
  return { label: 'Unprepared', color: '#ef4444' };
}

// ── Core Calculation ──

export function calcLCT(
  periods: PeriodResult[],
  financials: FinancialsInput = {}
): LCTResult {
  const sorted = [...periods].sort((a, b) => a.year - b.year);
  const categories: LCTResult['categories'] = [];

  // 1. Emission Trajectory — average annual reduction rate
  let trajectoryScore = 0;
  let trajectoryDesc = 'No reduction data available';
  if (sorted.length >= 2) {
    const base = sorted[0];
    const last = sorted[sorted.length - 1];
    const yearsSpan = last.year - base.year;
    const annualRate = yearsSpan > 0 && base.companyIntensity > 0
      ? (base.companyIntensity - last.companyIntensity) / (base.companyIntensity * yearsSpan)
      : 0;

    if (annualRate >= 0.03) {
      trajectoryScore = 2;
      trajectoryDesc = `Strong reduction: ${(annualRate * 100).toFixed(1)}%/yr average`;
    } else if (annualRate >= 0.01) {
      trajectoryScore = 1;
      trajectoryDesc = `Moderate reduction: ${(annualRate * 100).toFixed(1)}%/yr average`;
    } else {
      trajectoryScore = 0;
      trajectoryDesc = annualRate > 0
        ? `Minimal reduction: ${(annualRate * 100).toFixed(1)}%/yr average`
        : 'Flat or increasing emissions intensity';
    }
  }
  categories.push({ name: 'Emission Trajectory', score: trajectoryScore, maxScore: 2, description: trajectoryDesc });

  // 2. Technology Adoption — share of low-carbon methods in long-term
  let techScore = 0;
  let techDesc = 'No long-term production data';
  if (sorted.length > 0) {
    const ltPeriod = sorted[sorted.length - 1];
    // Methods with category containing "EAF", "DRI", "Hydrogen", "Electrolysis" are considered low-carbon
    // Since we don't have method category in PeriodResult, use intensity as proxy:
    // If LT intensity < 50% of base, significant low-carbon adoption
    const base = sorted[0];
    const reductionPercent = base.companyIntensity > 0
      ? ((base.companyIntensity - ltPeriod.companyIntensity) / base.companyIntensity) * 100
      : 0;

    if (reductionPercent >= 60) {
      techScore = 2;
      techDesc = `${reductionPercent.toFixed(0)}% intensity reduction indicates strong low-carbon adoption`;
    } else if (reductionPercent >= 25) {
      techScore = 1;
      techDesc = `${reductionPercent.toFixed(0)}% intensity reduction indicates moderate technology shift`;
    } else {
      techScore = 0;
      techDesc = `Only ${reductionPercent.toFixed(0)}% intensity reduction — limited technology change`;
    }
  }
  categories.push({ name: 'Technology Adoption', score: techScore, maxScore: 2, description: techDesc });

  // 3. CAPEX Alignment
  let capexScore = 0;
  const capexPct = financials.capexLowCarbonPercent ?? 0;
  let capexDesc: string;
  if (capexPct >= 15) {
    capexScore = 2;
    capexDesc = `${capexPct}% of CAPEX directed at low-carbon transition`;
  } else if (capexPct >= 5) {
    capexScore = 1;
    capexDesc = `${capexPct}% of CAPEX on low-carbon — moderate alignment`;
  } else {
    capexScore = 0;
    capexDesc = capexPct > 0 ? `Only ${capexPct}% low-carbon CAPEX` : 'No low-carbon CAPEX data';
  }
  categories.push({ name: 'CAPEX Alignment', score: capexScore, maxScore: 2, description: capexDesc });

  // 4. Target Ambition
  let targetScore = 0;
  const targetType = financials.emissionTargetType ?? 'none';
  let targetDesc: string;
  if (targetType === 'science_based') {
    targetScore = 2;
    targetDesc = 'Science-based target (SBTi or equivalent)';
  } else if (targetType === 'public') {
    targetScore = 1;
    targetDesc = 'Public emission reduction target';
  } else if (targetType === 'internal') {
    targetScore = 0;
    targetDesc = 'Internal target only — not publicly disclosed';
  } else {
    targetScore = 0;
    targetDesc = 'No emission reduction target set';
  }
  categories.push({ name: 'Target Ambition', score: targetScore, maxScore: 2, description: targetDesc });

  // 5. Governance
  let govScore = 0;
  const hasBoard = financials.hasBoardClimateOversight ?? false;
  const hasNetZero = (financials.netZeroYear ?? 0) > 0;
  let govDesc: string;
  if (hasBoard && hasNetZero) {
    govScore = 2;
    govDesc = `Board climate oversight + Net Zero ${financials.netZeroYear} target`;
  } else if (hasBoard || hasNetZero) {
    govScore = 1;
    govDesc = hasBoard ? 'Board climate oversight in place' : `Net Zero ${financials.netZeroYear} target set`;
  } else {
    govScore = 0;
    govDesc = 'No board climate oversight or net zero target';
  }
  categories.push({ name: 'Governance', score: govScore, maxScore: 2, description: govDesc });

  const totalScore = categories.reduce((sum, c) => sum + c.score, 0);
  const cls = classifyLCT(totalScore);

  return {
    totalScore,
    classification: cls.label,
    classificationColor: cls.color,
    categories,
  };
}
