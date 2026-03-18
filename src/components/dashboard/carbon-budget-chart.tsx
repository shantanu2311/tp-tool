'use client';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CarbonBudgetResult, CarbonCostResult, ScenarioData } from '@/lib/calc-engine/types';
import { getScenarioColor } from './scenario-selector';

// ── Carbon Budget Chart ──

interface CarbonBudgetChartProps {
  budget: CarbonBudgetResult;
}

export function CarbonBudgetChart({ budget }: CarbonBudgetChartProps) {
  if (budget.yearlyData.length === 0) return null;

  const data = budget.yearlyData.map((d) => ({
    year: d.year,
    cumulative: d.cumulative,
    budget: d.budget,
    remaining: Math.max(0, d.budget - d.cumulative),
  }));

  const budgetExhausted = budget.exhaustionYear !== null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Carbon Budget Consumption</CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Cumulative emissions vs. fair-share 1.5°C carbon budget (MtCO₂)
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums">
              {budget.remainingBudgetMt > 0 ? (
                <span className="text-emerald-600">{budget.remainingBudgetMt.toFixed(0)}</span>
              ) : (
                <span className="text-red-600">Exceeded</span>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {budget.remainingBudgetMt > 0 ? 'Mt remaining' : `since ${budget.exhaustionYear}`}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="budgetCumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={budgetExhausted ? '#ef4444' : '#6366f1'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={budgetExhausted ? '#ef4444' : '#6366f1'} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.35} vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} width={55} tickFormatter={(v: number) => `${v.toFixed(0)}`} />

            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-card, white)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                fontSize: '12px',
                boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.08)',
                padding: '10px 14px',
              }}
              labelFormatter={(label) => `Year ${label}`}
              formatter={(value, name) => {
                const label = String(name) === 'cumulative' ? 'Cumulative Emissions' : 'Budget Limit';
                return [`${Number(value).toFixed(1)} Mt`, label];
              }}
            />

            {/* Budget limit reference line */}
            <ReferenceLine
              y={budget.fairShareBudgetMt}
              stroke="#ef4444"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: `Budget: ${budget.fairShareBudgetMt.toFixed(0)} Mt`,
                position: 'insideTopRight',
                fontSize: 10,
                fill: '#ef4444',
              }}
            />

            <Area
              type="monotone"
              dataKey="cumulative"
              stroke={budgetExhausted ? '#ef4444' : '#6366f1'}
              strokeWidth={2}
              fill="url(#budgetCumulativeGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="mt-2 flex items-center gap-6 border-t border-border pt-2 text-[11px] text-muted-foreground">
          <span>Fair-share budget: <strong>{budget.fairShareBudgetMt.toFixed(0)} Mt</strong></span>
          <span>Used: <strong>{budget.cumulativeEmissionsMt.toFixed(0)} Mt</strong> ({((budget.cumulativeEmissionsMt / budget.fairShareBudgetMt) * 100).toFixed(0)}%)</span>
          {budget.exhaustionYear && (
            <span className="text-red-600">Budget exhausted in <strong>{budget.exhaustionYear}</strong></span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Carbon Cost Chart ──

interface CarbonCostChartProps {
  costs: CarbonCostResult[];
  scenarios: ScenarioData[];
  selectedIds: Set<string>;
}

export function CarbonCostChart({ costs, scenarios, selectedIds }: CarbonCostChartProps) {
  const selectedCosts = costs.filter((c) => selectedIds.has(c.scenarioId));
  if (selectedCosts.length === 0) return null;

  // Build combined data: one entry per year with each scenario's cost
  const yearMap = new Map<number, Record<string, number>>();
  for (const sc of selectedCosts) {
    for (const ac of sc.annualCosts) {
      if (!yearMap.has(ac.year)) yearMap.set(ac.year, { year: ac.year });
      yearMap.get(ac.year)![sc.scenarioId] = ac.totalCost;
    }
  }
  const data = Array.from(yearMap.values()).sort((a, b) => (a.year as number) - (b.year as number));

  // Total cumulative cost across selected scenarios
  const maxCost = Math.max(...selectedCosts.map((c) => c.cumulativeCost));
  const maxScenario = selectedCosts.find((c) => c.cumulativeCost === maxCost);
  const maxSc = scenarios.find((s) => s.id === maxScenario?.scenarioId);

  let colorIndex = 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Carbon Cost Exposure</CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Annual carbon cost under each scenario's price trajectory (USD M)
            </p>
          </div>
          {maxSc && (
            <div className="text-right">
              <p className="text-lg font-bold tabular-nums text-red-600">
                ${maxCost.toFixed(0)}M
              </p>
              <p className="text-[10px] text-muted-foreground">
                worst case ({maxSc.shortName})
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.35} vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} width={55} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />

            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-card, white)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                fontSize: '12px',
                boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.08)',
                padding: '10px 14px',
              }}
              labelFormatter={(label) => `Year ${label}`}
              formatter={(value, name) => {
                const sc = scenarios.find((s) => s.id === String(name));
                return [`$${Number(value).toFixed(1)}M`, sc ? `${sc.shortName} (${sc.temperatureOutcome}°C)` : String(name)];
              }}
            />

            {selectedCosts.map((sc) => {
              const color = getScenarioColor(
                scenarios.find((s) => s.id === sc.scenarioId)?.shortName ?? '',
                colorIndex++
              );
              return (
                <Bar
                  key={sc.scenarioId}
                  dataKey={sc.scenarioId}
                  fill={color}
                  fillOpacity={0.75}
                  radius={[2, 2, 0, 0]}
                  name={sc.scenarioId}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-2 flex flex-wrap items-center gap-4 border-t border-border pt-2 text-[11px] text-muted-foreground">
          {(() => { colorIndex = 0; return null; })()}
          {selectedCosts.map((sc) => {
            const scData = scenarios.find((s) => s.id === sc.scenarioId);
            const color = getScenarioColor(scData?.shortName ?? '', colorIndex++);
            return (
              <span key={sc.scenarioId} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
                {scData?.shortName}: ${sc.cumulativeCost.toFixed(0)}M total
              </span>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
