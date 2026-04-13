import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePin, hashPin, createToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { nickname } = body;

  if (!nickname || typeof nickname !== "string" || nickname.trim().length < 2) {
    return NextResponse.json(
      { error: "Никнейм должен содержать минимум 2 символа" },
      { status: 400 }
    );
  }

  const trimmedNickname = nickname.trim();
  const pin = generatePin();
  const pinHash = await hashPin(pin);

  const user = await prisma.user.create({
    data: {
      nickname: trimmedNickname,
      pinHash,
    },
  });

  const token = await createToken(user.id);

  const response = NextResponse.json({
    userId: user.id,
    nickname: user.nickname,
    pin,
    displayName: `${user.nickname}#${pin}`,
  });

  response.cookies.set("auth-token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}
