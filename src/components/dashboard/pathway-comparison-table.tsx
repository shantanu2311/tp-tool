'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { PathwayComparisonRow, PeriodResult } from '@/lib/calc-engine/types';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

function AlignmentBadge({ ratio }: { ratio: number }) {
  if (ratio <= 0) return <Badge variant="secondary" className="text-[10px]">N/A</Badge>;
  if (ratio >= 1.0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <CheckCircle className="h-3 w-3" />
        {ratio.toFixed(2)}
      </span>
    );
  }
  if (ratio >= 0.7) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        <AlertCircle className="h-3 w-3" />
        {ratio.toFixed(2)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
      <XCircle className="h-3 w-3" />
      {ratio.toFixed(2)}
    </span>
  );
}

export function PathwayComparisonTable({
  comparisons,
  periods,
}: {
  comparisons: PathwayComparisonRow[];
  periods: PeriodResult[];
}) {
  if (comparisons.length === 0 || periods.length < 2) return null;

  const milestones = ['ST', 'MT', 'LT'];
  const milestonePeriods = periods.slice(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Pathway Alignment Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Benchmark Pathway</TableHead>
                {milestones.map((m, i) => {
                  if (i >= milestonePeriods.length) return null;
                  return (
                    <TableHead key={m} className="text-center">
                      <div className="text-xs">{m} ({milestonePeriods[i].year})</div>
                      <div className="text-[10px] font-normal text-muted-foreground">Benchmark</div>
                    </TableHead>
                  );
                })}
                {milestones.map((m, i) => {
                  if (i >= milestonePeriods.length) return null;
                  return (
                    <TableHead key={`ratio-${m}`} className="text-center">
                      <div className="text-xs">{m} Ratio</div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons.map((row) => (
                <TableRow key={row.pathwayId} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-sm">{row.pathwayName}</TableCell>
                  {milestones.map((m, i) => {
                    if (i >= milestonePeriods.length) return null;
                    return (
                      <TableCell key={m} className="text-center font-mono text-xs">
                        {row.milestoneIntensities[m]?.toFixed(3) ?? '-'}
                      </TableCell>
                    );
                  })}
                  {milestones.map((m, i) => {
                    if (i >= milestonePeriods.length) return null;
                    return (
                      <TableCell key={`ratio-${m}`} className="text-center">
                        <AlignmentBadge ratio={row.alignmentRatios[m] ?? 0} />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle className="h-2.5 w-2.5 text-emerald-700" />
            </span>
            Aligned
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-50">
              <AlertCircle className="h-2.5 w-2.5 text-amber-700" />
            </span>
            Partial
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-2.5 w-2.5 text-red-700" />
            </span>
            Misaligned
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
