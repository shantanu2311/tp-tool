'use client';

import { cn } from '@/lib/utils';
import {
  Factory,
  Calendar,
  TrendingDown,
  Timer,
  Target,
  ClipboardCheck,
  LayoutDashboard,
  Check,
} from 'lucide-react';

interface Step {
  number: number;
  label: string;
  description: string;
  icon: React.ElementType;
}

const steps: Step[] = [
  { number: 1, label: 'Sector & Company', description: 'Industry & company info', icon: Factory },
  { number: 2, label: 'Base Year', description: 'Current state', icon: Calendar },
  { number: 3, label: 'Short Term', description: 'Near-term plan', icon: TrendingDown },
  { number: 4, label: 'Medium Term', description: 'Mid-range plan', icon: Timer },
  { number: 5, label: 'Long Term', description: 'Future vision', icon: Target },
  { number: 6, label: 'Review', description: 'Verify inputs', icon: ClipboardCheck },
  { number: 7, label: 'Dashboard', description: 'Results & insights', icon: LayoutDashboard },
];

export function Stepper({
  currentStep,
  hasSubmitted = false,
  isDirty = false,
  onStepClick,
}: {
  currentStep: number;
  hasSubmitted?: boolean;
  isDirty?: boolean;
  onStepClick: (step: number) => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5 px-2 py-1">
      {steps.map((step) => {
        const isActive = step.number === currentStep;
        const isCompleted = hasSubmitted ? step.number !== currentStep : step.number < currentStep;
        const isFuture = !hasSubmitted && step.number > currentStep;
        const Icon = step.icon;

        return (
          <button
            key={step.number}
            onClick={() => onStepClick(step.number)}
            disabled={isFuture}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150',
              isActive && 'bg-primary/10 text-primary',
              isCompleted && 'text-foreground hover:bg-muted cursor-pointer',
              isFuture && 'text-muted-foreground/50 cursor-not-allowed',
            )}
          >
            {/* Step indicator */}
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-colors',
                isActive && 'bg-primary text-primary-foreground shadow-sm',
                isCompleted && 'bg-primary/10 text-primary',
                isFuture && 'bg-muted text-muted-foreground/50',
              )}
            >
              {isCompleted ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
            </div>

            {/* Label & description */}
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  'text-sm font-medium leading-tight',
                  isActive && 'text-primary',
                  isCompleted && 'text-foreground',
                  isFuture && 'text-muted-foreground/50',
                )}
              >
                {step.label}
              </div>
              <div
                className={cn(
                  'text-xs leading-tight',
                  isActive ? 'text-primary/70' : 'text-muted-foreground/60',
                  isFuture && 'text-muted-foreground/30',
                )}
              >
                {step.description}
              </div>
            </div>

            {/* Dirty indicator for step 8 */}
            {step.number === 7 && isDirty && !isActive && (
              <span className="ml-auto h-2 w-2 rounded-full bg-amber-500" />
            )}

            {/* Active indicator bar */}
            {isActive && (
              <div className="h-5 w-0.5 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
