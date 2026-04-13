import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPin, createToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { nickname, pin } = body;

  if (!nickname || !pin) {
    return NextResponse.json(
      { error: "Введите никнейм и PIN-код" },
      { status: 400 }
    );
  }

  const pinHash = await hashPin(pin);

  const user = await prisma.user.findUnique({
    where: {
      nickname_pinHash: {
        nickname: nickname.trim(),
        pinHash,
      },
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Неверный никнейм или PIN-код" },
      { status: 401 }
    );
  }

  const token = await createToken(user.id);

  const response = NextResponse.json({
    userId: user.id,
    nickname: user.nickname,
  });

  response.cookies.set("auth-token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}
