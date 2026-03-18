import { create } from 'zustand';
import type {
  PeriodMethodInput,
  MethodData,
  LeverDefinition,
  CapexNumeric,
  CapexScenario,
} from './calc-engine/types';

interface PeriodState {
  year: number;
  totalProduction: number;
  methods: PeriodMethodInput[];
}

interface WizardState {
  currentStep: number;
  sectorId: string;
  companyName: string;

  base: PeriodState;
  shortTerm: PeriodState;
  mediumTerm: PeriodState;
  longTerm: PeriodState;

  hasSubmitted: boolean;
  isDirty: boolean;

  // Custom methods & levers (session-scoped, client-only)
  customMethods: MethodData[];
  customLevers: LeverDefinition[];

  // CAPEX settings
  capexScenario: CapexScenario;
  capexOverrides: Record<string, CapexNumeric>;

  // Existing actions
  setStep: (step: number) => void;
  setSectorId: (id: string) => void;
  setCompanyName: (name: string) => void;
  setPeriod: (period: 'base' | 'shortTerm' | 'mediumTerm' | 'longTerm', state: Partial<PeriodState>) => void;
  setMethodsForPeriod: (period: 'base' | 'shortTerm' | 'mediumTerm' | 'longTerm', methods: PeriodMethodInput[]) => void;
  updateMethod: (
    period: 'base' | 'shortTerm' | 'mediumTerm' | 'longTerm',
    index: number,
    updates: Partial<PeriodMethodInput>
  ) => void;
  addMethod: (period: 'base' | 'shortTerm' | 'mediumTerm' | 'longTerm', method: PeriodMethodInput) => void;
  removeMethod: (period: 'base' | 'shortTerm' | 'mediumTerm' | 'longTerm', index: number) => void;
  markSubmitted: () => void;
  reset: () => void;

  // Custom method actions
  addCustomMethod: (method: MethodData) => void;
  updateCustomMethod: (id: string, updates: Partial<MethodData>) => void;
  removeCustomMethod: (id: string) => void;

  // Custom lever actions
  addCustomLever: (lever: LeverDefinition) => void;
  updateCustomLever: (id: string, updates: Partial<LeverDefinition>) => void;
  removeCustomLever: (id: string) => void;

  // CAPEX actions
  setCapexScenario: (scenario: CapexScenario) => void;
  setCapexOverride: (methodId: string, capex: CapexNumeric) => void;
  removeCapexOverride: (methodId: string) => void;
}

const defaultPeriod: PeriodState = {
  year: 2026,
  totalProduction: 0,
  methods: [],
};

export const useWizardStore = create<WizardState>((set) => ({
  currentStep: 1,
  sectorId: '',
  companyName: '',

  base: { ...defaultPeriod, year: 2026 },
  shortTerm: { ...defaultPeriod, year: 2030 },
  mediumTerm: { ...defaultPeriod, year: 2040 },
  longTerm: { ...defaultPeriod, year: 2050 },

  hasSubmitted: false,
  isDirty: false,

  customMethods: [],
  customLevers: [],
  capexScenario: 'mid',
  capexOverrides: {},

  setStep: (step) => set({ currentStep: step }),

  setSectorId: (id) =>
    set((prev) => ({
      sectorId: id,
      ...(prev.hasSubmitted ? { isDirty: true } : {}),
    })),

  setCompanyName: (name) =>
    set((prev) => ({
      companyName: name,
      ...(prev.hasSubmitted ? { isDirty: true } : {}),
    })),

  setPeriod: (period, state) =>
    set((prev) => ({
      [period]: { ...prev[period], ...state },
      ...(prev.hasSubmitted ? { isDirty: true } : {}),
    })),

  setMethodsForPeriod: (period, methods) =>
    set((prev) => ({
      [period]: { ...prev[period], methods },
      ...(prev.hasSubmitted ? { isDirty: true } : {}),
    })),

  updateMethod: (period, index, updates) =>
    set((prev) => {
      const methods = [...prev[period].methods];
      methods[index] = { ...methods[index], ...updates };
      return {
        [period]: { ...prev[period], methods },
        ...(prev.hasSubmitted ? { isDirty: true } : {}),
      };
    }),

  addMethod: (period, method) =>
    set((prev) => ({
      [period]: {
        ...prev[period],
        methods: [...prev[period].methods, method],
      },
      ...(prev.hasSubmitted ? { isDirty: true } : {}),
    })),

  removeMethod: (period, index) =>
    set((prev) => ({
      [period]: {
        ...prev[period],
        methods: prev[period].methods.filter((_, i) => i !== index),
      },
      ...(prev.hasSubmitted ? { isDirty: true } : {}),
    })),

  markSubmitted: () => set({ hasSubmitted: true, isDirty: false }),

  // ── Custom Method Actions ──

  addCustomMethod: (method) =>
    set((prev) => ({
      customMethods: [...prev.customMethods, method],
      ...(prev.hasSubmitted ? { isDirty: true } : {}),
    })),

  updateCustomMethod: (id, updates) =>
    set((prev) => ({
      customMethods: prev.customMethods.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
      ...(prev.hasSubmitted ? { isDirty: true } : {}),
    })),

  removeCustomMethod: (id) =>
    set((prev) => ({
      customMethods: prev.customMethods.filter((m) => m.id !== id),
      ...(prev.hasSubmitted ? { isDirty: true } : {}),
    })),

  // ── Custom Lever Actions ──

  addCustomLever: (lever) =>
    set((prev) => ({
      customLevers: [...prev.customLevers, lever],
      ...(prev.hasSubmitted ? { isDirty: true } : {}),
    })),

  updateCustomLever: (id, updates) =>
    set((prev) => ({
      customLevers: prev.customLevers.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      ),
      ...(prev.hasSubmitted ? { isDirty: true } : {}),
    })),

  removeCustomLever: (id) =>
    set((prev) => ({
      customLevers: prev.customLevers.filter((l) => l.id !== id),
      ...(prev.hasSubmitted ? { isDirty: true } : {}),
    })),

  // ── CAPEX Actions ──

  setCapexScenario: (scenario) =>
    set((prev) => ({
      capexScenario: scenario,
      ...(prev.hasSubmitted ? { isDirty: true } : {}),
    })),

  setCapexOverride: (methodId, capex) =>
    set((prev) => ({
      capexOverrides: { ...prev.capexOverrides, [methodId]: capex },
      ...(prev.hasSubmitted ? { isDirty: true } : {}),
    })),

  removeCapexOverride: (methodId) =>
    set((prev) => {
      const { [methodId]: _, ...rest } = prev.capexOverrides;
      return {
        capexOverrides: rest,
        ...(prev.hasSubmitted ? { isDirty: true } : {}),
      };
    }),

  reset: () =>
    set({
      currentStep: 1,
      sectorId: '',
      companyName: '',
      base: { ...defaultPeriod, year: 2026 },
      shortTerm: { ...defaultPeriod, year: 2030 },
      mediumTerm: { ...defaultPeriod, year: 2040 },
      longTerm: { ...defaultPeriod, year: 2050 },
      hasSubmitted: false,
      isDirty: false,
      customMethods: [],
      customLevers: [],
      capexScenario: 'mid',
      capexOverrides: {},
    }),
}));
