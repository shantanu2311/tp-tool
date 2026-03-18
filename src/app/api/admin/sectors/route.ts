import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const sectors = await prisma.sector.findMany({
    include: {
      methods: {
        orderBy: { displayOrder: 'asc' },
        include: {
          applicability: {
            include: { lever: true },
          },
        },
      },
      pathways: {
        orderBy: { displayOrder: 'asc' },
        include: {
          annualRates: { orderBy: { year: 'asc' } },
        },
      },
    },
  });

  // Also include levers with options
  const levers = await prisma.lever.findMany({
    orderBy: { displayOrder: 'asc' },
    include: {
      options: { orderBy: { displayOrder: 'asc' } },
    },
  });

  const result = sectors.map((s) => ({ ...s, levers }));
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sector = await prisma.sector.create({
    data: {
      name: body.name,
      description: body.description ?? null,
      active: body.active ?? true,
    },
  });
  return NextResponse.json(sector, { status: 201 });
}
