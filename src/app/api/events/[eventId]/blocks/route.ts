import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const body = await request.json();
  const { type, title, config, dayIndex } = body;

  const maxOrder = await prisma.block.aggregate({
    where: { eventId },
    _max: { sortOrder: true },
  });

  const block = await prisma.block.create({
    data: {
      eventId,
      type,
      title,
      config: config ? JSON.stringify(config) : "{}",
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      dayIndex: dayIndex ?? null,
    },
  });

  return NextResponse.json(block, { status: 201 });
}
