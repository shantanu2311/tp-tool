import type { MethodData, LeverDefinition, LeverOptionData, BenchmarkPathway } from './calc-engine/types';

export interface SectorData {
  id: string;
  name: string;
  methods: MethodData[];
  levers: LeverDefinition[];
  pathways: BenchmarkPathway[];
}

interface ApiLeverOption {
  id: string;
  name: string;
  factor: number;
  assumptionNote: string | null;
  isDefault: boolean;
  displayOrder: number;
}

interface ApiLever {
  id: string;
  name: string;
  displayName: string;
  displayOrder: number;
  maxReduction: number;
  options: ApiLeverOption[];
}

interface ApiSector {
  id: string;
  name: string;
  methods: Array<{
    id: string;
    name: string;
    baseCO2: number;
    category: string;
    commercialStatus: string | null;
    trl: string | null;
    capex: string | null;
    energyDemand: string | null;
    deploymentTimeframe: string | null;
    description: string | null;
    baselineAssumptions: string | null;
    displayOrder: number;
    applicability: Array<{
      lever: { id: string };
    }>;
  }>;
  levers: ApiLever[];
  pathways: Array<{
    id: string;
    name: string;
    displayOrder: number;
    annualRates: Array<{ year: number; rate: number }>;
  }>;
}

export async function fetchSectorData(): Promise<SectorData[]> {
  const res = await fetch('/api/sectors');
  const sectors: ApiSector[] = await res.json();

  return sectors.map((s) => {
    // Transform levers with their options
    const levers: LeverDefinition[] = s.levers.map((l) => ({
      id: l.id,
      name: l.name,
      displayName: l.displayName,
      displayOrder: l.displayOrder,
      maxReduction: l.maxReduction ?? 0,
      options: l.options.map((o) => ({
        id: o.id,
        name: o.name,
        factor: o.factor,
        assumptionNote: o.assumptionNote ?? undefined,
        isDefault: o.isDefault,
      })),
    }));

    // Transform methods with applicability sets
    const methods: MethodData[] = s.methods.map((m) => {
      const applicableLevers = new Set<string>(
        m.applicability.map((a) => a.lever.id)
      );
      return {
        id: m.id,
        name: m.name,
        baseCO2: m.baseCO2,
        category: m.category,
        commercialStatus: m.commercialStatus ?? undefined,
        trl: m.trl ?? undefined,
        capex: m.capex ?? undefined,
        energyDemand: m.energyDemand ?? undefined,
        deploymentTimeframe: m.deploymentTimeframe ?? undefined,
        description: m.description ?? undefined,
        applicableLevers,
      };
    });

    // Transform pathways
    const pathways: BenchmarkPathway[] = s.pathways.map((p) => {
      const annualRates: Record<number, number> = {};
      for (const ar of p.annualRates) {
        annualRates[ar.year] = ar.rate;
      }
      return { id: p.id, name: p.name, annualRates };
    });

    return { id: s.id, name: s.name, methods, levers, pathways };
  });
}
