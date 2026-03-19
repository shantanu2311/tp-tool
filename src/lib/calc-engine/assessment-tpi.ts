/**
 * TPI Management Quality Level Assessment
 *
 * Adapted from Transition Pathway Initiative (TPI) Management Quality framework.
 * Uses hierarchical levels 0-4: must pass ALL indicators at a level to advance.
 *
 * Level 0: Unaware — no climate acknowledgment
 * Level 1: Awareness — acknowledges climate change, has some policy
 * Level 2: Building Capacity — emission targets, reports Scope 1+2
 * Level 3: Integrating — externally verified, risk management, long-term targets
 * Level 4: Strategic — board competency, exec comp linked, aligned policy engagement
 *
 * Sources: TPI Centre (LSE), FTSE Russell TPI MQ v5.0
 */

export interface TPIResult {
  level: number; // 0-4
  classification: string;
  classificationColor: string;
  criteria: { name: string; level: number; met: boolean; description: string }[];
  nextLevelCriteria: string[]; // what's needed to reach the next level
}

interface TPIFinancials {
  emissionTargetType?: string;
  hasBoardClimateOversight?: boolean;
  netZeroYear?: number;
  interimTargetYear?: number;
  interimTargetReduction?: number;
  executiveClimateComp?: boolean;
  externalVerification?: boolean;
  physicalRiskAssessed?: boolean;
  policyEngagementAligned?: boolean;
  supplierEngagement?: boolean;
  justTransitionPlan?: boolean;
}

const LEVEL_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Unaware', color: '#ef4444' },
  1: { label: 'Awareness', color: '#f97316' },
  2: { label: 'Building Capacity', color: '#f59e0b' },
  3: { label: 'Integrating', color: '#10b981' },
  4: { label: 'Strategic Assessment', color: '#059669' },
};

export function calcManagementQuality(financials: TPIFinancials = {}): TPIResult {
  const targetType = financials.emissionTargetType ?? 'none';
  const hasBoard = financials.hasBoardClimateOversight ?? false;
  const hasNetZero = (financials.netZeroYear ?? 0) > 0;
  const hasInterim = (financials.interimTargetYear ?? 0) > 0;
  const hasExecComp = financials.executiveClimateComp ?? false;
  const hasVerification = financials.externalVerification ?? false;
  const hasPhysicalRisk = financials.physicalRiskAssessed ?? false;
  const hasPolicyAlign = financials.policyEngagementAligned ?? false;
  const hasSupplierEng = financials.supplierEngagement ?? false;
  const hasJustTransition = financials.justTransitionPlan ?? false;
  const hasTarget = targetType !== 'none';
  const hasSBT = targetType === 'science_based';
  const hasPublicTarget = targetType === 'public' || hasSBT;

  // Define all criteria with their level requirement
  const criteria: TPIResult['criteria'] = [
    // Level 1 criteria
    { name: 'Climate policy acknowledgment', level: 1, met: hasTarget || hasBoard, description: 'Company has a climate policy or acknowledges climate as a business issue' },
    { name: 'Board oversight of climate', level: 1, met: hasBoard, description: 'Board-level oversight of climate-related issues' },

    // Level 2 criteria
    { name: 'Emission reduction targets set', level: 2, met: hasTarget, description: 'Company has set emission reduction targets (any type)' },
    { name: 'Reports emissions data', level: 2, met: hasPublicTarget, description: 'Company reports Scope 1 and Scope 2 emissions publicly' },
    { name: 'Interim targets defined', level: 2, met: hasInterim, description: 'Company has near/medium-term milestone targets' },

    // Level 3 criteria
    { name: 'External verification', level: 3, met: hasVerification, description: 'Emissions data externally verified/assured' },
    { name: 'Climate risk management', level: 3, met: hasPhysicalRisk, description: 'Climate change risks incorporated into risk management framework' },
    { name: 'Long-term net-zero target', level: 3, met: hasNetZero, description: 'Long-term quantitative target for reaching net-zero' },
    { name: 'Science-based or public target', level: 3, met: hasPublicTarget, description: 'Target is publicly disclosed or validated by SBTi' },

    // Level 4 criteria
    { name: 'Executive compensation linked', level: 4, met: hasExecComp, description: 'Executive remuneration linked to climate performance targets' },
    { name: 'Policy engagement aligned', level: 4, met: hasPolicyAlign, description: 'Climate policy engagement aligned with Paris Agreement goals' },
    { name: 'Supplier engagement', level: 4, met: hasSupplierEng, description: 'Engages suppliers on climate emissions reduction' },
    { name: 'Just transition planning', level: 4, met: hasJustTransition, description: 'Published plan addressing workforce impacts of transition' },
  ];

  // Determine level: must pass ALL criteria at each level to advance (hierarchical)
  let level = 0;
  for (let l = 1; l <= 4; l++) {
    const levelCriteria = criteria.filter(c => c.level === l);
    const allMet = levelCriteria.every(c => c.met);
    if (allMet) {
      level = l;
    } else {
      break; // Hierarchical: can't skip levels
    }
  }

  // Find what's needed for next level
  const nextLevel = Math.min(level + 1, 4);
  const nextLevelCriteria = criteria
    .filter(c => c.level === nextLevel && !c.met)
    .map(c => c.name);

  const { label, color } = LEVEL_LABELS[level];

  return {
    level,
    classification: label,
    classificationColor: color,
    criteria,
    nextLevelCriteria,
  };
}
