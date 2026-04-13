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

  if (!item || amount === undefined || amount <= 0) {
    return NextResponse.json(
      { error: "Укажите товар и сумму" },
      { status: 400 }
    );
  }

  const purchase = await prisma.purchase.create({
    data: {
      eventId,
      buyerId: body.buyerId || user.userId,
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
  await params;
  const { searchParams } = new URL(request.url);
  const purchaseId = searchParams.get("purchaseId");

  if (!purchaseId) {
    return NextResponse.json(
      { error: "purchaseId обязателен" },
      { status: 400 }
    );
  }

  await prisma.purchase.delete({ where: { id: purchaseId } });
  return NextResponse.json({ ok: true });
}
