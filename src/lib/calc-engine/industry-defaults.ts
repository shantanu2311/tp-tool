/**
 * Steel industry average defaults by region.
 * Sources: World Steel Association, IEA Iron & Steel Roadmap, Bloomberg sector data.
 * Used when company-specific financial data is not provided.
 */

export interface CompanyFinancials {
  enterpriseValue?: number;        // USD millions
  annualRevenue?: number;           // USD millions
  revenueLowCarbonPercent: number;  // 0-100
  annualOpex?: number;              // USD millions
  energyCostPercent: number;        // 0-100 (% of OPEX)
  ebitdaMargin: number;             // 0-100 (%)
  capexTotal?: number;              // USD millions
  capexLowCarbonPercent: number;    // 0-100 (% of total CAPEX)
  hasBoardClimateOversight: boolean;
  emissionTargetType: 'none' | 'internal' | 'public' | 'science_based';
  netZeroYear?: number;
  interimTargetYear?: number;
  interimTargetReduction?: number;  // 0-100 (%)
  wacc: number;                     // 0-100 (%)
  greenPremiumPercent: number;      // 0-100 (%)
  currentCarbonPrice: number;       // USD/tCO2
  region: string;
}

interface RegionalDefaults {
  revenuePerTonne: number;      // USD/tonne
  opexRevenueRatio: number;     // 0-1
  energyCostPercent: number;    // 0-100
  ebitdaMargin: number;         // 0-100
  capexRevenueRatio: number;    // 0-1
  capexLowCarbonPercent: number; // 0-100
  revenueLowCarbonPercent: number; // 0-100
  boardClimateOversight: boolean;
  emissionTargetType: CompanyFinancials['emissionTargetType'];
  netZeroYear?: number;
  wacc: number;
  greenPremiumPercent: number;
  currentCarbonPrice: number;
}

const REGIONAL_DEFAULTS: Record<string, RegionalDefaults> = {
  global: {
    revenuePerTonne: 550,
    opexRevenueRatio: 0.85,
    energyCostPercent: 25,
    ebitdaMargin: 15,
    capexRevenueRatio: 0.06,
    capexLowCarbonPercent: 5,
    revenueLowCarbonPercent: 5,
    boardClimateOversight: false,
    emissionTargetType: 'none',
    wacc: 10,
    greenPremiumPercent: 20,
    currentCarbonPrice: 0,
  },
  india: {
    revenuePerTonne: 500,
    opexRevenueRatio: 0.87,
    energyCostPercent: 28,
    ebitdaMargin: 13,
    capexRevenueRatio: 0.10,
    capexLowCarbonPercent: 3,
    revenueLowCarbonPercent: 2,
    boardClimateOversight: false,
    emissionTargetType: 'none',
    netZeroYear: 2070,
    wacc: 13,
    greenPremiumPercent: 15,
    currentCarbonPrice: 0,
  },
  eu: {
    revenuePerTonne: 650,
    opexRevenueRatio: 0.83,
    energyCostPercent: 22,
    ebitdaMargin: 12,
    capexRevenueRatio: 0.05,
    capexLowCarbonPercent: 15,
    revenueLowCarbonPercent: 8,
    boardClimateOversight: true,
    emissionTargetType: 'public',
    netZeroYear: 2050,
    wacc: 9,
    greenPremiumPercent: 25,
    currentCarbonPrice: 80,
  },
  us: {
    revenuePerTonne: 700,
    opexRevenueRatio: 0.82,
    energyCostPercent: 20,
    ebitdaMargin: 18,
    capexRevenueRatio: 0.05,
    capexLowCarbonPercent: 8,
    revenueLowCarbonPercent: 5,
    boardClimateOversight: false,
    emissionTargetType: 'internal',
    netZeroYear: 2050,
    wacc: 10,
    greenPremiumPercent: 20,
    currentCarbonPrice: 0,
  },
  china: {
    revenuePerTonne: 480,
    opexRevenueRatio: 0.88,
    energyCostPercent: 30,
    ebitdaMargin: 10,
    capexRevenueRatio: 0.07,
    capexLowCarbonPercent: 4,
    revenueLowCarbonPercent: 3,
    boardClimateOversight: false,
    emissionTargetType: 'internal',
    netZeroYear: 2060,
    wacc: 11,
    greenPremiumPercent: 15,
    currentCarbonPrice: 10,
  },
  japan: {
    revenuePerTonne: 680,
    opexRevenueRatio: 0.84,
    energyCostPercent: 23,
    ebitdaMargin: 14,
    capexRevenueRatio: 0.05,
    capexLowCarbonPercent: 10,
    revenueLowCarbonPercent: 6,
    boardClimateOversight: true,
    emissionTargetType: 'public',
    netZeroYear: 2050,
    wacc: 8,
    greenPremiumPercent: 25,
    currentCarbonPrice: 5,
  },
};

/**
 * Returns company financial defaults for a given region.
 * Production (MTPA) is used to auto-estimate revenue and derived values.
 */
export function getDefaults(region: string, productionMtpa?: number): CompanyFinancials {
  const r = REGIONAL_DEFAULTS[region] ?? REGIONAL_DEFAULTS.global;
  const prod = productionMtpa ?? 1; // default 1 MTPA if not provided
  const revenue = prod * r.revenuePerTonne;

  return {
    enterpriseValue: revenue * 1.2, // rough EV/Revenue multiple
    annualRevenue: revenue,
    revenueLowCarbonPercent: r.revenueLowCarbonPercent,
    annualOpex: revenue * r.opexRevenueRatio,
    energyCostPercent: r.energyCostPercent,
    ebitdaMargin: r.ebitdaMargin,
    capexTotal: revenue * r.capexRevenueRatio,
    capexLowCarbonPercent: r.capexLowCarbonPercent,
    hasBoardClimateOversight: r.boardClimateOversight,
    emissionTargetType: r.emissionTargetType,
    netZeroYear: r.netZeroYear,
    wacc: r.wacc,
    greenPremiumPercent: r.greenPremiumPercent,
    currentCarbonPrice: r.currentCarbonPrice,
    region,
  };
}

/** Available regions for the dropdown */
export const REGIONS = [
  { value: 'global', label: 'Global' },
  { value: 'india', label: 'India' },
  { value: 'eu', label: 'European Union' },
  { value: 'us', label: 'United States' },
  { value: 'china', label: 'China' },
  { value: 'japan', label: 'Japan' },
];
