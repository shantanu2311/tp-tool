/**
 * Reference constants for climate transition calculations.
 * Sources: IPCC AR6, IEA Iron & Steel Roadmap, NGFS Phase V, GFANZ.
 */

/** Global remaining carbon budget for 1.5°C at 50% probability (GtCO2). IPCC AR6 WG1 Table SPM.2 */
export const GLOBAL_REMAINING_CARBON_BUDGET_GT = 500;

/** Steel sector share of global CO2 emissions (~7%). IEA Iron & Steel Roadmap */
export const STEEL_SECTOR_EMISSIONS_SHARE = 0.07;

/** Transient Climate Response to Cumulative Emissions (°C per GtCO2). IPCC AR6, GFANZ recommendation */
export const TCRE_FACTOR = 0.000545;

/** Default Weighted Average Cost of Capital for steel sector (10%). Industry average, ranges 8-14% */
export const DEFAULT_WACC = 0.10;

/** Green steel price premium (20%). Current market estimate, ranges 10-40% */
export const GREEN_STEEL_PREMIUM_PERCENT = 0.20;

/** GDP damage at 3°C warming (10% GDP loss). NGFS Phase V damage function */
export const PHYSICAL_RISK_GDP_DAMAGE_3C = 0.10;

/** Steel sector physical risk multiplier (1.2x average). Adjusted for energy intensity */
export const STEEL_PHYSICAL_RISK_MULTIPLIER = 1.2;

/** Global steel production 2022 (Gt/yr). World Steel Association */
export const GLOBAL_STEEL_PRODUCTION_GT = 1.9;

/** Global steel direct CO2 intensity 2022 baseline (tCO2/tcs). IEA */
export const GLOBAL_STEEL_BASELINE_INTENSITY = 1.4;
