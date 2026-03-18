import type {
  ScenarioInput,
  FullCalculationResult,
  PeriodResult,
  CapexResult,
} from './types';
import { calcPeriod } from './method-intensity';
import { calcMethodWaterfall, calcLeverWaterfall } from './waterfall';
import { calcTrajectory } from './trajectory';
import { calcPathwayComparisons } from './pathway-comparison';
import { calcCapex } from './capex-calculator';

export type { ScenarioInput, FullCalculationResult } from './types';
export type * from './types';

/**
 * Main calculation orchestrator.
 * Takes a complete scenario input and produces all outputs:
 * - Period results (intensity, emissions per method)
 * - Method waterfall transitions
 * - Lever waterfall transitions
 * - Trajectory timeline
 * - Pathway comparisons
 * - CAPEX analysis (optional, when capexScenario provided)
 */
export function calculate(input: ScenarioInput): FullCalculationResult {
  const { periods: periodInputs, methodDataMap, leverDefinitions, benchmarkPathways } = input;

  // 1. Calculate each period
  const periods: PeriodResult[] = periodInputs.map((p) =>
    calcPeriod(p, methodDataMap, leverDefinitions)
  );

  // 2. Calculate waterfall transitions (all from Base: Base->ST, Base->MT, Base->LT)
  const waterfallTransitions = [];
  const leverWaterfallTransitions = [];
  const sortedLeverDefs = [...leverDefinitions].sort((a, b) => a.displayOrder - b.displayOrder);

  for (let i = 1; i < periods.length; i++) {
    waterfallTransitions.push(calcMethodWaterfall(periods[0], periods[i]));
    leverWaterfallTransitions.push(
      calcLeverWaterfall(periods[0], periods[i], leverDefinitions.length, sortedLeverDefs)
    );
  }

  // 3. Calculate trajectory
  const trajectory = calcTrajectory(periods, benchmarkPathways);

  // 4. Calculate pathway comparisons
  const pathwayComparisons = calcPathwayComparisons(periods, benchmarkPathways);

  // 5. Calculate CAPEX (optional)
  let capex: CapexResult | undefined;
  if (input.capexScenario) {
    capex = calcCapex(periods, methodDataMap, input.capexScenario, input.capexOverrides ?? {});
  }

  return {
    periods,
    waterfallTransitions,
    leverWaterfallTransitions,
    trajectory,
    pathwayComparisons,
    capex,
  };
}
