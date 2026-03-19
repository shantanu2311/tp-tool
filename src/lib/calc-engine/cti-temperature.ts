/**
 * CTI Pillar 1: Temperature Alignment Score (TAS)
 *
 * Multi-method temperature estimation combining 3 independent approaches:
 *   1. Budget Ratio — Fair-share carbon budget with Contraction & Convergence allocation
 *   2. Cumulative Benchmark Divergence (CBD) — Area-between-curves vs scenario pathways
 *   3. Rate of Reduction — Compound annual intensity rate vs sector pathway rates
 *
 * Includes Monte Carlo uncertainty quantification (1000 iterations) and
 * multi-dimensional sensitivity analysis.
 *
 * Academic sources:
 *   - IPCC AR6 WG1 (2021): Carbon budgets, TCRE
 *   - Forster et al. (2023), Nature Climate Change: Updated remaining carbon budgets
 *   - IIGCC Cumulative Benchmark Divergence (Feb 2024): CBD methodology
 *   - GFANZ Portfolio Alignment Team (2021): Fair-share allocation framework
 *   - SBTi Steel Guidance v1.0 (Jul 2023): 4.2% sector pathway rate
 *
 * @module cti-temperature
 */

import type { PeriodResult, ScenarioData, TASResult, TASMethodResult } from './types';
import {
  CARBON_BUDGET_AT_BASE_YEAR_GT,
  CARBON_BUDGET_BASE_YEAR,
  GLOBAL_ANNUAL_EMISSIONS_GT,
  STEEL_SECTOR_EMISSIONS_SHARE,
  GLOBAL_STEEL_PRODUCTION_GT,
  GLOBAL_STEEL_BASELINE_INTENSITY,
} from './constants';

// ═══════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════

/** Method weights for combined TAS */
const METHOD_WEIGHTS = { budget: 0.45, cbd: 0.35, rate: 0.20 };

/** Monte Carlo iterations */
const MC_ITERATIONS = 1000;

/** Reference pathway rates: {annualIntensityReduction → impliedTemperature} */
const PATHWAY_RATE_BENCHMARKS = [
  { rate: 0.060, temp: 1.3 },  // Beyond NZE (aggressive)
  { rate: 0.042, temp: 1.5 },  // SBTi 1.5°C steel sector (SBTi Steel Guidance v1.0)
  { rate: 0.030, temp: 1.7 },  // IEA APS / SBTi well-below 2°C
  { rate: 0.020, temp: 2.0 },  // 2°C-aligned pathway
  { rate: 0.010, temp: 2.5 },  // IEA STEPS approximate
  { rate: 0.005, temp: 3.0 },  // Minimal effort
  { rate: 0.000, temp: 3.5 },  // No reduction
  { rate: -0.01, temp: 4.5 },  // Increasing emissions
];

// ═══════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════

function interpolateAtYear(
  periods: PeriodResult[],
  year: number,
  field: 'companyIntensity' | 'totalProduction',
): number {
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

function interpolateScenarioIntensity(scenario: ScenarioData, year: number): number {
  const pts = scenario.dataPoints;
  if (pts.length === 0) return GLOBAL_STEEL_BASELINE_INTENSITY;
  const sorted = [...pts].sort((a, b) => a.year - b.year);
  if (year <= sorted[0].year) return sorted[0].intensity;
  if (year >= sorted[sorted.length - 1].year) return sorted[sorted.length - 1].intensity;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (year >= sorted[i].year && year <= sorted[i + 1].year) {
      const t = (year - sorted[i].year) / (sorted[i + 1].year - sorted[i].year);
      return sorted[i].intensity + t * (sorted[i + 1].intensity - sorted[i].intensity);
    }
  }
  return sorted[sorted.length - 1].intensity;
}

function piecewiseInterpolate(x: number, points: { x: number; y: number }[]): number {
  if (points.length === 0) return 3.0;
  const sorted = [...points].sort((a, b) => a.x - b.x);
  if (x <= sorted[0].x) return sorted[0].y;
  if (x >= sorted[sorted.length - 1].x) return sorted[sorted.length - 1].y;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (x >= sorted[i].x && x <= sorted[i + 1].x) {
      const t = (x - sorted[i].x) / (sorted[i + 1].x - sorted[i].x);
      return sorted[i].y + t * (sorted[i + 1].y - sorted[i].y);
    }
  }
  return sorted[sorted.length - 1].y;
}

/** Simple seeded PRNG for reproducible Monte Carlo (Mulberry32) */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Uniform random in [lo, hi] from PRNG */
function uniformRand(rng: () => number, lo: number, hi: number): number {
  return lo + rng() * (hi - lo);
}

// ═══════════════════════════════════════════════════════════════════
//  Classification
// ═══════════════════════════════════════════════════════════════════

function classifyTemperature(temp: number): { label: string; color: string } {
  // NGFS-aligned classification bands
  if (temp <= 1.5) return { label: 'Paris Aligned', color: '#065f46' };
  if (temp <= 1.75) return { label: 'Well Below 2°C', color: '#059669' };
  if (temp <= 2.0) return { label: '2°C Aligned', color: '#84cc16' };
  if (temp <= 2.5) return { label: 'Transition Risk', color: '#f59e0b' };
  if (temp <= 3.0) return { label: 'High Risk', color: '#f97316' };
  return { label: 'Severely Misaligned', color: '#ef4444' };
}

// ═══════════════════════════════════════════════════════════════════
//  Method 1: Budget Ratio with Contraction & Convergence
// ═══════════════════════════════════════════════════════════════════

interface BudgetParams {
  budgetBaseGt?: number;      // override carbon budget (for MC perturbation)
  annualDepletionGt?: number; // override depletion rate
  sectorShare?: number;       // override sector share
  productionMultiplier?: number; // scale production trajectory
}

function calcBudgetRatioMethod(
  periods: PeriodResult[],
  params: BudgetParams = {},
): TASResult['methods']['budgetRatio'] {
  const sorted = [...periods].sort((a, b) => a.year - b.year);
  const baseYear = sorted[0].year;
  const endYear = Math.max(sorted[sorted.length - 1].year, 2050);
  const globalProductionMt = GLOBAL_STEEL_PRODUCTION_GT * 1000;

  const budgetBaseGt = params.budgetBaseGt ?? CARBON_BUDGET_AT_BASE_YEAR_GT;
  const annualDepletion = params.annualDepletionGt ?? GLOBAL_ANNUAL_EMISSIONS_GT;
  const sectorShare = params.sectorShare ?? STEEL_SECTOR_EMISSIONS_SHARE;
  const prodMult = params.productionMultiplier ?? 1.0;

  // Time-adjusted remaining budget at base year
  const elapsedYears = Math.max(0, baseYear - CARBON_BUDGET_BASE_YEAR);
  const remainingBudgetGt = Math.max(0, budgetBaseGt - elapsedYears * annualDepletion);

  // Contraction & Convergence allocation: annual production-weighted share
  // Budget is allocated year-by-year based on that year's production share
  let cumulativeEmissions = 0;
  let cumulativeBudget = 0;
  const annualBudgetAllocation: number[] = [];

  const horizon = endYear - baseYear;

  for (let y = baseYear; y <= endYear; y++) {
    const intensity = interpolateAtYear(periods, y, 'companyIntensity');
    const production = interpolateAtYear(periods, y, 'totalProduction') * prodMult;
    const emissions = intensity * production;
    cumulativeEmissions += emissions;

    // Annual budget allocation: company's share of what's left of the global budget
    // Distributed linearly across years, weighted by production share
    const companyShare = production / globalProductionMt;
    const annualGlobalBudgetMt = (remainingBudgetGt * 1000 * sectorShare) / Math.max(1, horizon);
    const annualCompanyBudget = annualGlobalBudgetMt * companyShare;
    cumulativeBudget += annualCompanyBudget;
    annualBudgetAllocation.push(Math.round(annualCompanyBudget * 100) / 100);
  }

  const overshoot = cumulativeEmissions - cumulativeBudget;
  const budgetRatio = cumulativeBudget > 0 ? cumulativeEmissions / cumulativeBudget : 999;
  const rawTemp = 1.5 * budgetRatio;
  const temperature = Math.min(6.0, Math.max(1.0, rawTemp));

  return {
    temperature: Math.round(temperature * 100) / 100,
    details: `Budget ratio: ${budgetRatio.toFixed(2)} (cumulative ${cumulativeEmissions.toFixed(0)} Mt vs budget ${cumulativeBudget.toFixed(0)} Mt)`,
    budgetMt: Math.round(cumulativeBudget * 100) / 100,
    cumulativeMt: Math.round(cumulativeEmissions * 100) / 100,
    overshootMt: Math.round(overshoot * 100) / 100,
    annualBudgetAllocation,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Method 2: Cumulative Benchmark Divergence (IIGCC CBD)
// ═══════════════════════════════════════════════════════════════════

function calcBenchmarkDivergence(
  periods: PeriodResult[],
  scenarios: ScenarioData[],
): TASResult['methods']['benchmarkDivergence'] {
  const sorted = [...periods].sort((a, b) => a.year - b.year);
  const baseYear = sorted[0].year;
  const endYear = Math.max(sorted[sorted.length - 1].year, 2050);

  if (scenarios.length === 0) {
    return {
      temperature: 3.0,
      details: 'No scenario data available for benchmark divergence',
      closestScenario: 'None',
      divergenceByScenario: [],
    };
  }

  // For each scenario, compute cumulative benchmark divergence (CBD)
  // CBD = SUM(companyEmissions_y - benchmarkEmissions_y) for each year
  const divergenceResults: { scenario: string; temperature: number; divergenceArea: number }[] = [];

  for (const sc of scenarios) {
    let cbd = 0;
    for (let y = baseYear; y <= endYear; y++) {
      const companyIntensity = interpolateAtYear(periods, y, 'companyIntensity');
      const companyProduction = interpolateAtYear(periods, y, 'totalProduction');
      const companyEmissions = companyIntensity * companyProduction;

      // Benchmark: what if this company followed the scenario's intensity path?
      const benchmarkIntensity = interpolateScenarioIntensity(sc, y);
      const benchmarkEmissions = benchmarkIntensity * companyProduction;

      cbd += (companyEmissions - benchmarkEmissions);
    }

    divergenceResults.push({
      scenario: sc.shortName,
      temperature: sc.temperatureOutcome,
      divergenceArea: Math.round(cbd * 100) / 100,
    });
  }

  // Sort by temperature for interpolation
  const sortedDiv = [...divergenceResults].sort((a, b) => a.temperature - b.temperature);

  // Find where CBD crosses zero (company matches the benchmark exactly)
  // CBD < 0 means company is BETTER than benchmark (lower cumulative)
  // CBD > 0 means company is WORSE than benchmark (higher cumulative)
  let temperature = 3.0; // default if no crossing found
  let closestScenario = 'None';

  // Find closest to zero divergence
  let minAbsDiv = Infinity;
  for (const d of sortedDiv) {
    if (Math.abs(d.divergenceArea) < minAbsDiv) {
      minAbsDiv = Math.abs(d.divergenceArea);
      closestScenario = d.scenario;
      temperature = d.temperature;
    }
  }

  // Try to interpolate between two scenarios where CBD changes sign
  for (let i = 0; i < sortedDiv.length - 1; i++) {
    const a = sortedDiv[i];
    const b = sortedDiv[i + 1];
    if ((a.divergenceArea <= 0 && b.divergenceArea > 0) || (a.divergenceArea > 0 && b.divergenceArea <= 0)) {
      // Linear interpolation to find zero-crossing
      const t = Math.abs(a.divergenceArea) / (Math.abs(a.divergenceArea) + Math.abs(b.divergenceArea));
      temperature = a.temperature + t * (b.temperature - a.temperature);
      closestScenario = `${a.scenario}↔${b.scenario}`;
      break;
    }
  }

  // If all divergences are negative (company beats all scenarios), use the best scenario
  if (sortedDiv.every(d => d.divergenceArea <= 0)) {
    temperature = Math.max(1.0, sortedDiv[0].temperature - 0.3);
    closestScenario = `Better than ${sortedDiv[0].scenario}`;
  }
  // If all positive (company worse than all), use worst scenario + penalty
  if (sortedDiv.every(d => d.divergenceArea > 0)) {
    const worst = sortedDiv[sortedDiv.length - 1];
    temperature = Math.min(6.0, worst.temperature + 0.5);
    closestScenario = `Worse than ${worst.scenario}`;
  }

  temperature = Math.round(Math.min(6.0, Math.max(1.0, temperature)) * 100) / 100;

  return {
    temperature,
    details: `CBD analysis across ${scenarios.length} scenarios. Closest match: ${closestScenario} (${temperature}°C)`,
    closestScenario,
    divergenceByScenario: divergenceResults,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Method 3: Rate of Reduction Analysis
// ═══════════════════════════════════════════════════════════════════

function calcRateOfReduction(periods: PeriodResult[]): TASResult['methods']['rateOfReduction'] {
  const sorted = [...periods].sort((a, b) => a.year - b.year);

  if (sorted.length < 2 || sorted[0].companyIntensity <= 0) {
    return { temperature: 4.0, details: 'Insufficient data', annualRate: 0, comparedTo: 'None' };
  }

  const base = sorted[0];
  const lt = sorted[sorted.length - 1];
  const years = lt.year - base.year;

  // Compound annual intensity reduction rate
  const annualRate = years > 0
    ? 1 - Math.pow(lt.companyIntensity / base.companyIntensity, 1 / years)
    : 0;

  // Interpolate against reference pathway rates
  const ratePoints = PATHWAY_RATE_BENCHMARKS.map(b => ({ x: b.rate, y: b.temp }));
  const temperature = Math.round(Math.min(6.0, Math.max(1.0, piecewiseInterpolate(annualRate, ratePoints))) * 100) / 100;

  // Find which pathway the company is closest to
  let comparedTo = 'No reduction';
  if (annualRate >= 0.042) comparedTo = 'SBTi 1.5°C steel';
  else if (annualRate >= 0.030) comparedTo = 'IEA APS (~1.7°C)';
  else if (annualRate >= 0.020) comparedTo = '2°C pathway';
  else if (annualRate >= 0.010) comparedTo = 'IEA STEPS (~2.5°C)';
  else if (annualRate >= 0.005) comparedTo = 'Minimal effort';
  else if (annualRate > 0) comparedTo = 'Below any credible pathway';

  return {
    temperature,
    details: `Annual intensity reduction: ${(annualRate * 100).toFixed(2)}%/yr → comparable to ${comparedTo}`,
    annualRate: Math.round(annualRate * 10000) / 100,
    comparedTo,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Monte Carlo Uncertainty Quantification
// ═══════════════════════════════════════════════════════════════════

function calcMonteCarloUncertainty(
  periods: PeriodResult[],
): TASResult['uncertainty'] {
  const rng = mulberry32(42); // reproducible seed
  const temperatures: number[] = [];

  for (let i = 0; i < MC_ITERATIONS; i++) {
    // Perturb parameters
    const budgetPerturbation = uniformRand(rng, 0.80, 1.20);  // ±20%
    const depletionPerturbation = uniformRand(rng, 0.90, 1.10); // ±10%
    const sectorPerturbation = uniformRand(rng, 0.85, 1.15);   // ±15%
    const prodPerturbation = uniformRand(rng, 0.95, 1.05);     // ±5%

    const result = calcBudgetRatioMethod(periods, {
      budgetBaseGt: CARBON_BUDGET_AT_BASE_YEAR_GT * budgetPerturbation,
      annualDepletionGt: GLOBAL_ANNUAL_EMISSIONS_GT * depletionPerturbation,
      sectorShare: STEEL_SECTOR_EMISSIONS_SHARE * sectorPerturbation,
      productionMultiplier: prodPerturbation,
    });

    temperatures.push(result.temperature);
  }

  // Sort for percentile computation
  temperatures.sort((a, b) => a - b);

  const median = temperatures[Math.floor(MC_ITERATIONS * 0.50)];
  const p10 = temperatures[Math.floor(MC_ITERATIONS * 0.10)];
  const p90 = temperatures[Math.floor(MC_ITERATIONS * 0.90)];

  // Build histogram (0.25°C buckets from 1.0 to 6.0)
  const distribution: TASResult['uncertainty']['distribution'] = [];
  for (let bucket = 1.0; bucket <= 6.0; bucket += 0.25) {
    const count = temperatures.filter(t => t >= bucket && t < bucket + 0.25).length;
    distribution.push({ tempBucket: bucket, count });
  }

  return {
    median: Math.round(median * 100) / 100,
    p10: Math.round(p10 * 100) / 100,
    p90: Math.round(p90 * 100) / 100,
    confidence: `${p10.toFixed(1)}°C – ${p90.toFixed(1)}°C (80% confidence)`,
    distribution,
    iterations: MC_ITERATIONS,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Multi-Dimensional Sensitivity Analysis
// ═══════════════════════════════════════════════════════════════════

function calcMultiSensitivity(periods: PeriodResult[]): TASResult['sensitivity'] {
  const sorted = [...periods].sort((a, b) => a.year - b.year);
  if (sorted.length < 2) {
    return { intensity: [], production: [], budget: [] };
  }

  const baseIntensity = sorted[0].companyIntensity;
  const baseYear = sorted[0].year;
  const endYear = Math.max(sorted[sorted.length - 1].year, 2050);

  // 1. Intensity sensitivity: what if we add 0-10% additional annual reduction?
  const intensityResults: TASResult['sensitivity']['intensity'] = [];
  for (let rate = 0; rate <= 0.10; rate += 0.005) {
    // Create modified periods with additional reduction
    const modifiedPeriods = sorted.map(p => ({
      ...p,
      companyIntensity: Math.max(0, p.companyIntensity - baseIntensity * rate * (p.year - baseYear)),
    }));
    const r = calcBudgetRatioMethod(modifiedPeriods);
    intensityResults.push({
      additionalRate: Math.round(rate * 10000) / 100,
      temperature: r.temperature,
    });
  }

  // 2. Production sensitivity: what if production grows/shrinks by various factors?
  const productionResults: TASResult['sensitivity']['production'] = [];
  for (const factor of [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]) {
    const r = calcBudgetRatioMethod(periods, { productionMultiplier: factor });
    productionResults.push({ growthFactor: factor, temperature: r.temperature });
  }

  // 3. Budget sensitivity: what if the carbon budget is different?
  const budgetResults: TASResult['sensitivity']['budget'] = [];
  for (const budgetGt of [300, 400, 500, 600, 700, 800]) {
    const r = calcBudgetRatioMethod(periods, { budgetBaseGt: budgetGt });
    budgetResults.push({ budgetGt, temperature: r.temperature });
  }

  return {
    intensity: intensityResults,
    production: productionResults,
    budget: budgetResults,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Main Orchestrator: calcTAS()
// ═══════════════════════════════════════════════════════════════════

/**
 * Calculate the Temperature Alignment Score using 3 independent methods,
 * Monte Carlo uncertainty, and multi-dimensional sensitivity analysis.
 *
 * @param periods - Company period results from the main calculation engine
 * @param scenarios - IEA/NGFS climate scenario data (optional, for CBD method)
 */
export function calcTAS(
  periods: PeriodResult[],
  scenarios: ScenarioData[] = [],
): TASResult {
  const sorted = [...periods].sort((a, b) => a.year - b.year);

  if (sorted.length === 0) {
    const cls = classifyTemperature(999);
    return {
      temperature: 0, classification: 'No Data', classificationColor: '#9ca3af',
      methods: {
        budgetRatio: { temperature: 0, details: 'No data', budgetMt: 0, cumulativeMt: 0, overshootMt: 0, annualBudgetAllocation: [] },
        benchmarkDivergence: { temperature: 0, details: 'No data', closestScenario: 'None', divergenceByScenario: [] },
        rateOfReduction: { temperature: 0, details: 'No data', annualRate: 0, comparedTo: 'None' },
      },
      uncertainty: { median: 0, p10: 0, p90: 0, confidence: 'No data', distribution: [], iterations: 0 },
      yearlyBreakdown: [], sensitivity: { intensity: [], production: [], budget: [] },
      intensityNote: undefined, productionGrowthFactor: 1, methodWeights: METHOD_WEIGHTS,
      impliedTemperature: 0, companyBudgetMt: 0, cumulativeEmissionsMt: 0, overshootMt: 0,
    };
  }

  // ── Run 3 independent methods ──
  const budgetResult = calcBudgetRatioMethod(periods);
  const cbdResult = calcBenchmarkDivergence(periods, scenarios);
  const rateResult = calcRateOfReduction(periods);

  // ── Combined TAS (weighted average) ──
  const combinedTemp = Math.round((
    METHOD_WEIGHTS.budget * budgetResult.temperature +
    METHOD_WEIGHTS.cbd * cbdResult.temperature +
    METHOD_WEIGHTS.rate * rateResult.temperature
  ) * 100) / 100;

  const temperature = Math.min(6.0, Math.max(1.0, combinedTemp));
  const cls = classifyTemperature(temperature);

  // ── Monte Carlo uncertainty ──
  const uncertainty = calcMonteCarloUncertainty(periods);

  // ── Enhanced yearly breakdown ──
  const baseYear = sorted[0].year;
  const endYear = Math.max(sorted[sorted.length - 1].year, 2050);
  const yearlyBreakdown: TASResult['yearlyBreakdown'] = [];
  let cumulative = 0;
  let budgetUsed = 0;

  for (let y = baseYear; y <= endYear; y++) {
    const intensity = interpolateAtYear(periods, y, 'companyIntensity');
    const production = interpolateAtYear(periods, y, 'totalProduction');
    const emissions = intensity * production;
    cumulative += emissions;

    const idx = y - baseYear;
    const annualBudget = budgetResult.annualBudgetAllocation[idx] ?? 0;
    budgetUsed += annualBudget;

    yearlyBreakdown.push({
      year: y,
      emissions: Math.round(emissions * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
      budgetRemaining: Math.round((budgetResult.budgetMt - budgetUsed) * 100) / 100,
      overshoot: Math.round((cumulative - budgetUsed) * 100) / 100,
      intensity: Math.round(intensity * 10000) / 10000,
      production: Math.round(production * 100) / 100,
    });
  }

  // ── Multi-dimensional sensitivity ──
  const sensitivity = calcMultiSensitivity(periods);

  // ── Context notes ──
  const ltProduction = sorted[sorted.length - 1].totalProduction;
  const baseProduction = sorted[0].totalProduction;
  const productionGrowthFactor = baseProduction > 0
    ? Math.round((ltProduction / baseProduction) * 100) / 100
    : 1;

  const baseIntensity = sorted[0].companyIntensity;
  const ltIntensity = sorted[sorted.length - 1].companyIntensity;
  const intensityReduction = baseIntensity > 0
    ? Math.round(((baseIntensity - ltIntensity) / baseIntensity) * 1000) / 10
    : 0;

  let intensityNote: string | undefined;
  if (productionGrowthFactor > 1.2 && temperature > 2.5 && intensityReduction > 50) {
    intensityNote = `Intensity drops ${intensityReduction}% but production grows ${Math.round((productionGrowthFactor - 1) * 100)}%. ` +
      `Budget method (${budgetResult.temperature}°C) penalizes absolute growth; ` +
      `Rate method (${rateResult.temperature}°C) rewards intensity improvement. ` +
      `The combined TAS balances both perspectives.`;
  } else if (temperature <= 2.0 && intensityReduction < 30) {
    intensityNote = `Low TAS achieved primarily through small production scale rather than deep decarbonization.`;
  }

  // ── Method divergence note ──
  const maxDivergence = Math.max(
    Math.abs(budgetResult.temperature - cbdResult.temperature),
    Math.abs(budgetResult.temperature - rateResult.temperature),
    Math.abs(cbdResult.temperature - rateResult.temperature),
  );
  if (maxDivergence > 1.0) {
    const divergeNote = `Methods diverge by ${maxDivergence.toFixed(1)}°C: Budget=${budgetResult.temperature}°C, CBD=${cbdResult.temperature}°C, Rate=${rateResult.temperature}°C. This typically indicates production growth outpacing intensity reduction.`;
    intensityNote = intensityNote ? intensityNote + ' ' + divergeNote : divergeNote;
  }

  return {
    temperature,
    classification: cls.label,
    classificationColor: cls.color,
    methods: {
      budgetRatio: budgetResult,
      benchmarkDivergence: cbdResult,
      rateOfReduction: rateResult,
    },
    uncertainty,
    yearlyBreakdown,
    sensitivity,
    intensityNote,
    productionGrowthFactor,
    methodWeights: METHOD_WEIGHTS,

    // Backward compatibility
    impliedTemperature: temperature,
    companyBudgetMt: budgetResult.budgetMt,
    cumulativeEmissionsMt: budgetResult.cumulativeMt,
    overshootMt: budgetResult.overshootMt,
  };
}
