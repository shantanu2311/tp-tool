import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const levers = await prisma.lever.findMany({
    where: { active: true },
    orderBy: { displayOrder: 'asc' },
    include: {
      options: { orderBy: { displayOrder: 'asc' } },
    },
  });
  return NextResponse.json(levers);
}
