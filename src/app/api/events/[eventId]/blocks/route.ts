import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BLOCK_TYPES, BlockType } from "@/lib/blocks";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { eventId } = await params;
  const body = await request.json();
  const { type, title, config, dayIndex } = body;

  if (typeof type !== "string" || !BLOCK_TYPES[type as BlockType]) {
    return NextResponse.json({ error: "Неизвестный тип блока" }, { status: 400 });
  }
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Укажите название блока" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Ивент не найден" }, { status: 404 });
  }

  const maxOrder = await prisma.block.aggregate({
    where: { eventId },
    _max: { sortOrder: true },
  });

  const block = await prisma.block.create({
    data: {
      eventId,
      type,
      title: title.trim(),
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
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

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
  await prisma.$transaction([
    prisma.block.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
    prisma.block.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
  ]);

  return NextResponse.json({ ok: true });
}
