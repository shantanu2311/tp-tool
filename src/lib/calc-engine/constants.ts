/**
 * Reference constants for climate transition calculations.
 * Sources: IPCC AR6, IEA Iron & Steel Roadmap, NGFS Phase V, GFANZ.
 */

/**
 * Global remaining carbon budget for 1.5°C at 50% probability (GtCO2).
 * IPCC AR6 WG1 Table SPM.2: ~500 GtCO2 from start of 2020.
 * Adjusted for elapsed emissions (~40 GtCO2/yr global).
 */
export const CARBON_BUDGET_BASE_YEAR = 2020;
export const CARBON_BUDGET_AT_BASE_YEAR_GT = 500; // GtCO2 from start of 2020
export const GLOBAL_ANNUAL_EMISSIONS_GT = 40; // approximate global CO2/yr for budget depletion

/** Time-adjusted remaining carbon budget from a given year */
export function getRemainingBudgetGt(fromYear: number): number {
  const elapsed = Math.max(0, fromYear - CARBON_BUDGET_BASE_YEAR);
  return Math.max(0, CARBON_BUDGET_AT_BASE_YEAR_GT - elapsed * GLOBAL_ANNUAL_EMISSIONS_GT);
}

/** Steel sector share of global CO2 emissions (~7%). IEA Iron & Steel Roadmap */
export const STEEL_SECTOR_EMISSIONS_SHARE = 0.07;

/**
 * Transient Climate Response to Cumulative Emissions (°C per GtCO2).
 * IPCC AR6 best estimate: 1.65°C per 1000 GtC = 0.00045 °C/GtCO2.
 * Updated from AR5 value of 0.000545.
 */
export const TCRE_FACTOR = 0.00045;

/** Default Weighted Average Cost of Capital for steel sector (10%). Industry average, ranges 8-14% */
export const DEFAULT_WACC = 0.10;

/** Green steel price premium (20%). Current market estimate, ranges 10-40% */
export const GREEN_STEEL_PREMIUM_PERCENT = 0.20;

/**
 * Physical risk damage function coefficient.
 * Howard & Sterner (2017): damagePct = 0.01145 × T²
 * At 3°C: 10.3% GDP loss. Replaces previous ad-hoc constants.
 */
export const DAMAGE_FUNCTION_COEFFICIENT = 0.01145;

/** Steel sector physical risk multiplier (1.2x average). Adjusted for energy intensity */
export const STEEL_PHYSICAL_RISK_MULTIPLIER = 1.2;

/** Global steel production 2022 (Gt/yr). World Steel Association */
export const GLOBAL_STEEL_PRODUCTION_GT = 1.9;

/** Global steel direct CO2 intensity 2022 baseline (tCO2/tcs). IEA */
export const GLOBAL_STEEL_BASELINE_INTENSITY = 1.4;
