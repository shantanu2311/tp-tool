/**
 * CAPEX Calculator Unit Tests
 *
 * Tests for:
 * - parseCapexString: Parsing "900–1200" range strings into numeric values
 * - getCapexPerTonne: Priority chain for resolving CAPEX values
 * - calcTransitionCapex: Per-transition CAPEX calculation
 * - calcCapex: Full multi-period CAPEX aggregation
 */

import { describe, it, expect } from 'vitest';
import {
  parseCapexString,
  getCapexPerTonne,
  calcTransitionCapex,
  calcCapex,
} from '../capex-calculator';
import type {
  MethodData,
  CapexNumeric,
  PeriodResult,
  PeriodMethodResult,
} from '../types';

// ============================================================
// Helper Factories
// ============================================================

function makeMethodData(overrides: Partial<MethodData> & { id: string }): MethodData {
  return {
    name: overrides.id,
    baseCO2: 2.0,
    category: 'Test',
    applicableLevers: new Set(),
    ...overrides,
  };
}

function makeMethodResult(
  methodId: string,
  share: number,
  absoluteProduction: number,
  name?: string
): PeriodMethodResult {
  return {
    methodId,
    methodName: name ?? methodId,
    share,
    absoluteProduction,
    baseCO2Intensity: 2.0,
    baseCO2Absolute: absoluteProduction * 2.0,
    leverFactors: [],
    finalIntensity: 2.0,
    finalAbsoluteEmissions: absoluteProduction * 2.0,
  };
}

function makePeriod(
  label: string,
  year: number,
  totalProduction: number,
  methods: PeriodMethodResult[]
): PeriodResult {
  return {
    label,
    year,
    totalProduction,
    methods,
    companyIntensity: methods.reduce((s, m) => s + m.finalIntensity * m.share, 0),
    estimatedEmissions: methods.reduce((s, m) => s + m.finalAbsoluteEmissions, 0),
  };
}

// ============================================================
// parseCapexString Tests
// ============================================================

describe('parseCapexString', () => {
  it('parses en-dash range "900–1200" correctly', () => {
    expect(parseCapexString('900–1200', 'low')).toBe(900);
    expect(parseCapexString('900–1200', 'mid')).toBe(1050);
    expect(parseCapexString('900–1200', 'high')).toBe(1200);
  });

  it('parses hyphen range "300-600" correctly', () => {
    expect(parseCapexString('300-600', 'low')).toBe(300);
    expect(parseCapexString('300-600', 'mid')).toBe(450);
    expect(parseCapexString('300-600', 'high')).toBe(600);
  });

  it('parses decimal range "1.5–3.5" correctly', () => {
    expect(parseCapexString('1.5–3.5', 'low')).toBe(1.5);
    expect(parseCapexString('1.5–3.5', 'mid')).toBe(2.5);
    expect(parseCapexString('1.5–3.5', 'high')).toBe(3.5);
  });

  it('parses range with spaces "900 – 1200" correctly', () => {
    expect(parseCapexString('900 – 1200', 'low')).toBe(900);
    expect(parseCapexString('900 – 1200', 'high')).toBe(1200);
  });

  it('parses single number "500"', () => {
    expect(parseCapexString('500', 'low')).toBe(500);
    expect(parseCapexString('500', 'mid')).toBe(500);
    expect(parseCapexString('500', 'high')).toBe(500);
  });

  it('returns null for empty string', () => {
    expect(parseCapexString('', 'mid')).toBeNull();
  });

  it('returns null for non-numeric string', () => {
    expect(parseCapexString('N/A', 'mid')).toBeNull();
  });

  it('extracts number from string with units "900–1200 USD/tpa"', () => {
    expect(parseCapexString('900–1200 USD/tpa', 'low')).toBe(900);
    expect(parseCapexString('900–1200 USD/tpa', 'high')).toBe(1200);
  });
});

// ============================================================
// getCapexPerTonne Tests
// ============================================================

describe('getCapexPerTonne', () => {
  const methodWithCapexString = makeMethodData({
    id: 'bf-bof',
    capex: '900–1200',
  });

  const methodWithCapexNumeric = makeMethodData({
    id: 'custom-1',
    capexNumeric: { low: 100, mid: 200, high: 300 },
  });

  const methodWithBoth = makeMethodData({
    id: 'both',
    capex: '900–1200',
    capexNumeric: { low: 100, mid: 200, high: 300 },
  });

  const methodWithNoCapex = makeMethodData({
    id: 'no-capex',
  });

  const overrides: Record<string, CapexNumeric> = {
    'bf-bof': { low: 500, mid: 600, high: 700 },
  };

  it('returns override value when override exists', () => {
    expect(getCapexPerTonne('bf-bof', methodWithCapexString, 'low', overrides)).toBe(500);
    expect(getCapexPerTonne('bf-bof', methodWithCapexString, 'mid', overrides)).toBe(600);
    expect(getCapexPerTonne('bf-bof', methodWithCapexString, 'high', overrides)).toBe(700);
  });

  it('returns capexNumeric when no override (custom methods)', () => {
    expect(getCapexPerTonne('custom-1', methodWithCapexNumeric, 'low', {})).toBe(100);
    expect(getCapexPerTonne('custom-1', methodWithCapexNumeric, 'mid', {})).toBe(200);
    expect(getCapexPerTonne('custom-1', methodWithCapexNumeric, 'high', {})).toBe(300);
  });

  it('capexNumeric takes priority over parsed string', () => {
    expect(getCapexPerTonne('both', methodWithBoth, 'mid', {})).toBe(200);
  });

  it('falls back to parsing capex string when no override or capexNumeric', () => {
    expect(getCapexPerTonne('bf-bof', methodWithCapexString, 'mid', {})).toBe(1050);
  });

  it('returns null when no CAPEX data at all', () => {
    expect(getCapexPerTonne('no-capex', methodWithNoCapex, 'mid', {})).toBeNull();
  });
});

// ============================================================
// calcTransitionCapex Tests
// ============================================================

describe('calcTransitionCapex', () => {
  const methodDataMap: Record<string, MethodData> = {
    m1: makeMethodData({ id: 'm1', name: 'Method 1', capexNumeric: { low: 100, mid: 200, high: 300 } }),
    m2: makeMethodData({ id: 'm2', name: 'Method 2', capexNumeric: { low: 50, mid: 100, high: 150 } }),
    m3: makeMethodData({ id: 'm3', name: 'Method 3', capexNumeric: { low: 200, mid: 400, high: 600 } }),
  };

  it('calculates CAPEX for capacity additions', () => {
    const from = makePeriod('Base', 2024, 100, [
      makeMethodResult('m1', 0.6, 60, 'Method 1'),
      makeMethodResult('m2', 0.4, 40, 'Method 2'),
    ]);
    const to = makePeriod('ST', 2027, 100, [
      makeMethodResult('m1', 0.4, 40, 'Method 1'),
      makeMethodResult('m2', 0.6, 60, 'Method 2'),
    ]);

    const result = calcTransitionCapex(from, to, methodDataMap, 'mid', {});

    // m1: 40 - 60 = -20 (retired, CAPEX = 0)
    // m2: 60 - 40 = +20 (added, CAPEX = 20 * 100 = 2000)
    expect(result.methodCapex).toHaveLength(1);
    expect(result.methodCapex[0].methodId).toBe('m2');
    expect(result.methodCapex[0].capacityChange).toBe(20);
    expect(result.methodCapex[0].capexPerTonne).toBe(100);
    expect(result.methodCapex[0].totalCapex).toBe(2000);
    expect(result.totalCapex).toBe(2000);
  });

  it('returns zero CAPEX when all methods shrink', () => {
    const from = makePeriod('Base', 2024, 100, [
      makeMethodResult('m1', 0.6, 60, 'Method 1'),
      makeMethodResult('m2', 0.4, 40, 'Method 2'),
    ]);
    const to = makePeriod('ST', 2027, 80, [
      makeMethodResult('m1', 0.5, 40, 'Method 1'),
      makeMethodResult('m2', 0.5, 40, 'Method 2'),
    ]);

    const result = calcTransitionCapex(from, to, methodDataMap, 'mid', {});

    // m1: 40 - 60 = -20 (retired)
    // m2: 40 - 40 = 0 (no change)
    expect(result.methodCapex).toHaveLength(0);
    expect(result.totalCapex).toBe(0);
  });

  it('handles new methods appearing in target period', () => {
    const from = makePeriod('Base', 2024, 100, [
      makeMethodResult('m1', 1.0, 100, 'Method 1'),
    ]);
    const to = makePeriod('ST', 2027, 100, [
      makeMethodResult('m1', 0.7, 70, 'Method 1'),
      makeMethodResult('m3', 0.3, 30, 'Method 3'),
    ]);

    const result = calcTransitionCapex(from, to, methodDataMap, 'mid', {});

    // m1: 70 - 100 = -30 (retired)
    // m3: 30 - 0 = +30 (new, CAPEX = 30 * 400 = 12000)
    expect(result.methodCapex).toHaveLength(1);
    expect(result.methodCapex[0].methodId).toBe('m3');
    expect(result.methodCapex[0].capacityChange).toBe(30);
    expect(result.methodCapex[0].totalCapex).toBe(12000);
    expect(result.totalCapex).toBe(12000);
  });

  it('respects CAPEX scenario selection', () => {
    const from = makePeriod('Base', 2024, 100, [
      makeMethodResult('m1', 1.0, 100, 'Method 1'),
    ]);
    const to = makePeriod('ST', 2027, 120, [
      makeMethodResult('m1', 1.0, 120, 'Method 1'),
    ]);

    const lowResult = calcTransitionCapex(from, to, methodDataMap, 'low', {});
    const midResult = calcTransitionCapex(from, to, methodDataMap, 'mid', {});
    const highResult = calcTransitionCapex(from, to, methodDataMap, 'high', {});

    // capacityChange = 120 - 100 = 20
    expect(lowResult.totalCapex).toBe(20 * 100);  // 2000
    expect(midResult.totalCapex).toBe(20 * 200);  // 4000
    expect(highResult.totalCapex).toBe(20 * 300); // 6000
  });

  it('uses overrides when provided', () => {
    const from = makePeriod('Base', 2024, 100, [
      makeMethodResult('m1', 1.0, 100, 'Method 1'),
    ]);
    const to = makePeriod('ST', 2027, 120, [
      makeMethodResult('m1', 1.0, 120, 'Method 1'),
    ]);

    const overrides: Record<string, CapexNumeric> = {
      m1: { low: 500, mid: 1000, high: 1500 },
    };

    const result = calcTransitionCapex(from, to, methodDataMap, 'mid', overrides);

    // capacityChange = 20, override mid = 1000
    expect(result.totalCapex).toBe(20 * 1000); // 20000
  });

  it('skips methods with no CAPEX data', () => {
    const noCapexMap: Record<string, MethodData> = {
      m1: makeMethodData({ id: 'm1', name: 'Method 1' }),
    };

    const from = makePeriod('Base', 2024, 100, [
      makeMethodResult('m1', 1.0, 100, 'Method 1'),
    ]);
    const to = makePeriod('ST', 2027, 120, [
      makeMethodResult('m1', 1.0, 120, 'Method 1'),
    ]);

    const result = calcTransitionCapex(from, to, noCapexMap, 'mid', {});
    expect(result.methodCapex).toHaveLength(0);
    expect(result.totalCapex).toBe(0);
  });

  it('sets correct fromLabel and toLabel', () => {
    const from = makePeriod('Base', 2024, 100, [
      makeMethodResult('m1', 1.0, 100, 'Method 1'),
    ]);
    const to = makePeriod('Short Term', 2027, 100, [
      makeMethodResult('m1', 1.0, 100, 'Method 1'),
    ]);

    const result = calcTransitionCapex(from, to, methodDataMap, 'mid', {});
    expect(result.fromLabel).toBe('Base');
    expect(result.toLabel).toBe('Short Term');
  });
});

// ============================================================
// calcCapex Tests (full multi-period)
// ============================================================

describe('calcCapex', () => {
  const methodDataMap: Record<string, MethodData> = {
    m1: makeMethodData({ id: 'm1', name: 'BF-BOF', capexNumeric: { low: 100, mid: 200, high: 300 } }),
    m2: makeMethodData({ id: 'm2', name: 'H2-DRI', capexNumeric: { low: 500, mid: 1000, high: 1500 } }),
    m3: makeMethodData({ id: 'm3', name: 'Scrap-EAF', capexNumeric: { low: 50, mid: 100, high: 150 } }),
  };

  const periods: PeriodResult[] = [
    makePeriod('Base', 2024, 100, [
      makeMethodResult('m1', 0.8, 80, 'BF-BOF'),
      makeMethodResult('m2', 0.2, 20, 'H2-DRI'),
    ]),
    makePeriod('ST', 2027, 100, [
      makeMethodResult('m1', 0.5, 50, 'BF-BOF'),
      makeMethodResult('m2', 0.3, 30, 'H2-DRI'),
      makeMethodResult('m3', 0.2, 20, 'Scrap-EAF'),
    ]),
    makePeriod('MT', 2030, 120, [
      makeMethodResult('m1', 0.3, 36, 'BF-BOF'),
      makeMethodResult('m2', 0.4, 48, 'H2-DRI'),
      makeMethodResult('m3', 0.3, 36, 'Scrap-EAF'),
    ]),
  ];

  it('calculates transitions for all adjacent period pairs', () => {
    const result = calcCapex(periods, methodDataMap, 'mid', {});
    expect(result.transitions).toHaveLength(2); // Base→ST, ST→MT
  });

  it('aggregates totalCapex across all transitions', () => {
    const result = calcCapex(periods, methodDataMap, 'mid', {});

    // Base→ST:
    //   m1: 50-80 = -30 (retired, 0)
    //   m2: 30-20 = +10, CAPEX = 10 * 1000 = 10000
    //   m3: 20-0  = +20, CAPEX = 20 * 100 = 2000
    //   Transition total: 12000

    // ST→MT:
    //   m1: 36-50 = -14 (retired, 0)
    //   m2: 48-30 = +18, CAPEX = 18 * 1000 = 18000
    //   m3: 36-20 = +16, CAPEX = 16 * 100 = 1600
    //   Transition total: 19600

    expect(result.transitions[0].totalCapex).toBe(12000);
    expect(result.transitions[1].totalCapex).toBe(19600);
    expect(result.totalCapex).toBe(31600);
  });

  it('aggregates byTechnology correctly', () => {
    const result = calcCapex(periods, methodDataMap, 'mid', {});

    // m2 total: 10000 + 18000 = 28000
    // m3 total: 2000 + 1600 = 3600
    // m1 never adds capacity, so shouldn't be in byTechnology
    expect(result.byTechnology['m2']).toBe(28000);
    expect(result.byTechnology['m3']).toBe(3600);
    expect(result.byTechnology['m1']).toBeUndefined();
  });

  it('returns empty results for single period', () => {
    const result = calcCapex([periods[0]], methodDataMap, 'mid', {});
    expect(result.transitions).toHaveLength(0);
    expect(result.totalCapex).toBe(0);
    expect(Object.keys(result.byTechnology)).toHaveLength(0);
  });

  it('handles string CAPEX from predefined methods', () => {
    const stringCapexMap: Record<string, MethodData> = {
      m1: makeMethodData({ id: 'm1', name: 'BF-BOF', capex: '900–1200' }),
    };

    const twoPeriodsWithGrowth: PeriodResult[] = [
      makePeriod('Base', 2024, 100, [
        makeMethodResult('m1', 1.0, 100, 'BF-BOF'),
      ]),
      makePeriod('ST', 2027, 120, [
        makeMethodResult('m1', 1.0, 120, 'BF-BOF'),
      ]),
    ];

    const result = calcCapex(twoPeriodsWithGrowth, stringCapexMap, 'mid', {});

    // capacityChange = 120 - 100 = 20
    // mid CAPEX from "900–1200" = 1050
    expect(result.totalCapex).toBe(20 * 1050); // 21000
  });
});
