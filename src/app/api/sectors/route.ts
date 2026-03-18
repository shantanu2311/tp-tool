import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const sectors = await prisma.sector.findMany({
    where: { active: true },
    include: {
      methods: {
        where: { active: true },
        orderBy: { displayOrder: 'asc' },
        include: {
          applicability: {
            include: { lever: true },
          },
        },
      },
      pathways: {
        where: { active: true },
        orderBy: { displayOrder: 'asc' },
        include: {
          annualRates: { orderBy: { year: 'asc' } },
        },
      },
    },
  });

  // Fetch levers with their options separately
  const levers = await prisma.lever.findMany({
    where: { active: true },
    orderBy: { displayOrder: 'asc' },
    include: {
      options: { orderBy: { displayOrder: 'asc' } },
    },
  });

  // Attach levers to response
  const result = sectors.map((s) => ({
    ...s,
    levers,
  }));

  return NextResponse.json(result);
}
