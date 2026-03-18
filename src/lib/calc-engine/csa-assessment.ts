/**
 * Climate Sustainability Assessment (CSA)
 *
 * Composite 0-100 score across 8 weighted dimensions.
 * Aggregates signals from other assessments + company data.
 */

import type {
  PeriodResult,
  ITRResult,
  LCTResult,
  CTAResult,
  CVaRResult,
  CSAResult,
} from './types';

interface FinancialsInput {
  emissionTargetType?: string;
  netZeroYear?: number;
  capexLowCarbonPercent?: number;
  revenueLowCarbonPercent?: number;
  hasBoardClimateOversight?: boolean;
}

// ── Classification ──

function classifyCSA(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Leader', color: '#065f46' };
  if (score >= 60) return { label: 'Strong', color: '#059669' };
  if (score >= 40) return { label: 'Developing', color: '#f59e0b' };
  if (score >= 20) return { label: 'Emerging', color: '#f97316' };
  return { label: 'Nascent', color: '#ef4444' };
}

// ── Core Calculation ──

export function calcCSA(
  periods: PeriodResult[],
  itrResult: ITRResult | null,
  lctResult: LCTResult | null,
  ctaResult: CTAResult | null,
  cvarResult: CVaRResult | null,
  financials: FinancialsInput = {}
): CSAResult {
  const sorted = [...periods].sort((a, b) => a.year - b.year);
  const dims: CSAResult['dimensions'] = [];

  // 1. Emission Performance (20%) — annual reduction rate
  let emScore = 0;
  let emDesc = 'No emission data';
  if (sorted.length >= 2) {
    const base = sorted[0].companyIntensity;
    const last = sorted[sorted.length - 1].companyIntensity;
    const years = sorted[sorted.length - 1].year - sorted[0].year;
    const annualRate = years > 0 && base > 0 ? ((base - last) / (base * years)) * 100 : 0;

    if (annualRate >= 5) { emScore = 100; emDesc = `Excellent: ${annualRate.toFixed(1)}%/yr reduction`; }
    else if (annualRate >= 3) { emScore = 75; emDesc = `Strong: ${annualRate.toFixed(1)}%/yr reduction`; }
    else if (annualRate >= 1.5) { emScore = 50; emDesc = `Moderate: ${annualRate.toFixed(1)}%/yr reduction`; }
    else if (annualRate > 0) { emScore = 25; emDesc = `Limited: ${annualRate.toFixed(1)}%/yr reduction`; }
    else { emScore = 5; emDesc = 'No meaningful emission reduction'; }
  }
  dims.push({ name: 'Emission Performance', weight: 0.20, score: emScore, weightedContribution: emScore * 0.20, description: emDesc });

  // 2. Target Setting (15%)
  const targetType = financials.emissionTargetType ?? 'none';
  const nzYear = financials.netZeroYear ?? 0;
  let targetScore = 0;
  let targetDesc: string;
  if (targetType === 'science_based' && nzYear > 0 && nzYear <= 2050) { targetScore = 100; targetDesc = `Science-based target with Net Zero ${nzYear}`; }
  else if (targetType === 'science_based') { targetScore = 80; targetDesc = 'Science-based target set'; }
  else if (targetType === 'public' && nzYear > 0) { targetScore = 60; targetDesc = `Public target with Net Zero ${nzYear}`; }
  else if (targetType === 'public') { targetScore = 45; targetDesc = 'Public emission target'; }
  else if (targetType === 'internal') { targetScore = 20; targetDesc = 'Internal target only'; }
  else { targetScore = 5; targetDesc = 'No emission target'; }
  dims.push({ name: 'Target Setting', weight: 0.15, score: targetScore, weightedContribution: targetScore * 0.15, description: targetDesc });

  // 3. Technology Strategy (15%)
  let techScore = 0;
  let techDesc = 'No data';
  if (sorted.length >= 2) {
    const reduction = sorted[0].companyIntensity > 0
      ? ((sorted[0].companyIntensity - sorted[sorted.length - 1].companyIntensity) / sorted[0].companyIntensity) * 100
      : 0;
    if (reduction >= 70) { techScore = 100; techDesc = `Transformational: ${reduction.toFixed(0)}% intensity reduction`; }
    else if (reduction >= 50) { techScore = 75; techDesc = `Major shift: ${reduction.toFixed(0)}% reduction`; }
    else if (reduction >= 25) { techScore = 45; techDesc = `Moderate: ${reduction.toFixed(0)}% reduction`; }
    else if (reduction > 0) { techScore = 20; techDesc = `Limited: ${reduction.toFixed(0)}% reduction`; }
    else { techScore = 5; techDesc = 'No technology-driven reduction'; }
  }
  dims.push({ name: 'Technology Strategy', weight: 0.15, score: techScore, weightedContribution: techScore * 0.15, description: techDesc });

  // 4. Financial Integration (15%)
  const capex = financials.capexLowCarbonPercent ?? 0;
  const rev = financials.revenueLowCarbonPercent ?? 0;
  const finAvg = (capex + rev) / 2;
  let finScore = 0;
  let finDesc: string;
  if (finAvg >= 25) { finScore = 100; finDesc = `Excellent: ${capex}% green CAPEX, ${rev}% low-carbon revenue`; }
  else if (finAvg >= 15) { finScore = 70; finDesc = `Strong financial commitment`; }
  else if (finAvg >= 5) { finScore = 40; finDesc = `Moderate allocation`; }
  else if (finAvg > 0) { finScore = 15; finDesc = `Minimal financial integration`; }
  else { finScore = 5; finDesc = 'No low-carbon financial allocation'; }
  dims.push({ name: 'Financial Integration', weight: 0.15, score: finScore, weightedContribution: finScore * 0.15, description: finDesc });

  // 5. Governance (10%)
  const hasBoard = financials.hasBoardClimateOversight ?? false;
  const hasSBTi = targetType === 'science_based';
  const hasNZ = nzYear > 0;
  const govFactors = [hasBoard, hasSBTi || targetType === 'public', hasNZ].filter(Boolean).length;
  let govScore = govFactors === 3 ? 100 : govFactors === 2 ? 65 : govFactors === 1 ? 30 : 5;
  let govDesc = `${govFactors}/3 governance structures in place`;
  dims.push({ name: 'Governance', weight: 0.10, score: govScore, weightedContribution: govScore * 0.10, description: govDesc });

  // 6. Scenario Preparedness (10%) — derived from ITR
  let scenScore = 0;
  let scenDesc = 'No ITR data';
  if (itrResult) {
    const temp = itrResult.impliedTemperature;
    if (temp <= 1.5) { scenScore = 100; scenDesc = 'Aligned with 1.5°C scenarios'; }
    else if (temp <= 2.0) { scenScore = 70; scenDesc = `${temp.toFixed(1)}°C — aligned with 2°C`; }
    else if (temp <= 2.5) { scenScore = 40; scenDesc = `${temp.toFixed(1)}°C — partial alignment`; }
    else { scenScore = 15; scenDesc = `${temp.toFixed(1)}°C — significant scenario gap`; }
  }
  dims.push({ name: 'Scenario Preparedness', weight: 0.10, score: scenScore, weightedContribution: scenScore * 0.10, description: scenDesc });

  // 7. Risk Management (10%) — derived from CVaR (lower = better)
  let riskScore = 0;
  let riskDesc = 'No CVaR data';
  if (cvarResult) {
    const pct = Math.abs(cvarResult.totalCVaRPercent);
    if (pct <= 3) { riskScore = 100; riskDesc = `Low risk: ${pct.toFixed(1)}% of EV`; }
    else if (pct <= 10) { riskScore = 70; riskDesc = `Moderate risk: ${pct.toFixed(1)}% of EV`; }
    else if (pct <= 20) { riskScore = 40; riskDesc = `High risk: ${pct.toFixed(1)}% of EV`; }
    else { riskScore = 15; riskDesc = `Very high risk: ${pct.toFixed(1)}% of EV`; }
  }
  dims.push({ name: 'Risk Management', weight: 0.10, score: riskScore, weightedContribution: riskScore * 0.10, description: riskDesc });

  // 8. Stakeholder Transparency (5%)
  let transScore = 0;
  let transDesc: string;
  if (targetType === 'science_based') { transScore = 100; transDesc = 'Science-based, externally validated targets'; }
  else if (targetType === 'public') { transScore = 60; transDesc = 'Publicly disclosed targets'; }
  else if (targetType === 'internal') { transScore = 20; transDesc = 'Internal targets only — limited transparency'; }
  else { transScore = 5; transDesc = 'No climate disclosure'; }
  dims.push({ name: 'Stakeholder Transparency', weight: 0.05, score: transScore, weightedContribution: transScore * 0.05, description: transDesc });

  const totalScore = Math.round(dims.reduce((sum, d) => sum + d.weightedContribution, 0) * 100) / 100;
  const cls = classifyCSA(totalScore);

  return {
    totalScore,
    classification: cls.label,
    classificationColor: cls.color,
    dimensions: dims,
  };
}
