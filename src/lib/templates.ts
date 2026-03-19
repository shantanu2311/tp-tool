/**
 * Quick-start templates for the wizard.
 * Templates reference methods/levers by name (resolved to IDs at runtime).
 */

import type { SectorData } from './data';

export interface TemplateMethod {
  methodName: string;
  share: number; // 0-100 (percentage, converted to 0-1 decimal at resolve time)
  levers: Record<string, number>; // leverKey (e.g. "CCS") -> slider value 0-100
}

export interface TemplatePeriod {
  year: number;
  totalProduction: number;
  methods: TemplateMethod[];
}

export interface WizardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  region: string;
  companyName: string;
  periods: {
    base: TemplatePeriod;
    shortTerm: TemplatePeriod;
    mediumTerm: TemplatePeriod;
    longTerm: TemplatePeriod;
  };
}

export const TEMPLATES: WizardTemplate[] = [
  {
    id: 'indian-integrated',
    name: 'Indian Integrated',
    description: 'Large BF-BOF plant with gradual CCS adoption',
    icon: '🏭',
    region: 'india',
    companyName: 'Sample Steel India',
    periods: {
      base: {
        year: 2026, totalProduction: 10,
        methods: [{ methodName: 'Blast Furnace – BOF', share: 100, levers: {} }],
      },
      shortTerm: {
        year: 2030, totalProduction: 12,
        methods: [{ methodName: 'Blast Furnace – BOF', share: 100, levers: { CCS: 30, RE: 20, EE: 10 } }],
      },
      mediumTerm: {
        year: 2040, totalProduction: 15,
        methods: [
          { methodName: 'Blast Furnace – BOF', share: 70, levers: { CCS: 60, RE: 40, EE: 20 } },
          { methodName: 'Gas-DRI + EAF', share: 30, levers: { RE: 40, H2_SWITCH: 50 } },
        ],
      },
      longTerm: {
        year: 2050, totalProduction: 18,
        methods: [
          { methodName: 'Blast Furnace – BOF', share: 40, levers: { CCS: 90, RE: 60, EE: 30 } },
          { methodName: 'Gas-DRI + EAF', share: 40, levers: { RE: 80, H2_SWITCH: 100, H2_SOURCE: 80 } },
          { methodName: 'Scrap-EAF', share: 20, levers: { RE: 80, EE: 20 } },
        ],
      },
    },
  },
  {
    id: 'eu-green-transition',
    name: 'EU Green Transition',
    description: 'Aggressive H2-DRI shift with high RE and CCS',
    icon: '🌿',
    region: 'eu',
    companyName: 'Sample Steel EU',
    periods: {
      base: {
        year: 2026, totalProduction: 5,
        methods: [
          { methodName: 'Blast Furnace – BOF', share: 80, levers: {} },
          { methodName: 'Scrap-EAF', share: 20, levers: {} },
        ],
      },
      shortTerm: {
        year: 2030, totalProduction: 5,
        methods: [
          { methodName: 'Blast Furnace – BOF', share: 60, levers: { CCS: 60, RE: 40 } },
          { methodName: 'Gas-DRI + EAF', share: 20, levers: { RE: 50, H2_SWITCH: 50 } },
          { methodName: 'Scrap-EAF', share: 20, levers: { RE: 60 } },
        ],
      },
      mediumTerm: {
        year: 2040, totalProduction: 5,
        methods: [
          { methodName: 'Blast Furnace – BOF', share: 30, levers: { CCS: 90, RE: 60 } },
          { methodName: 'Gas-DRI + EAF', share: 40, levers: { RE: 80, H2_SWITCH: 100, H2_SOURCE: 80 } },
          { methodName: 'Scrap-EAF', share: 30, levers: { RE: 80, EE: 20 } },
        ],
      },
      longTerm: {
        year: 2050, totalProduction: 5,
        methods: [
          { methodName: 'Gas-DRI + EAF', share: 60, levers: { RE: 90, H2_SWITCH: 100, H2_SOURCE: 90 } },
          { methodName: 'Scrap-EAF', share: 30, levers: { RE: 90, EE: 30 } },
          { methodName: 'Blast Furnace – BOF', share: 10, levers: { CCS: 90, RE: 80 } },
        ],
      },
    },
  },
  {
    id: 'scrap-mini-mill',
    name: 'Scrap-EAF Mini Mill',
    description: 'Low-emission recycling-based steelmaker',
    icon: '♻️',
    region: 'us',
    companyName: 'Sample Mini Mill',
    periods: {
      base: {
        year: 2026, totalProduction: 2,
        methods: [{ methodName: 'Scrap-EAF', share: 100, levers: {} }],
      },
      shortTerm: {
        year: 2030, totalProduction: 2.5,
        methods: [{ methodName: 'Scrap-EAF', share: 100, levers: { RE: 60, EE: 20, SCRAP: 10 } }],
      },
      mediumTerm: {
        year: 2040, totalProduction: 3,
        methods: [{ methodName: 'Scrap-EAF', share: 100, levers: { RE: 80, EE: 30, SCRAP: 20 } }],
      },
      longTerm: {
        year: 2050, totalProduction: 3.5,
        methods: [{ methodName: 'Scrap-EAF', share: 100, levers: { RE: 90, EE: 30, SCRAP: 20, GRID: 80 } }],
      },
    },
  },
  {
    id: 'net-zero-leader',
    name: 'Net Zero Leader',
    description: 'Ambitious pathway to near-zero by 2050',
    icon: '🎯',
    region: 'global',
    companyName: 'Sample Net Zero Corp',
    periods: {
      base: {
        year: 2026, totalProduction: 8,
        methods: [
          { methodName: 'Blast Furnace – BOF', share: 60, levers: {} },
          { methodName: 'Gas-DRI + EAF', share: 20, levers: {} },
          { methodName: 'Scrap-EAF', share: 20, levers: {} },
        ],
      },
      shortTerm: {
        year: 2030, totalProduction: 8,
        methods: [
          { methodName: 'Blast Furnace – BOF', share: 50, levers: { CCS: 60, RE: 40, EE: 20 } },
          { methodName: 'Gas-DRI + EAF', share: 30, levers: { RE: 50, H2_SWITCH: 50 } },
          { methodName: 'Scrap-EAF', share: 20, levers: { RE: 60, EE: 20 } },
        ],
      },
      mediumTerm: {
        year: 2040, totalProduction: 8,
        methods: [
          { methodName: 'Blast Furnace – BOF', share: 20, levers: { CCS: 90, RE: 60, EE: 30 } },
          { methodName: 'Gas-DRI + EAF', share: 50, levers: { RE: 80, H2_SWITCH: 100, H2_SOURCE: 80 } },
          { methodName: 'Scrap-EAF', share: 30, levers: { RE: 80, EE: 30 } },
        ],
      },
      longTerm: {
        year: 2050, totalProduction: 8,
        methods: [
          { methodName: 'Gas-DRI + EAF', share: 60, levers: { RE: 90, H2_SWITCH: 100, H2_SOURCE: 90, EE: 30 } },
          { methodName: 'Scrap-EAF', share: 30, levers: { RE: 90, EE: 30, SCRAP: 20 } },
          { methodName: 'Blast Furnace – BOF', share: 10, levers: { CCS: 90, RE: 90 } },
        ],
      },
    },
  },
  {
    id: 'blank',
    name: 'Blank (Custom)',
    description: 'Start from scratch with your own data',
    icon: '📝',
    region: 'global',
    companyName: '',
    periods: {
      base: { year: 2026, totalProduction: 0, methods: [] },
      shortTerm: { year: 2030, totalProduction: 0, methods: [] },
      mediumTerm: { year: 2040, totalProduction: 0, methods: [] },
      longTerm: { year: 2050, totalProduction: 0, methods: [] },
    },
  },
];

/**
 * Resolves template method/lever names to actual IDs from loaded sector data.
 * Returns store-ready period states keyed by period name.
 */
export function resolveTemplate(
  template: WizardTemplate,
  sectorData: SectorData,
) {
  const methodMap = new Map(sectorData.methods.map((m) => [m.name, m]));
  const leverMap = new Map(sectorData.levers.map((l) => [l.name, l]));

  function resolveMethods(tms: TemplateMethod[]) {
    return tms.map((tm) => {
      const method = methodMap.get(tm.methodName);
      if (!method) return null;

      // Lever selections: map leverKey -> slider value (stored as string in store)
      const leverSelections: Record<string, string> = {};
      for (const [leverKey, sliderValue] of Object.entries(tm.levers)) {
        const lever = leverMap.get(leverKey);
        if (!lever) continue;
        leverSelections[lever.id] = String(sliderValue);
      }

      return {
        methodId: method.id,
        methodName: method.name,
        share: tm.share / 100, // Convert percentage (0-100) to decimal (0-1)
        leverSelections,
      };
    }).filter((m): m is NonNullable<typeof m> => m !== null);
  }

  return {
    base: {
      year: template.periods.base.year,
      totalProduction: template.periods.base.totalProduction,
      methods: resolveMethods(template.periods.base.methods),
    },
    shortTerm: {
      year: template.periods.shortTerm.year,
      totalProduction: template.periods.shortTerm.totalProduction,
      methods: resolveMethods(template.periods.shortTerm.methods),
    },
    mediumTerm: {
      year: template.periods.mediumTerm.year,
      totalProduction: template.periods.mediumTerm.totalProduction,
      methods: resolveMethods(template.periods.mediumTerm.methods),
    },
    longTerm: {
      year: template.periods.longTerm.year,
      totalProduction: template.periods.longTerm.totalProduction,
      methods: resolveMethods(template.periods.longTerm.methods),
    },
  };
}
