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
