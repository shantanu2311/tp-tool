import type { PeriodResult, BenchmarkPathway, PathwayComparisonRow } from './types';
import { calcBenchmarkTrajectory } from './trajectory';

/**
 * Calculates alignment ratio between company and benchmark.
 * Matches workbook: (company_change / base - 1) / (benchmark_change / base - 1)
 * i.e. (companyIntensity/baseIntensity - 1) / (benchmarkIntensity/baseIntensity - 1)
 */
export function calcAlignmentRatio(
  companyIntensity: number,
  benchmarkIntensity: number,
  baseIntensity: number
): number {
  const companyChange = companyIntensity / baseIntensity - 1;
  const benchmarkChange = benchmarkIntensity / baseIntensity - 1;

  if (benchmarkChange === 0) return 0;
  return companyChange / benchmarkChange;
}

/**
 * Generates pathway comparison table across all milestones.
 */
export function calcPathwayComparisons(
  periods: PeriodResult[],
  benchmarks: BenchmarkPathway[]
): PathwayComparisonRow[] {
  if (periods.length < 2) return [];

  const baseIntensity = periods[0].companyIntensity;
  const milestoneLabels = ['ST', 'MT', 'LT'];
  const milestonePeriods = periods.slice(1); // Skip base

  return benchmarks.map((bm) => {
    const milestoneIntensities: Record<string, number> = {};
    const alignmentRatios: Record<string, number> = {};

    milestonePeriods.forEach((period, i) => {
      const label = milestoneLabels[i];
      if (!label) return;

      // Calculate benchmark intensity at this milestone year
      const bmValues = calcBenchmarkTrajectory(baseIntensity, bm, [period.year]);
      const benchmarkIntensity = bmValues[0];

      milestoneIntensities[label] = benchmarkIntensity;
      alignmentRatios[label] = calcAlignmentRatio(
        period.companyIntensity,
        benchmarkIntensity,
        baseIntensity
      );
    });

    return {
      pathwayId: bm.id,
      pathwayName: bm.name,
      milestoneIntensities,
      alignmentRatios,
    };
  });
}
