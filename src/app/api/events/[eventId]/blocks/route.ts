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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const body = await request.json();
  const { blockId, direction } = body;

  const blocks = await prisma.block.findMany({
    where: { eventId },
    orderBy: { sortOrder: "asc" },
  });

  const idx = blocks.findIndex((b) => b.id === blockId);
  if (idx === -1) {
    return NextResponse.json({ error: "Блок не найден" }, { status: 404 });
  }

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= blocks.length) {
    return NextResponse.json({ error: "Нельзя переместить" }, { status: 400 });
  }

  // Swap sortOrder values
  const a = blocks[idx];
  const b = blocks[swapIdx];
  await prisma.block.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } });
  await prisma.block.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } });

  return NextResponse.json({ ok: true });
}
