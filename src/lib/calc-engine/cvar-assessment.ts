/**
 * Climate Value at Risk (CVaR) Assessment
 *
 * Three risk components as % of enterprise value:
 * 1. Policy Risk — NPV of carbon pricing costs
 * 2. Technology Opportunity — NPV of green steel premium revenue
 * 3. Physical Risk — NPV of warming-scaled annual damages (Howard & Sterner 2017)
 *
 * CVaR = (PolicyCost - TechOpportunity + PhysicalDamage) / EV × 100
 */

import type { PeriodResult, ScenarioData, ITRResult, CVaRResult } from './types';
import {
  DEFAULT_WACC,
  GREEN_STEEL_PREMIUM_PERCENT,
  DAMAGE_FUNCTION_COEFFICIENT,
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
  if (percent <= 100) return { label: 'Very High', color: '#ef4444' };
  return { label: 'Critical', color: '#991b1b' }; // >100% = potential equity wipeout
}

// ── Core Calculation ──

interface CVaRFinancials {
  enterpriseValue?: number;
  annualRevenue?: number;
  wacc?: number;
  greenPremiumPercent?: number;
  revenueLowCarbonPercent?: number;
  carbonCostPassThroughPercent?: number; // % of carbon costs passed to customers (default 60%)
}

/** IEA NZE 2050 steel intensity threshold — companies below this are "green" */
const GREEN_INTENSITY_THRESHOLD = 0.4; // tCO2/tcs

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
  const ev = financials.enterpriseValue ?? (sorted[0].totalProduction * 550 * 1.2);
  const wacc = (financials.wacc ?? (DEFAULT_WACC * 100)) / 100;
  const greenPremium = (financials.greenPremiumPercent ?? (GREEN_STEEL_PREMIUM_PERCENT * 100)) / 100;
  const annualRevenue = financials.annualRevenue ?? (sorted[0].totalProduction * 550);
  const horizon = endYear - baseYear;
  // Carbon cost pass-through: steel companies typically pass 50-70% of carbon costs to customers
  const passThrough = (financials.carbonCostPassThroughPercent ?? 60) / 100;
  const retainedCarbonCostFraction = 1 - passThrough;

  // ── 1. Policy Risk ──
  // Use the scenario with highest carbon prices (worst case transition)
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
    const grossCost = emissions * price; // USD millions (Mt × USD/t = M USD)
    const cost = grossCost * retainedCarbonCostFraction; // Net after pass-through
    const discounted = cost / Math.pow(1 + wacc, t);

    policyNPV += discounted;
    policyAnnual.push({
      year: y,
      cost: Math.round(cost * 100) / 100,
      discounted: Math.round(discounted * 100) / 100,
    });
  }

  // ── 2. Technology Opportunity ──
  // Companies qualify for green premium based on how clean their production is.
  // Companies already below the green threshold get full credit from the start.
  // Companies above it earn credit proportional to their reduction toward/below the threshold.
  const baseIntensity = sorted[0].companyIntensity;
  const techAnnual: CVaRResult['techOpportunity']['annualBenefits'] = [];
  let techNPV = 0;

  for (let y = baseYear; y <= endYear; y++) {
    const t = y - baseYear;
    const intensity = interpolateAtYear(periods, y, 'companyIntensity');

    // Green share: what fraction of production qualifies for green premium?
    // If already below threshold, get full (or near-full) credit.
    // If above, earn credit proportional to how far below the base intensity you've gone.
    let greenShare: number;
    if (baseIntensity <= GREEN_INTENSITY_THRESHOLD) {
      // Already clean company: full credit, growing with further reduction
      greenShare = 0.8 + 0.2 * Math.max(0, (baseIntensity - intensity) / baseIntensity);
    } else {
      // Transitioning company: credit based on progress toward green threshold
      greenShare = Math.max(0, Math.min(1, (baseIntensity - intensity) / (baseIntensity - GREEN_INTENSITY_THRESHOLD * 0.5)));
    }

    const benefit = annualRevenue * greenShare * greenPremium;
    const discounted = benefit / Math.pow(1 + wacc, t);

    techNPV += discounted;
    techAnnual.push({
      year: y,
      benefit: Math.round(benefit * 100) / 100,
      discounted: Math.round(discounted * 100) / 100,
    });
  }

  // ── 3. Physical Risk (NPV of annual damages) ──
  // Howard & Sterner (2017) damage function: damagePct = 0.01145 × T²
  // Physical damage is spread as annual costs, discounted to present
  const temp = itrResult?.impliedTemperature ?? 2.5;
  const annualDamagePct = DAMAGE_FUNCTION_COEFFICIENT * Math.pow(temp, 2) * STEEL_PHYSICAL_RISK_MULTIPLIER;
  const annualDamage = ev * annualDamagePct; // annual damage in USD millions

  let physicalNPV = 0;
  for (let y = baseYear; y <= endYear; y++) {
    const t = y - baseYear;
    // Physical damages scale up over time as warming intensifies
    // Use linear ramp: full damage at endYear, fraction at earlier years
    const timeScale = horizon > 0 ? (y - baseYear) / horizon : 1;
    const yearDamage = annualDamage * timeScale;
    physicalNPV += yearDamage / Math.pow(1 + wacc, t);
  }

  // ── Net CVaR ──
  const netCVaR = policyNPV - techNPV + physicalNPV;
  const cvarPercent = ev > 0 ? (netCVaR / ev) * 100 : 0;
  const cls = classifyCVaR(Math.abs(cvarPercent));

  return {
    totalCVaRPercent: Math.round(cvarPercent * 100) / 100,
    totalCVaRAbsolute: Math.round(netCVaR * 100) / 100,
    policyRisk: { npv: Math.round(policyNPV * 100) / 100, annualCosts: policyAnnual },
    techOpportunity: { npv: Math.round(techNPV * 100) / 100, annualBenefits: techAnnual },
    physicalRisk: { estimatedDamage: Math.round(physicalNPV * 100) / 100, temperatureBasis: temp },
    enterpriseValue: Math.round(ev * 100) / 100,
    classification: cls.label,
    classificationColor: cls.color,
  };
}
