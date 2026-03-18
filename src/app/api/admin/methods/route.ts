import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const method = await prisma.productionMethod.create({
    data: {
      name: body.name,
      sectorId: body.sectorId,
      baseCO2: body.baseCO2,
      category: body.category ?? '',
      commercialStatus: body.commercialStatus,
      trl: body.trl,
      capex: body.capex,
      energyDemand: body.energyDemand,
      deploymentTimeframe: body.deploymentTimeframe,
      description: body.description,
      baselineAssumptions: body.baselineAssumptions,
      references: body.references,
      displayOrder: body.displayOrder ?? 0,
      active: body.active ?? true,
    },
  });

  // Create applicability records if provided
  if (body.applicableLeverIds && Array.isArray(body.applicableLeverIds)) {
    for (const leverId of body.applicableLeverIds) {
      await prisma.methodLeverApplicability.create({
        data: { methodId: method.id, leverId },
      });
    }
  }

  return NextResponse.json(method, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const method = await prisma.productionMethod.update({
    where: { id: body.id },
    data: {
      name: body.name,
      baseCO2: body.baseCO2,
      category: body.category,
      commercialStatus: body.commercialStatus,
      trl: body.trl,
      capex: body.capex,
      energyDemand: body.energyDemand,
      deploymentTimeframe: body.deploymentTimeframe,
      description: body.description,
      baselineAssumptions: body.baselineAssumptions,
      references: body.references,
      displayOrder: body.displayOrder,
      active: body.active,
    },
  });

  // Update applicability if provided
  if (body.applicableLeverIds && Array.isArray(body.applicableLeverIds)) {
    await prisma.methodLeverApplicability.deleteMany({ where: { methodId: body.id } });
    for (const leverId of body.applicableLeverIds) {
      await prisma.methodLeverApplicability.create({
        data: { methodId: body.id, leverId },
      });
    }
  }

  return NextResponse.json(method);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  await prisma.methodLeverApplicability.deleteMany({ where: { methodId: id } });
  await prisma.productionMethod.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
