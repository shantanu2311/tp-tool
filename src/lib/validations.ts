import type { PeriodMethodInput } from './calc-engine/types';

interface PeriodState {
  year: number;
  totalProduction: number;
  methods: PeriodMethodInput[];
}

interface WizardData {
  sectorId: string;
  companyName: string;
  base: PeriodState;
  shortTerm: PeriodState;
  mediumTerm: PeriodState;
  longTerm: PeriodState;
}

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate a single period's inputs.
 * Returns an array of error objects (empty = valid).
 */
export function validatePeriod(
  period: PeriodState,
  periodLabel: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Must have at least one method
  if (period.methods.length === 0) {
    errors.push({
      field: 'methods',
      message: `Add at least one production method for ${periodLabel}.`,
    });
  }

  // Production must be positive
  if (period.totalProduction <= 0) {
    errors.push({
      field: 'production',
      message: `Total production must be greater than 0.`,
    });
  }

  // Year must be reasonable
  if (period.year < 2000 || period.year > 2100) {
    errors.push({
      field: 'year',
      message: `Year must be between 2000 and 2100.`,
    });
  }

  // Total share must equal 100%
  if (period.methods.length > 0) {
    const totalShare = period.methods.reduce((s, m) => s + m.share, 0);
    const roundedShare = Math.round(totalShare * 100);
    if (roundedShare !== 100) {
      errors.push({
        field: 'share',
        message: `Method shares must total 100% (currently ${roundedShare}%).`,
      });
    }
  }

  // Check for duplicate methods
  if (period.methods.length > 0) {
    const methodIds = period.methods.map((m) => m.methodId);
    const uniqueIds = new Set(methodIds);
    if (uniqueIds.size !== methodIds.length) {
      errors.push({
        field: 'duplicates',
        message: `Duplicate methods detected. Each method can only appear once.`,
      });
    }
  }

  // Check that no individual share is negative
  for (const m of period.methods) {
    if (m.share < 0) {
      errors.push({
        field: 'share',
        message: `Method share cannot be negative (${m.methodName}).`,
      });
      break;
    }
    if (m.share > 1) {
      errors.push({
        field: 'share',
        message: `Method share cannot exceed 100% (${m.methodName}).`,
      });
      break;
    }
  }

  return errors;
}

/**
 * Validate Step 1: Sector selection + Company information (merged).
 */
export function validateStep1(data: WizardData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.sectorId) {
    errors.push({ field: 'sector', message: 'Please select an industry sector.' });
  }

  if (!data.companyName.trim()) {
    errors.push({ field: 'companyName', message: 'Company name is required.' });
  }

  // Validate years are filled
  const years = [data.base.year, data.shortTerm.year, data.mediumTerm.year, data.longTerm.year];
  const labels = ['Base Year', 'Short Term Year', 'Medium Term Year', 'Long Term Year'];
  for (let i = 0; i < years.length; i++) {
    if (!years[i] || years[i] < 2000 || years[i] > 2100) {
      errors.push({ field: `year_${i}`, message: `${labels[i]} must be between 2000 and 2100.` });
    }
  }

  // Validate chronological order
  if (years.every((y) => y >= 2000 && y <= 2100)) {
    if (data.base.year >= data.shortTerm.year) {
      errors.push({ field: 'yearOrder', message: 'Short Term year must be after Base Year.' });
    }
    if (data.shortTerm.year >= data.mediumTerm.year) {
      errors.push({ field: 'yearOrder', message: 'Medium Term year must be after Short Term.' });
    }
    if (data.mediumTerm.year >= data.longTerm.year) {
      errors.push({ field: 'yearOrder', message: 'Long Term year must be after Medium Term.' });
    }
  }

  return errors;
}

/**
 * Validate a specific wizard step.
 * Returns array of errors (empty = valid, can proceed).
 */
export function validateStep(step: number, data: WizardData): ValidationError[] {
  switch (step) {
    case 1:
      return validateStep1(data);
    case 2:
      return validatePeriod(data.base, 'Base Year');
    case 3:
      return validatePeriod(data.shortTerm, 'Short Term');
    case 4:
      return validatePeriod(data.mediumTerm, 'Medium Term');
    case 5:
      return validatePeriod(data.longTerm, 'Long Term');
    case 6:
      return []; // Review step — always valid if we got here
    default:
      return [];
  }
}
