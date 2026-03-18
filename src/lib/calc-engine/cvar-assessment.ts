/**
 * Climate Value at Risk (CVaR) Assessment
 *
 * Three risk components as % of enterprise value:
 * 1. Policy Risk — NPV of carbon pricing costs
 * 2. Technology Opportunity — NPV of green steel premium revenue
 * 3. Physical Risk — warming-scaled GDP/demand damage
 *
 * CVaR = (PolicyCost - TechOpportunity + PhysicalDamage) / EV × 100
 */

import type { PeriodResult, ScenarioData, ITRResult, CVaRResult } from './types';
import {
  DEFAULT_WACC,
  GREEN_STEEL_PREMIUM_PERCENT,
  PHYSICAL_RISK_GDP_DAMAGE_3C,
  STEEL_PHYSICAL_RISK_MULTIPLIER,
} from './constants';

// ── Helpers ──

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

function interpolateScenarioPrice(scenario: ScenarioData, year: number): number {
  const pts = scenario.carbonPrices;
  if (pts.length === 0) return 0;
  const sorted = [...pts].sort((a, b) => a.year - b.year);
  if (year <= sorted[0].year) return sorted[0].priceUSD;
  if (year >= sorted[sorted.length - 1].year) return sorted[sorted.length - 1].priceUSD;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (year >= sorted[i].year && year <= sorted[i + 1].year) {
      const t = (year - sorted[i].year) / (sorted[i + 1].year - sorted[i].year);
      return sorted[i].priceUSD + t * (sorted[i + 1].priceUSD - sorted[i].priceUSD);
    }
  }
  return sorted[sorted.length - 1].priceUSD;
}

// ── Classification ──

function classifyCVaR(percent: number): { label: string; color: string } {
  if (percent <= 5) return { label: 'Low', color: '#10b981' };
  if (percent <= 15) return { label: 'Moderate', color: '#f59e0b' };
  if (percent <= 30) return { label: 'High', color: '#f97316' };
  return { label: 'Very High', color: '#ef4444' };
}

// ── Core Calculation ──

interface CVaRFinancials {
  enterpriseValue?: number;
  annualRevenue?: number;
  wacc?: number;
  greenPremiumPercent?: number;
  revenueLowCarbonPercent?: number;
}

export function calcCVaR(
  periods: PeriodResult[],
  scenarios: ScenarioData[],
  itrResult: ITRResult | null,
  financials: CVaRFinancials = {}
): CVaRResult {
  const sorted = [...periods].sort((a, b) => a.year - b.year);
  if (sorted.length === 0) {
    const cls = classifyCVaR(0);
    return {
      totalCVaRPercent: 0, totalCVaRAbsolute: 0,
      policyRisk: { npv: 0, annualCosts: [] },
      techOpportunity: { npv: 0, annualBenefits: [] },
      physicalRisk: { estimatedDamage: 0, temperatureBasis: 0 },
      enterpriseValue: 0,
      classification: cls.label, classificationColor: cls.color,
    };
  }

  const baseYear = sorted[0].year;
  const endYear = Math.max(sorted[sorted.length - 1].year, 2050);
  const ev = financials.enterpriseValue ?? (sorted[0].totalProduction * 550 * 1.2); // fallback: prod × rev/t × EV multiple
  const wacc = (financials.wacc ?? (DEFAULT_WACC * 100)) / 100; // convert from % to decimal
  const greenPremium = (financials.greenPremiumPercent ?? (GREEN_STEEL_PREMIUM_PERCENT * 100)) / 100;
  const annualRevenue = financials.annualRevenue ?? (sorted[0].totalProduction * 550);

  // ── 1. Policy Risk ──
  // Use the scenario with highest carbon prices (worst case)
  let worstScenario = scenarios[0];
  if (scenarios.length > 1) {
    let maxTotalPrice = 0;
    for (const sc of scenarios) {
      const total = sc.carbonPrices.reduce((s, p) => s + p.priceUSD, 0);
      if (total > maxTotalPrice) { maxTotalPrice = total; worstScenario = sc; }
    }
  }

  const policyAnnual: CVaRResult['policyRisk']['annualCosts'] = [];
  let policyNPV = 0;

  for (let y = baseYear; y <= endYear; y++) {
    const t = y - baseYear;
    const intensity = interpolateAtYear(periods, y, 'companyIntensity');
    const production = interpolateAtYear(periods, y, 'totalProduction');
    const emissions = intensity * production; // MtCO2
    const price = worstScenario ? interpolateScenarioPrice(worstScenario, y) : 0;
    const cost = emissions * price; // USD millions (Mt × USD/t = M USD)
    const discounted = cost / Math.pow(1 + wacc, t);

    policyNPV += discounted;
    policyAnnual.push({
      year: y,
      cost: Math.round(cost * 100) / 100,
      discounted: Math.round(discounted * 100) / 100,
    });
  }

  // ── 2. Technology Opportunity ──
  // As company decarbonizes, growing share of production qualifies for green premium
  const baseIntensity = sorted[0].companyIntensity;
  const techAnnual: CVaRResult['techOpportunity']['annualBenefits'] = [];
  let techNPV = 0;

  for (let y = baseYear; y <= endYear; y++) {
    const t = y - baseYear;
    const intensity = interpolateAtYear(periods, y, 'companyIntensity');
    // Reduction % from base = proxy for low-carbon share
    const reductionPct = baseIntensity > 0
      ? Math.max(0, (baseIntensity - intensity) / baseIntensity)
      : 0;
    // Green premium applies to the "decarbonized" portion of revenue
    const benefit = annualRevenue * reductionPct * greenPremium;
    const discounted = benefit / Math.pow(1 + wacc, t);

    techNPV += discounted;
    techAnnual.push({
      year: y,
      benefit: Math.round(benefit * 100) / 100,
      discounted: Math.round(discounted * 100) / 100,
    });
  }

  // ── 3. Physical Risk ──
  // Quadratic damage scaling: damage = baseDamage × (temp/3.0)²
  const temp = itrResult?.impliedTemperature ?? 2.5;
  const tempScale = Math.pow(temp / 3.0, 2);
  const physicalDamage = ev * PHYSICAL_RISK_GDP_DAMAGE_3C * STEEL_PHYSICAL_RISK_MULTIPLIER * tempScale;

  // ── Net CVaR ──
  const netCVaR = policyNPV - techNPV + physicalDamage;
  const cvarPercent = ev > 0 ? (netCVaR / ev) * 100 : 0;
  const cls = classifyCVaR(Math.abs(cvarPercent));

  return {
    totalCVaRPercent: Math.round(cvarPercent * 100) / 100,
    totalCVaRAbsolute: Math.round(netCVaR * 100) / 100,
    policyRisk: { npv: Math.round(policyNPV * 100) / 100, annualCosts: policyAnnual },
    techOpportunity: { npv: Math.round(techNPV * 100) / 100, annualBenefits: techAnnual },
    physicalRisk: { estimatedDamage: Math.round(physicalDamage * 100) / 100, temperatureBasis: temp },
    enterpriseValue: Math.round(ev * 100) / 100,
    classification: cls.label,
    classificationColor: cls.color,
  };
}
