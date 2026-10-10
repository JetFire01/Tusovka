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
  const { category, item, amount, splitRule, blockId } = body;

  if (
    !item ||
    typeof item !== "string" ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return NextResponse.json(
      { error: "Укажите товар и сумму" },
      { status: 400 }
    );
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Ивент не найден" }, { status: 404 });
  }

  const buyerId: string = body.buyerId || user.userId;
  const buyerParticipant = await prisma.participant.findUnique({
    where: { eventId_userId: { eventId, userId: buyerId } },
  });
  if (!buyerParticipant) {
    return NextResponse.json(
      { error: "Покупатель не участвует в этом ивенте" },
      { status: 400 }
    );
  }

  const purchase = await prisma.purchase.create({
    data: {
      eventId,
      buyerId,
      category: category || "other",
      item,
      amount,
      splitRule: splitRule || "all",
      blockId: blockId || null,
    },
  });

  return NextResponse.json(purchase, { status: 201 });
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
  const purchaseId = searchParams.get("purchaseId");

  if (!purchaseId) {
    return NextResponse.json(
      { error: "purchaseId обязателен" },
      { status: 400 }
    );
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    select: { eventId: true, buyerId: true, event: { select: { createdBy: true } } },
  });
  if (!purchase || purchase.eventId !== eventId) {
    return NextResponse.json({ error: "Покупка не найдена" }, { status: 404 });
  }
  if (purchase.buyerId !== user.userId && purchase.event.createdBy !== user.userId) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  await prisma.purchase.delete({ where: { id: purchaseId } });
  return NextResponse.json({ ok: true });
}
