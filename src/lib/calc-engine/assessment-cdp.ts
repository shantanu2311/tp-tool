/**
 * CDP Climate Readiness Score
 *
 * Estimates how a company would score on CDP's Climate Change questionnaire
 * based on the data entered in the wizard. CDP uses 4 scoring levels:
 * D (Disclosure), C (Awareness), B (Management), A (Leadership).
 *
 * Evaluated across CDP's key modules:
 * - Governance (board oversight, exec incentives)
 * - Risks & Opportunities (scenario analysis, risk assessment)
 * - Strategy (transition plan, emission targets)
 * - Targets & Performance (SBTi, trajectory, verification)
 * - Emissions (Scope 1+2 reporting, intensity metrics)
 * - Value Chain (supplier engagement, low-carbon products)
 *
 * Sources: CDP Full Corporate Scoring Methodology 2025
 */

import type { PeriodResult, ITRResult } from './types';

export interface CDPReadinessResult {
  level: 'D' | 'C' | 'B' | 'A';
  levelLabel: string;
  levelColor: string;
  score: number; // 0-100
  modules: {
    name: string;
    score: number; // 0-100
    level: 'D' | 'C' | 'B' | 'A';
    details: string;
  }[];
  recommendations: string[];
}

interface CDPFinancials {
  emissionTargetType?: string;
  hasBoardClimateOversight?: boolean;
  netZeroYear?: number;
  interimTargetYear?: number;
  interimTargetReduction?: number;
  executiveClimateComp?: boolean;
  externalVerification?: boolean;
  physicalRiskAssessed?: boolean;
  policyEngagementAligned?: boolean;
  supplierEngagement?: boolean;
  internalCarbonPrice?: number;
  capexLowCarbonPercent?: number;
  revenueLowCarbonPercent?: number;
  rdLowCarbonPercent?: number;
}

function moduleLevel(score: number): 'D' | 'C' | 'B' | 'A' {
  if (score >= 75) return 'A';
  if (score >= 50) return 'B';
  if (score >= 25) return 'C';
  return 'D';
}

const LEVEL_COLORS: Record<string, string> = {
  A: '#059669', B: '#10b981', C: '#f59e0b', D: '#ef4444',
};

const LEVEL_LABELS: Record<string, string> = {
  A: 'Leadership', B: 'Management', C: 'Awareness', D: 'Disclosure',
};

export function calcCDPReadiness(
  periods: PeriodResult[],
  financials: CDPFinancials = {},
  itrResult: ITRResult | null = null
): CDPReadinessResult {
  const sorted = [...periods].sort((a, b) => a.year - b.year);
  const hasTarget = (financials.emissionTargetType ?? 'none') !== 'none';
  const hasSBT = financials.emissionTargetType === 'science_based';
  const hasBoard = financials.hasBoardClimateOversight ?? false;
  const hasExecComp = financials.executiveClimateComp ?? false;
  const hasVerification = financials.externalVerification ?? false;
  const hasPhysicalRisk = financials.physicalRiskAssessed ?? false;
  const hasSupplierEng = financials.supplierEngagement ?? false;
  const hasInternalCP = (financials.internalCarbonPrice ?? 0) > 0;
  const hasNetZero = (financials.netZeroYear ?? 0) > 0;
  const capexLC = financials.capexLowCarbonPercent ?? 0;
  const revLC = financials.revenueLowCarbonPercent ?? 0;
  const rdLC = financials.rdLowCarbonPercent ?? 0;

  // Intensity reduction for performance scoring
  const baseI = sorted[0]?.companyIntensity ?? 0;
  const ltI = sorted[sorted.length - 1]?.companyIntensity ?? baseI;
  const reductionPct = baseI > 0 ? ((baseI - ltI) / baseI) * 100 : 0;

  const modules: CDPReadinessResult['modules'] = [];
  const recommendations: string[] = [];

  // Module 1: Governance (weight: ~15%)
  let govScore = 0;
  if (hasBoard) govScore += 40;
  if (hasExecComp) govScore += 35;
  if (hasInternalCP) govScore += 25;
  modules.push({ name: 'Governance', score: govScore, level: moduleLevel(govScore), details: `Board oversight: ${hasBoard ? 'Yes' : 'No'}, Exec incentives: ${hasExecComp ? 'Yes' : 'No'}, Internal carbon price: ${hasInternalCP ? 'Yes' : 'No'}` });
  if (!hasBoard) recommendations.push('Establish board-level climate oversight');
  if (!hasExecComp) recommendations.push('Link executive compensation to climate targets');

  // Module 2: Risk & Opportunity (~15%)
  let riskScore = 0;
  if (hasPhysicalRisk) riskScore += 40;
  // Scenario analysis: we have it if there are 4 periods with trajectory
  if (sorted.length >= 4) riskScore += 35;
  if (hasInternalCP) riskScore += 25;
  modules.push({ name: 'Risks & Opportunities', score: riskScore, level: moduleLevel(riskScore), details: `Physical risk assessed: ${hasPhysicalRisk ? 'Yes' : 'No'}, Scenario analysis: ${sorted.length >= 4 ? 'Yes' : 'No'}` });
  if (!hasPhysicalRisk) recommendations.push('Conduct physical climate risk assessment on assets');

  // Module 3: Strategy (~20%)
  let stratScore = 0;
  if (hasTarget) stratScore += 25;
  if (hasNetZero) stratScore += 25;
  if (capexLC >= 10) stratScore += 25;
  else if (capexLC >= 5) stratScore += 15;
  if (reductionPct >= 50) stratScore += 25;
  else if (reductionPct >= 25) stratScore += 15;
  modules.push({ name: 'Strategy', score: Math.min(100, stratScore), level: moduleLevel(stratScore), details: `Transition plan: ${hasTarget ? 'Yes' : 'No'}, Net-zero target: ${hasNetZero ? 'Yes' : 'No'}, CAPEX aligned: ${capexLC}%` });

  // Module 4: Targets & Performance (~25%)
  let targetScore = 0;
  if (hasSBT) targetScore += 35;
  else if (hasTarget) targetScore += 15;
  if (hasVerification) targetScore += 25;
  if (itrResult && itrResult.impliedTemperature <= 2.0) targetScore += 25;
  else if (itrResult && itrResult.impliedTemperature <= 3.0) targetScore += 10;
  if (reductionPct >= 70) targetScore += 15;
  else if (reductionPct >= 40) targetScore += 10;
  modules.push({ name: 'Targets & Performance', score: Math.min(100, targetScore), level: moduleLevel(targetScore), details: `SBTi target: ${hasSBT ? 'Yes' : 'No'}, Verified: ${hasVerification ? 'Yes' : 'No'}, Reduction: ${reductionPct.toFixed(0)}%` });
  if (!hasVerification) recommendations.push('Obtain external verification of emissions data');
  if (!hasSBT) recommendations.push('Submit targets for SBTi validation');

  // Module 5: Emissions (~15%)
  let emissionsScore = 0;
  // We track emissions if there are period results
  if (sorted.length >= 2) emissionsScore += 40;
  if (reductionPct >= 30) emissionsScore += 30;
  else if (reductionPct > 0) emissionsScore += 15;
  if (hasVerification) emissionsScore += 30;
  modules.push({ name: 'Emissions', score: Math.min(100, emissionsScore), level: moduleLevel(emissionsScore), details: `Intensity tracked: Yes, Reduction: ${reductionPct.toFixed(0)}%, Verified: ${hasVerification ? 'Yes' : 'No'}` });

  // Module 6: Value Chain (~10%)
  let vcScore = 0;
  if (hasSupplierEng) vcScore += 40;
  if (revLC >= 10) vcScore += 30;
  else if (revLC >= 5) vcScore += 15;
  if (rdLC >= 10) vcScore += 30;
  else if (rdLC >= 5) vcScore += 15;
  modules.push({ name: 'Value Chain', score: Math.min(100, vcScore), level: moduleLevel(vcScore), details: `Supplier engagement: ${hasSupplierEng ? 'Yes' : 'No'}, Low-carbon revenue: ${revLC}%, Green R&D: ${rdLC}%` });
  if (!hasSupplierEng) recommendations.push('Engage suppliers on climate emissions reduction');

  // Overall score (weighted)
  const weights = [0.15, 0.15, 0.20, 0.25, 0.15, 0.10];
  const overallScore = Math.round(modules.reduce((sum, m, i) => sum + m.score * weights[i], 0));
  const level = moduleLevel(overallScore);

  return {
    level,
    levelLabel: LEVEL_LABELS[level],
    levelColor: LEVEL_COLORS[level],
    score: overallScore,
    modules,
    recommendations: recommendations.slice(0, 5), // top 5
  };
}
