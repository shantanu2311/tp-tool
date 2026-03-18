import { NextRequest, NextResponse } from 'next/server';
import { calculate } from '@/lib/calc-engine';
import type { ScenarioInput, MethodData } from '@/lib/calc-engine';

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();

    // Rehydrate Set objects from JSON arrays
    // (Sets serialize as {} in JSON, so the client sends arrays instead)
    const input: ScenarioInput = {
      ...raw,
      methodDataMap: Object.fromEntries(
        Object.entries(raw.methodDataMap as Record<string, MethodData & { applicableLevers: string[] | Set<string> }>).map(
          ([id, m]) => [
            id,
            {
              ...m,
              applicableLevers: m.applicableLevers instanceof Set
                ? m.applicableLevers
                : new Set(Array.isArray(m.applicableLevers) ? m.applicableLevers : []),
            },
          ]
        )
      ),
    };

    const result = calculate(input);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Calculation error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
