import type { PeriodResult, BenchmarkPathway, TrajectoryPoint } from './types';

interface Milestone {
  year: number;
  intensity: number;
  production: number;
}

/**
 * Calculates actual intensity using piecewise step function.
 * Matches workbook: IF(year < ST_year, base_intensity, IF(year < MT_year, ST_intensity, ...))
 */
export function calcActualIntensity(year: number, milestones: Milestone[]): number {
  // Sort milestones by year
  const sorted = [...milestones].sort((a, b) => a.year - b.year);

  // Find the most recent milestone at or before this year
  let intensity = sorted[0].intensity;
  for (const m of sorted) {
    if (year >= m.year) {
      intensity = m.intensity;
    } else {
      break;
    }
  }
  return intensity;
}

/**
 * Calculates interpolated intensity using linear interpolation between milestones.
 * Between two consecutive milestones, intensity changes linearly.
 */
export function calcInterpolatedIntensity(year: number, milestones: Milestone[]): number {
  const sorted = [...milestones].sort((a, b) => a.year - b.year);

  // Before first milestone
  if (year <= sorted[0].year) return sorted[0].intensity;

  // After last milestone
  if (year >= sorted[sorted.length - 1].year) {
    return sorted[sorted.length - 1].intensity;
  }

  // Find bracketing milestones
  for (let i = 0; i < sorted.length - 1; i++) {
    if (year >= sorted[i].year && year < sorted[i + 1].year) {
      const prev = sorted[i];
      const next = sorted[i + 1];
      const fraction = (year - prev.year) / (next.year - prev.year);
      return prev.intensity + fraction * (next.intensity - prev.intensity);
    }
  }

  return sorted[sorted.length - 1].intensity;
}

/**
 * Gets production for a given year based on milestone step function.
 */
function getProductionForYear(year: number, milestones: Milestone[]): number {
  const sorted = [...milestones].sort((a, b) => a.year - b.year);
  let production = sorted[0].production;
  for (const m of sorted) {
    if (year >= m.year) {
      production = m.production;
    } else {
      break;
    }
  }
  return production;
}

/**
 * Calculates benchmark trajectory.
 * Matches workbook: benchmark[y] = BAU * (1 - SUM(cumulative annual rates up to year y))
 */
export function calcBenchmarkTrajectory(
  baseIntensity: number,
  pathway: BenchmarkPathway,
  years: number[]
): number[] {
  return years.map((year) => {
    let cumulativeRate = 0;
    for (const [rateYear, rate] of Object.entries(pathway.annualRates)) {
      if (Number(rateYear) <= year) {
        cumulativeRate += rate;
      }
    }
    return baseIntensity * (1 - cumulativeRate);
  });
}

/**
 * Generates the full trajectory timeline.
 */
export function calcTrajectory(
  periods: PeriodResult[],
  benchmarks: BenchmarkPathway[]
): TrajectoryPoint[] {
  if (periods.length === 0) return [];

  const baseYear = periods[0].year;
  const endYear = periods[periods.length - 1].year; // extend only to long-term year

  const bauIntensity = periods[0].companyIntensity; // BAU: base year intensity held constant

  const milestones: Milestone[] = periods.map((p) => ({
    year: p.year,
    intensity: p.companyIntensity,
    production: p.totalProduction,
  }));

  const years: number[] = [];
  for (let y = baseYear; y <= endYear; y++) {
    years.push(y);
  }

  // Pre-compute benchmark trajectories
  const benchmarkTrajectories: Record<string, number[]> = {};
  for (const bm of benchmarks) {
    benchmarkTrajectories[bm.id] = calcBenchmarkTrajectory(
      periods[0].companyIntensity,
      bm,
      years
    );
  }

  return years.map((year, i) => {
    const actual = calcActualIntensity(year, milestones);
    const interpolated = calcInterpolatedIntensity(year, milestones);
    const production = getProductionForYear(year, milestones);
    const emissions = interpolated * production;

    const benchmarkValues: Record<string, number> = {};
    for (const bm of benchmarks) {
      benchmarkValues[bm.id] = benchmarkTrajectories[bm.id][i];
    }

    return {
      year,
      actual,
      interpolated,
      emissions,
      bau: bauIntensity,
      benchmarks: benchmarkValues,
    };
  });
}
