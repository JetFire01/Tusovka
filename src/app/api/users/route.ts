import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPin } from "@/lib/auth";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nickname: true,
      createdAt: true,
    },
  });

  return NextResponse.json(users);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { userId, nickname, newPin } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId обязателен" }, { status: 400 });
  }

  const updateData: Record<string, string> = {};

  if (nickname !== undefined) {
    if (nickname.trim().length < 2) {
      return NextResponse.json(
        { error: "Никнейм должен содержать минимум 2 символа" },
        { status: 400 }
      );
    }
    updateData.nickname = nickname.trim();
  }

  if (newPin !== undefined) {
    if (!/^\d{4}$/.test(newPin)) {
      return NextResponse.json(
        { error: "PIN должен содержать 4 цифры" },
        { status: 400 }
      );
    }
    updateData.pinHash = await hashPin(newPin);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return NextResponse.json({ id: user.id, nickname: user.nickname });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId обязателен" }, { status: 400 });
  }

  // Delete all related data first
  await prisma.claim.deleteMany({ where: { userId } });
  await prisma.participant.deleteMany({ where: { userId } });
  await prisma.purchase.deleteMany({ where: { buyerId: userId } });
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true });
}
