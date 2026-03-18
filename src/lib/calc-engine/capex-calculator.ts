import type {
  PeriodResult,
  MethodData,
  CapexNumeric,
  CapexScenario,
  TransitionCapex,
  MethodCapex,
  CapexResult,
} from './types';

/**
 * Parses CAPEX strings like "900–1200" or "300-600" into Low/Mid/High values.
 * Low = first number, High = second number, Mid = average.
 * Returns null if the string cannot be parsed.
 */
export function parseCapexString(capexStr: string, scenario: CapexScenario): number | null {
  // Try range format: "900–1200" or "900-1200"
  const rangeMatch = capexStr.match(/(\d+(?:\.\d+)?)\s*[–\-]\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    const mid = (low + high) / 2;
    switch (scenario) {
      case 'low': return low;
      case 'mid': return mid;
      case 'high': return high;
    }
  }

  // Try single number: "500"
  const singleMatch = capexStr.match(/^(\d+(?:\.\d+)?)/);
  if (singleMatch) {
    return parseFloat(singleMatch[1]);
  }

  return null;
}

/**
 * Gets the numeric CAPEX per tonne for a method based on scenario selection.
 * Priority: overrides → capexNumeric (custom methods) → parsed string → null
 */
export function getCapexPerTonne(
  methodId: string,
  methodData: MethodData,
  scenario: CapexScenario,
  overrides: Record<string, CapexNumeric>
): number | null {
  // 1. Check overrides (user-provided for predefined methods)
  if (overrides[methodId]) {
    return overrides[methodId][scenario];
  }

  // 2. Check if method has numeric CAPEX (custom methods)
  if (methodData.capexNumeric) {
    return methodData.capexNumeric[scenario];
  }

  // 3. Try parsing string CAPEX from predefined methods
  if (methodData.capex) {
    return parseCapexString(methodData.capex, scenario);
  }

  return null;
}

/**
 * Calculates CAPEX for a single transition between two periods.
 *
 * Formula for each method:
 *   capacityChange = (target_share × target_production) - (source_share × source_production)
 *   If capacityChange > 0 (capacity added): CAPEX = capacityChange × capexPerTonne
 *   If capacityChange ≤ 0 (capacity retired): CAPEX = 0
 */
export function calcTransitionCapex(
  from: PeriodResult,
  to: PeriodResult,
  methodDataMap: Record<string, MethodData>,
  scenario: CapexScenario,
  overrides: Record<string, CapexNumeric>
): TransitionCapex {
  // Collect all method IDs across both periods
  const allMethodIds = new Set<string>();
  from.methods.forEach((m) => allMethodIds.add(m.methodId));
  to.methods.forEach((m) => allMethodIds.add(m.methodId));

  const methodCapex: MethodCapex[] = [];

  for (const methodId of allMethodIds) {
    const fromMethod = from.methods.find((m) => m.methodId === methodId);
    const toMethod = to.methods.find((m) => m.methodId === methodId);

    const fromCapacity = fromMethod ? fromMethod.absoluteProduction : 0;
    const toCapacity = toMethod ? toMethod.absoluteProduction : 0;
    const capacityChange = toCapacity - fromCapacity;

    // Only calculate CAPEX for capacity additions (not retirements)
    if (capacityChange <= 0) continue;

    const methodData = methodDataMap[methodId];
    if (!methodData) continue;

    const capexPerTonne = getCapexPerTonne(methodId, methodData, scenario, overrides);
    if (capexPerTonne === null || capexPerTonne <= 0) continue;

    // Production is in MTPA, CAPEX is USD/tpa → totalCapex in million USD
    const totalCapex = capacityChange * capexPerTonne;

    methodCapex.push({
      methodId,
      methodName: toMethod?.methodName ?? fromMethod?.methodName ?? '',
      capacityChange,
      capexPerTonne,
      totalCapex,
    });
  }

  return {
    fromLabel: from.label,
    toLabel: to.label,
    methodCapex,
    totalCapex: methodCapex.reduce((s, mc) => s + mc.totalCapex, 0),
  };
}

/**
 * Calculates full CAPEX results across all period transitions.
 */
export function calcCapex(
  periods: PeriodResult[],
  methodDataMap: Record<string, MethodData>,
  scenario: CapexScenario,
  overrides: Record<string, CapexNumeric>
): CapexResult {
  const transitions: TransitionCapex[] = [];

  for (let i = 0; i < periods.length - 1; i++) {
    transitions.push(
      calcTransitionCapex(periods[i], periods[i + 1], methodDataMap, scenario, overrides)
    );
  }

  // Aggregate by technology across all transitions
  const byTechnology: Record<string, number> = {};
  for (const tr of transitions) {
    for (const mc of tr.methodCapex) {
      byTechnology[mc.methodId] = (byTechnology[mc.methodId] ?? 0) + mc.totalCapex;
    }
  }

  return {
    transitions,
    totalCapex: transitions.reduce((s, tr) => s + tr.totalCapex, 0),
    byTechnology,
  };
}
