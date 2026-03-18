import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const pathway = await prisma.benchmarkPathway.create({
    data: {
      name: body.name,
      sectorId: body.sectorId,
      displayOrder: body.displayOrder ?? 0,
      active: body.active ?? true,
    },
  });

  if (body.annualRates && Array.isArray(body.annualRates)) {
    for (const ar of body.annualRates) {
      await prisma.pathwayAnnualRate.create({
        data: {
          pathwayId: pathway.id,
          year: ar.year,
          rate: ar.rate,
        },
      });
    }
  }

  return NextResponse.json(pathway, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const pathway = await prisma.benchmarkPathway.update({
    where: { id: body.id },
    data: {
      name: body.name,
      displayOrder: body.displayOrder,
      active: body.active,
    },
  });

  if (body.annualRates && Array.isArray(body.annualRates)) {
    // Delete and recreate for simplicity
    await prisma.pathwayAnnualRate.deleteMany({ where: { pathwayId: body.id } });
    for (const ar of body.annualRates) {
      await prisma.pathwayAnnualRate.create({
        data: {
          pathwayId: body.id,
          year: ar.year,
          rate: ar.rate,
        },
      });
    }
  }

  return NextResponse.json(pathway);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  await prisma.pathwayAnnualRate.deleteMany({ where: { pathwayId: id } });
  await prisma.benchmarkPathway.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
