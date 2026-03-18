'use client';

import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import {
  Factory,
  Calendar,
  TrendingDown,
  Timer,
  Target,
  ClipboardCheck,
  LayoutDashboard,
  RotateCcw,
  Moon,
  Sun,
} from 'lucide-react';

interface CommandPaletteProps {
  currentStep: number;
  hasSubmitted: boolean;
  onStepChange: (step: number) => void;
  onReset: () => void;
}

const STEP_ITEMS = [
  { step: 1, label: 'Sector & Company', description: 'Industry & company info', icon: Factory },
  { step: 2, label: 'Base Year', description: 'Current state', icon: Calendar },
  { step: 3, label: 'Short Term', description: 'Near-term plan', icon: TrendingDown },
  { step: 4, label: 'Medium Term', description: 'Mid-range plan', icon: Timer },
  { step: 5, label: 'Long Term', description: 'Future vision', icon: Target },
  { step: 6, label: 'Review', description: 'Verify inputs', icon: ClipboardCheck },
  { step: 7, label: 'Dashboard', description: 'Results & insights', icon: LayoutDashboard },
];

export function CommandPalette({ currentStep, hasSubmitted, onStepChange, onReset }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleStepSelect(step: number) {
    if (hasSubmitted || step <= currentStep) {
      onStepChange(step);
      setOpen(false);
    }
  }

  function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Command dialog */}
      <Command
        className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
        label="Command palette"
      >
        <Command.Input
          placeholder="Type a command or search..."
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <Command.List className="max-h-72 overflow-y-auto p-2">
          <Command.Empty className="px-4 py-6 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>

          <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {STEP_ITEMS.map((item) => {
              const disabled = !hasSubmitted && item.step > currentStep;
              const Icon = item.icon;
              return (
                <Command.Item
                  key={item.step}
                  value={`${item.label} ${item.description}`}
                  disabled={disabled}
                  onSelect={() => handleStepSelect(item.step)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary aria-disabled:opacity-40 aria-disabled:cursor-not-allowed"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="flex-1">
                    <span className="font-medium">{item.label}</span>
                    <span className="ml-2 text-muted-foreground">{item.description}</span>
                  </div>
                  {item.step === currentStep && (
                    <span className="text-[10px] text-primary font-medium">Current</span>
                  )}
                </Command.Item>
              );
            })}
          </Command.Group>

          <Command.Separator className="my-1 h-px bg-border" />

          <Command.Group heading="Actions" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            <Command.Item
              value="Toggle dark mode"
              onSelect={toggleDarkMode}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary"
            >
              <Sun className="h-4 w-4 shrink-0 dark:hidden" />
              <Moon className="h-4 w-4 shrink-0 hidden dark:block" />
              <span>Toggle dark mode</span>
            </Command.Item>
            <Command.Item
              value="Reset all data"
              onSelect={() => { onReset(); setOpen(false); }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer aria-selected:bg-primary/10 aria-selected:text-destructive"
            >
              <RotateCcw className="h-4 w-4 shrink-0" />
              <span>Reset all data</span>
            </Command.Item>
          </Command.Group>
        </Command.List>

        <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground flex items-center gap-4">
          <span><kbd className="rounded border border-border px-1 py-0.5 text-[9px]">↑↓</kbd> Navigate</span>
          <span><kbd className="rounded border border-border px-1 py-0.5 text-[9px]">↵</kbd> Select</span>
          <span><kbd className="rounded border border-border px-1 py-0.5 text-[9px]">Esc</kbd> Close</span>
        </div>
      </Command>
    </div>
  );
}
