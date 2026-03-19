export interface LeverOptionData {
  id: string;
  name: string;
  factor: number;
  assumptionNote?: string;
  isDefault: boolean;
}

// ── CAPEX & Custom Types ──

/** Numeric CAPEX for calculations (Low/Mid/High in USD/tpa) */
export interface CapexNumeric {
  low: number;
  mid: number;
  high: number;
}

/** CAPEX scenario selection */
export type CapexScenario = 'low' | 'mid' | 'high';

/** Custom lever type determines how mitigation value is applied */
export type CustomLeverType = 'factor' | 'percentage' | 'delta';

export interface MethodData {
  id: string;
  name: string;
  baseCO2: number; // tCO2/tcs
  category: string;
  commercialStatus?: string;
  trl?: string;
  capex?: string;
  energyDemand?: string;
  deploymentTimeframe?: string;
  description?: string;
  applicableLevers: Set<string>; // set of lever IDs applicable to this method
  isCustom?: boolean;
  capexNumeric?: CapexNumeric; // numeric CAPEX for calculations (Low/Mid/High)
  references?: string;
  baselineAssumptions?: string;
}

export interface LeverDefinition {
  id: string;
  name: string;
  displayName: string;
  displayOrder: number;
  maxReduction: number; // 0-1: max emission reduction at 100% slider (e.g., 0.90 = 90% max reduction)
  options: LeverOptionData[];
  isCustom?: boolean;
  leverType?: CustomLeverType; // undefined = multiplicative (predefined), explicit for custom
  applicableMethodIds?: Set<string>; // only on custom levers: which methods this applies to
  category?: string;
  description?: string;
  assumptions?: string;
}

export interface PeriodMethodInput {
  methodId: string;
  methodName: string;
  share: number; // 0-1 (percentage as decimal)
  leverSelections: Record<string, string>; // leverId -> selected option ID
}

export interface PeriodInput {
  label: string; // "Base", "ST", "MT", "LT"
  year: number;
  totalProduction: number; // MTPA
  methods: PeriodMethodInput[];
}

export interface PeriodMethodResult {
  methodId: string;
  methodName: string;
  share: number;
  absoluteProduction: number;
  baseCO2Intensity: number;
  baseCO2Absolute: number;
  leverFactors: number[]; // ordered by lever displayOrder
  finalIntensity: number;
  finalAbsoluteEmissions: number;
}

export interface PeriodResult {
  label: string;
  year: number;
  totalProduction: number;
  methods: PeriodMethodResult[];
  companyIntensity: number;
  estimatedEmissions: number;
}

export interface WaterfallMethodRow {
  methodId: string;
  methodName: string;
  dueToMethodChange: number;
  dueToLeverChange: number;
  dueToProportionChange: number;
  net: number;
}

export interface WaterfallTransition {
  fromLabel: string;
  toLabel: string;
  methodRows: WaterfallMethodRow[];
  totalDueToMethod: number;
  totalDueToLever: number;
  totalDueToProportion: number;
  totalNet: number;
}

export interface LeverAttributionRow {
  methodId: string;
  methodName: string;
  leverContributions: number[]; // one per lever, ordered by displayOrder
}

export interface LeverWaterfallTransition {
  fromLabel: string;
  toLabel: string;
  leverTotals: number[]; // aggregated across methods, one per lever
  methodRows: LeverAttributionRow[];
}

export interface BenchmarkPathway {
  id: string;
  name: string;
  annualRates: Record<number, number>; // year -> annual reduction rate
}

export interface TrajectoryPoint {
  year: number;
  actual: number | null;
  interpolated: number | null;
  emissions: number | null;
  bau: number | null;                    // BAU: base year intensity held constant
  benchmarks: Record<string, number>; // pathwayId -> intensity
}

export interface PathwayComparisonRow {
  pathwayId: string;
  pathwayName: string;
  milestoneIntensities: Record<string, number>; // "ST"/"MT"/"LT" -> benchmark intensity
  alignmentRatios: Record<string, number>; // "ST"/"MT"/"LT" -> ratio
}

export interface FullCalculationResult {
  periods: PeriodResult[];
  waterfallTransitions: WaterfallTransition[];
  leverWaterfallTransitions: LeverWaterfallTransition[];
  trajectory: TrajectoryPoint[];
  pathwayComparisons: PathwayComparisonRow[];
  capex?: CapexResult;
}

export interface ScenarioInput {
  sectorId: string;
  periods: PeriodInput[];
  benchmarkPathways: BenchmarkPathway[];
  leverDefinitions: LeverDefinition[];
  methodDataMap: Record<string, MethodData>; // methodId -> MethodData
  capexScenario?: CapexScenario;
  capexOverrides?: Record<string, CapexNumeric>; // methodId -> numeric CAPEX overrides
}

// ── Scenario Analysis Types (Phase 2) ──

export interface ScenarioFamilyData {
  id: string;
  name: string; // 'IEA', 'NGFS'
  source: string;
  description?: string;
  version?: string;
  scenarios: ScenarioData[];
}

export interface ScenarioData {
  id: string;
  familyName: string;
  name: string;
  shortName: string;
  temperatureOutcome: number;
  riskCategory?: 'orderly' | 'disorderly' | 'hot_house';
  description?: string;
  isDefault: boolean;
  dataPoints: { year: number; intensity: number }[];
  carbonPrices: { year: number; priceUSD: number }[];
}

export interface ScenarioGapResult {
  scenarioId: string;
  scenarioName: string;
  milestones: {
    year: number;
    companyIntensity: number;
    scenarioIntensity: number;
    gapAbsolute: number;
    gapPercent: number;
    alignmentStatus: 'aligned' | 'at_risk' | 'misaligned';
  }[];
}

// ── Scenario Analysis Results ──

export interface ScenarioAnalysisResult {
  gaps: ScenarioGapResult[];
  accelerationRates: AccelerationResult[];
  carbonBudget: CarbonBudgetResult;
  carbonCosts: CarbonCostResult[];
}

export interface AccelerationResult {
  scenarioId: string;
  scenarioName: string;
  periods: {
    fromYear: number;
    toYear: number;
    requiredAnnualRate: number;
    currentRate: number;
    gapToClose: number;
  }[];
}

export interface CarbonBudgetResult {
  fairShareBudgetMt: number;
  cumulativeEmissionsMt: number;
  remainingBudgetMt: number;
  exhaustionYear: number | null;
  yearlyData: {
    year: number;
    annualEmissions: number;
    cumulative: number;
    budget: number;
  }[];
}

export interface CarbonCostResult {
  scenarioId: string;
  scenarioName: string;
  annualCosts: {
    year: number;
    emissions: number;
    pricePerTonne: number;
    totalCost: number;
  }[];
  cumulativeCost: number;
}

// ── ITR / Resilience Assessment Results ──

export interface ITRResult {
  impliedTemperature: number;
  classification: string;
  classificationColor: string;
  companyBudgetMt: number;
  cumulativeEmissionsMt: number;
  overshootMt: number;
  yearlyBreakdown: { year: number; emissions: number; cumulative: number }[];
  sensitivity: { rateChange: number; resultingTemp: number }[];
  /** Explains why ITR may differ from benchmark alignment */
  intensityNote?: string;
  /** Production growth factor (LT/Base production ratio) */
  productionGrowthFactor?: number;
}

// ── CTI Temperature Alignment Score (TAS) ──

export interface TASMethodResult {
  temperature: number;
  details: string;
}

export interface TASResult {
  /** Combined temperature from 3 methods (weighted average) */
  temperature: number;
  classification: string;
  classificationColor: string;

  /** Three independent calculation methods */
  methods: {
    budgetRatio: TASMethodResult & {
      budgetMt: number;
      cumulativeMt: number;
      overshootMt: number;
      annualBudgetAllocation: number[];
    };
    benchmarkDivergence: TASMethodResult & {
      closestScenario: string;
      divergenceByScenario: { scenario: string; temperature: number; divergenceArea: number }[];
    };
    rateOfReduction: TASMethodResult & {
      annualRate: number;
      comparedTo: string;
    };
  };

  /** Monte Carlo uncertainty quantification */
  uncertainty: {
    median: number;
    p10: number;
    p90: number;
    confidence: string;
    distribution: { tempBucket: number; count: number }[];
    iterations: number;
  };

  /** Enhanced yearly breakdown */
  yearlyBreakdown: {
    year: number;
    emissions: number;
    cumulative: number;
    budgetRemaining: number;
    overshoot: number;
    intensity: number;
    production: number;
  }[];

  /** Multi-dimensional sensitivity analysis */
  sensitivity: {
    intensity: { additionalRate: number; temperature: number }[];
    production: { growthFactor: number; temperature: number }[];
    budget: { budgetGt: number; temperature: number }[];
  };

  /** Context */
  intensityNote?: string;
  productionGrowthFactor: number;
  methodWeights: { budget: number; cbd: number; rate: number };

  /** Backward compatibility: maps to ITRResult fields */
  impliedTemperature: number;
  companyBudgetMt: number;
  cumulativeEmissionsMt: number;
  overshootMt: number;
}

export interface LCTResult {
  totalScore: number;
  classification: string;
  classificationColor: string;
  categories: {
    name: string;
    score: number;
    maxScore: number;
    description: string;
  }[];
}

export interface CTAResult {
  shade: 'dark_green' | 'green' | 'light_green' | 'yellow' | 'orange' | 'red';
  shadeLabel: string;
  shadeColor: string;
  weightedScore: number;
  criteria: {
    name: string;
    weight: number;
    score: number;
    weightedContribution: number;
    description: string;
  }[];
}

export interface CSAResult {
  totalScore: number;
  classification: string;
  classificationColor: string;
  dimensions: {
    name: string;
    weight: number;
    score: number;
    weightedContribution: number;
    description: string;
  }[];
}

export interface CVaRResult {
  totalCVaRPercent: number;
  totalCVaRAbsolute: number;
  policyRisk: {
    npv: number;
    annualCosts: { year: number; cost: number; discounted: number }[];
  };
  techOpportunity: {
    npv: number;
    annualBenefits: { year: number; benefit: number; discounted: number }[];
  };
  physicalRisk: {
    estimatedDamage: number;
    temperatureBasis: number;
  };
  enterpriseValue: number;
  classification: string;
  classificationColor: string;
}

// ── CAPEX Calculation Results ──

/** CAPEX for a single method transition within a period */
export interface MethodCapex {
  methodId: string;
  methodName: string;
  capacityChange: number;  // MTPA change
  capexPerTonne: number;   // USD/tpa (selected scenario)
  totalCapex: number;      // capacityChange * capexPerTonne (million USD)
}

/** CAPEX results for a single transition between periods */
export interface TransitionCapex {
  fromLabel: string;
  toLabel: string;
  methodCapex: MethodCapex[];
  totalCapex: number;
}

/** Aggregated CAPEX results across all transitions */
export interface CapexResult {
  transitions: TransitionCapex[];
  totalCapex: number;
  byTechnology: Record<string, number>; // methodId → total CAPEX across transitions
}
