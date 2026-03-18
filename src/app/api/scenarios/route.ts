import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const families = await prisma.scenarioFamily.findMany({
    include: {
      scenarios: {
        where: { active: true },
        orderBy: { displayOrder: 'asc' },
        include: {
          dataPoints: { orderBy: { year: 'asc' } },
          carbonPrices: { orderBy: { year: 'asc' } },
        },
      },
    },
  });

  return NextResponse.json(families);
}
