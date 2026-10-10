import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashPin } from "@/lib/auth";

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
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = await request.json();
  const { userId, nickname, newPin } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId обязателен" }, { status: 400 });
  }
  if (userId !== current.userId) {
    return NextResponse.json(
      { error: "Можно изменять только свою учётную запись" },
      { status: 403 }
    );
  }

  const updateData: Record<string, string> = {};

  if (nickname !== undefined) {
    if (typeof nickname !== "string" || nickname.trim().length < 2) {
      return NextResponse.json(
        { error: "Никнейм должен содержать минимум 2 символа" },
        { status: 400 }
      );
    }
    updateData.nickname = nickname.trim();
  }

  if (newPin !== undefined) {
    if (typeof newPin !== "string" || !/^\d{4}$/.test(newPin)) {
      return NextResponse.json(
        { error: "PIN должен содержать 4 цифры" },
        { status: 400 }
      );
    }
    const pinHash = await hashPin(newPin);
    const existing = await prisma.user.findFirst({
      where: { pinHash, id: { not: userId } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Этот PIN уже занят, выберите другой" },
        { status: 409 }
      );
    }
    updateData.pinHash = pinHash;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return NextResponse.json({ id: user.id, nickname: user.nickname });
}

export async function DELETE(request: NextRequest) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId обязателен" }, { status: 400 });
  }
  if (userId !== current.userId) {
    return NextResponse.json(
      { error: "Можно удалить только свою учётную запись" },
      { status: 403 }
    );
  }

  await prisma.$transaction([
    prisma.claim.deleteMany({ where: { userId } }),
    prisma.participant.deleteMany({ where: { userId } }),
    prisma.purchase.deleteMany({ where: { buyerId: userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  const response = NextResponse.json({ ok: true });
  response.cookies.set("auth-token", "", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
