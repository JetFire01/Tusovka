import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = await request.json();
  const { blockItemId, claimType, data } = body;

  if (typeof blockItemId !== "string" || typeof claimType !== "string") {
    return NextResponse.json(
      { error: "blockItemId и claimType обязательны" },
      { status: 400 }
    );
  }

  const blockItem = await prisma.blockItem.findUnique({
    where: { id: blockItemId },
    select: { block: { select: { eventId: true } } },
  });
  if (!blockItem || blockItem.block.eventId !== eventId) {
    return NextResponse.json({ error: "Позиция не найдена" }, { status: 404 });
  }

  const claim = await prisma.claim.upsert({
    where: {
      blockItemId_userId_claimType: {
        blockItemId,
        userId: user.userId,
        claimType,
      },
    },
    create: {
      blockItemId,
      userId: user.userId,
      claimType,
      data: data ? JSON.stringify(data) : "{}",
    },
    update: {
      data: data ? JSON.stringify(data) : "{}",
    },
  });

  return NextResponse.json(claim);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const claimId = searchParams.get("claimId");

  if (!claimId) {
    return NextResponse.json({ error: "claimId обязателен" }, { status: 400 });
  }

  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    select: {
      userId: true,
      blockItem: {
        select: { block: { select: { eventId: true, event: { select: { createdBy: true } } } } },
      },
    },
  });
  if (!claim || claim.blockItem.block.eventId !== eventId) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }
  const isOwner = claim.userId === user.userId;
  const isEventCreator = claim.blockItem.block.event.createdBy === user.userId;
  if (!isOwner && !isEventCreator) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  await prisma.claim.delete({ where: { id: claimId } });
  return NextResponse.json({ ok: true });
}
