/**
 * Climate Transition Assessment (CTA) — Shade of Green
 *
 * Evaluates transition plan quality across 6 weighted criteria.
 * Returns a "Shade of Green" rating from Dark Green to Red.
 */

import type { PeriodResult, ITRResult, CTAResult } from './types';

interface FinancialsInput {
  capexLowCarbonPercent?: number;
  revenueLowCarbonPercent?: number;
  emissionTargetType?: string;
  hasBoardClimateOversight?: boolean;
  netZeroYear?: number;
  interimTargetYear?: number;
  interimTargetReduction?: number;
}

// ── Shade Classification ──

type Shade = CTAResult['shade'];

function classifyShade(score: number): { shade: Shade; label: string; color: string } {
  if (score >= 85) return { shade: 'dark_green', label: 'Dark Green', color: '#065f46' };
  if (score >= 70) return { shade: 'green', label: 'Green', color: '#059669' };
  if (score >= 55) return { shade: 'light_green', label: 'Light Green', color: '#84cc16' };
  if (score >= 40) return { shade: 'yellow', label: 'Yellow', color: '#eab308' };
  if (score >= 25) return { shade: 'orange', label: 'Orange', color: '#f97316' };
  return { shade: 'red', label: 'Red', color: '#ef4444' };
}

// ── Core Calculation ──

export function calcCTA(
  periods: PeriodResult[],
  itrResult: ITRResult | null,
  financials: FinancialsInput = {}
): CTAResult {
  const sorted = [...periods].sort((a, b) => a.year - b.year);
  const criteria: CTAResult['criteria'] = [];

  // 1. Ambition (25%) — based on ITR
  let ambitionScore = 0;
  let ambitionDesc = 'No ITR data available';
  if (itrResult) {
    const temp = itrResult.impliedTemperature;
    if (temp <= 1.5) { ambitionScore = 100; ambitionDesc = `${temp.toFixed(1)}°C — Paris-aligned ambition`; }
    else if (temp <= 1.75) { ambitionScore = 80; ambitionDesc = `${temp.toFixed(1)}°C — Below 2°C ambition`; }
    else if (temp <= 2.0) { ambitionScore = 60; ambitionDesc = `${temp.toFixed(1)}°C — 2°C aligned`; }
    else if (temp <= 2.5) { ambitionScore = 40; ambitionDesc = `${temp.toFixed(1)}°C — Above 2°C pathway`; }
    else if (temp <= 3.0) { ambitionScore = 20; ambitionDesc = `${temp.toFixed(1)}°C — Well above 2°C`; }
    else { ambitionScore = 5; ambitionDesc = `${temp.toFixed(1)}°C — Strongly misaligned`; }
  }
  criteria.push({ name: 'Ambition', weight: 0.25, score: ambitionScore, weightedContribution: ambitionScore * 0.25, description: ambitionDesc });

  // 2. Pathway Credibility (20%) — consistent period-over-period improvement
  let credScore = 0;
  let credDesc = 'Insufficient period data';
  if (sorted.length >= 3) {
    let improving = 0;
    let total = 0;
    for (let i = 1; i < sorted.length; i++) {
      total++;
      if (sorted[i].companyIntensity < sorted[i - 1].companyIntensity) improving++;
    }
    const improvingPct = total > 0 ? (improving / total) * 100 : 0;

    if (improvingPct === 100) { credScore = 100; credDesc = 'Consistent improvement across all periods'; }
    else if (improvingPct >= 66) { credScore = 70; credDesc = `${improving}/${total} periods show improvement`; }
    else if (improvingPct >= 33) { credScore = 40; credDesc = `Only ${improving}/${total} periods improve — inconsistent`; }
    else { credScore = 10; credDesc = 'Minimal period-over-period improvement'; }
  } else if (sorted.length === 2) {
    credScore = sorted[1].companyIntensity < sorted[0].companyIntensity ? 70 : 20;
    credDesc = credScore > 50 ? 'Intensity decreasing from base' : 'No improvement from base';
  }
  criteria.push({ name: 'Pathway Credibility', weight: 0.20, score: credScore, weightedContribution: credScore * 0.20, description: credDesc });

  // 3. Technology Feasibility (15%) — using intensity reduction as proxy for tech shift
  let techScore = 0;
  let techDesc = 'No data';
  if (sorted.length >= 2) {
    const baseI = sorted[0].companyIntensity;
    const ltI = sorted[sorted.length - 1].companyIntensity;
    const reduction = baseI > 0 ? ((baseI - ltI) / baseI) * 100 : 0;

    if (reduction >= 70) { techScore = 100; techDesc = `${reduction.toFixed(0)}% reduction — transformational technology shift`; }
    else if (reduction >= 50) { techScore = 80; techDesc = `${reduction.toFixed(0)}% reduction — major technology adoption`; }
    else if (reduction >= 30) { techScore = 55; techDesc = `${reduction.toFixed(0)}% reduction — moderate technology change`; }
    else if (reduction >= 10) { techScore = 30; techDesc = `${reduction.toFixed(0)}% reduction — limited technology shift`; }
    else { techScore = 10; techDesc = `Minimal reduction (${reduction.toFixed(0)}%) — no significant technology change`; }
  }
  criteria.push({ name: 'Technology Feasibility', weight: 0.15, score: techScore, weightedContribution: techScore * 0.15, description: techDesc });

  // 4. Financial Commitment (15%) — CAPEX + revenue low-carbon allocation
  const capexPct = financials.capexLowCarbonPercent ?? 0;
  const revPct = financials.revenueLowCarbonPercent ?? 0;
  const finAvg = (capexPct + revPct) / 2;
  let finScore = 0;
  let finDesc: string;
  if (finAvg >= 20) { finScore = 100; finDesc = `Strong: ${capexPct}% green CAPEX, ${revPct}% low-carbon revenue`; }
  else if (finAvg >= 10) { finScore = 65; finDesc = `Moderate: ${capexPct}% green CAPEX, ${revPct}% low-carbon revenue`; }
  else if (finAvg >= 3) { finScore = 35; finDesc = `Limited: ${capexPct}% green CAPEX, ${revPct}% low-carbon revenue`; }
  else { finScore = 10; finDesc = 'Minimal financial commitment to transition'; }
  criteria.push({ name: 'Financial Commitment', weight: 0.15, score: finScore, weightedContribution: finScore * 0.15, description: finDesc });

  // 5. Interim Targets (15%) — do milestones show meaningful reductions?
  let interimScore = 0;
  let interimDesc = 'No interim targets set';
  if (sorted.length >= 3) {
    // Check if ST and MT show meaningful reductions vs base
    const base = sorted[0].companyIntensity;
    const stReduction = base > 0 ? ((base - (sorted[1]?.companyIntensity ?? base)) / base) * 100 : 0;
    const mtReduction = base > 0 ? ((base - (sorted[2]?.companyIntensity ?? base)) / base) * 100 : 0;

    if (stReduction >= 20 && mtReduction >= 40) { interimScore = 100; interimDesc = `Strong milestones: ST −${stReduction.toFixed(0)}%, MT −${mtReduction.toFixed(0)}%`; }
    else if (stReduction >= 10 && mtReduction >= 20) { interimScore = 65; interimDesc = `Moderate: ST −${stReduction.toFixed(0)}%, MT −${mtReduction.toFixed(0)}%`; }
    else if (stReduction >= 5 || mtReduction >= 10) { interimScore = 35; interimDesc = `Weak milestones: ST −${stReduction.toFixed(0)}%, MT −${mtReduction.toFixed(0)}%`; }
    else { interimScore = 10; interimDesc = 'Negligible interim reductions'; }
  }
  criteria.push({ name: 'Interim Targets', weight: 0.15, score: interimScore, weightedContribution: interimScore * 0.15, description: interimDesc });

  // 6. Governance & Accountability (10%)
  const hasBoard = financials.hasBoardClimateOversight ?? false;
  const targetType = financials.emissionTargetType ?? 'none';
  const hasNetZero = (financials.netZeroYear ?? 0) > 0;
  let govScore = 0;
  let govDesc: string;
  const govFactors = [hasBoard, targetType === 'science_based' || targetType === 'public', hasNetZero].filter(Boolean).length;
  if (govFactors === 3) { govScore = 100; govDesc = 'Full: board oversight, public/SBTi target, net zero commitment'; }
  else if (govFactors === 2) { govScore = 65; govDesc = `${govFactors}/3 governance factors present`; }
  else if (govFactors === 1) { govScore = 30; govDesc = `Only ${govFactors}/3 governance factors`; }
  else { govScore = 5; govDesc = 'No climate governance structures'; }
  criteria.push({ name: 'Governance & Accountability', weight: 0.10, score: govScore, weightedContribution: govScore * 0.10, description: govDesc });

  let weightedScore = Math.round(criteria.reduce((sum, c) => sum + c.weightedContribution, 0) * 100) / 100;

  // ── Lock-in Penalty ──
  // If the long-term plan still relies heavily on conventional BF-BOF (fossil lock-in),
  // cap the shade at Light Green maximum regardless of score (CICERO principle).
  const ltPeriod = sorted[sorted.length - 1];
  if (ltPeriod && ltPeriod.methods) {
    const bofShare = ltPeriod.methods
      .filter((m) => m.methodName.includes('Blast Furnace') || m.methodName.includes('BOF'))
      .reduce((s, m) => s + m.share, 0);
    if (bofShare > 0.4) {
      // >40% BF-BOF in long term = significant fossil lock-in
      weightedScore = Math.min(weightedScore, 54); // caps at Yellow
    } else if (bofShare > 0.2) {
      // 20-40% BF-BOF = moderate lock-in
      weightedScore = Math.min(weightedScore, 69); // caps at Light Green
    }
  }

  const cls = classifyShade(weightedScore);

  return {
    shade: cls.shade,
    shadeLabel: cls.label,
    shadeColor: cls.color,
    weightedScore,
    criteria,
  };
}
