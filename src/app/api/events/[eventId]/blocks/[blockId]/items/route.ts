import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; blockId: string }> }
) {
  const { eventId, blockId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = await request.json();

  const block = await prisma.block.findUnique({
    where: { id: blockId },
    select: { type: true, eventId: true, event: { select: { createdBy: true } } },
  });
  if (!block || block.eventId !== eventId) {
    return NextResponse.json({ error: "Блок не найден" }, { status: 404 });
  }

  let data: Record<string, unknown> = body.data ? { ...body.data } : {};

  if (block.type === "menu") {
    data = {
      ...data,
      dayIndex: typeof data.dayIndex === "number" ? data.dayIndex : 0,
      meal: data.meal,
      suggestedByUserId: user.userId,
    };
  }

  const item = await prisma.blockItem.create({
    data: {
      blockId,
      name: body.name,
      data: JSON.stringify(data),
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; blockId: string }> }
) {
  const { eventId, blockId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const block = await prisma.block.findUnique({
    where: { id: blockId },
    select: { eventId: true },
  });
  if (!block || block.eventId !== eventId) {
    return NextResponse.json({ error: "Блок не найден" }, { status: 404 });
  }

  const body = await request.json();

  if (body.updateBlock) {
    const updated = await prisma.block.update({
      where: { id: blockId },
      data: {
        config: JSON.stringify(body.config),
      },
    });
    return NextResponse.json(updated);
  }

  const { itemId, ...data } = body;

  const existing = await prisma.blockItem.findUnique({
    where: { id: itemId },
    select: { blockId: true },
  });
  if (!existing || existing.blockId !== blockId) {
    return NextResponse.json({ error: "Позиция не найдена" }, { status: 404 });
  }

  const item = await prisma.blockItem.update({
    where: { id: itemId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.data && { data: JSON.stringify(data.data) }),
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; blockId: string }> }
) {
  const { eventId, blockId } = await params;
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  if (!itemId) {
    const block = await prisma.block.findUnique({
      where: { id: blockId },
      select: { eventId: true },
    });
    if (!block || block.eventId !== eventId) {
      return NextResponse.json({ error: "Блок не найден" }, { status: 404 });
    }
    await prisma.block.delete({ where: { id: blockId } });
    return NextResponse.json({ ok: true });
  }

  const item = await prisma.blockItem.findUnique({
    where: { id: itemId },
    select: {
      data: true,
      block: { select: { type: true, eventId: true, event: { select: { createdBy: true } } } },
    },
  });
  if (!item || item.block.eventId !== eventId) {
    return NextResponse.json({ error: "Позиция не найдена" }, { status: 404 });
  }

  if (item.block.type === "menu") {
    const isAdmin = item.block.event.createdBy === user.userId;
    let parsed: { suggestedByUserId?: string | null } = {};
    try {
      parsed = JSON.parse(item.data);
    } catch {}
    const ownerId = parsed.suggestedByUserId ?? null;
    const isOwner = ownerId !== null && ownerId === user.userId;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }
  }

  await prisma.blockItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
