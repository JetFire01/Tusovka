import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePin, hashPin, createToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nickname } = body;

    if (!nickname || typeof nickname !== "string" || nickname.trim().length < 2) {
      return NextResponse.json(
        { error: "Никнейм должен содержать минимум 2 символа" },
        { status: 400 }
      );
    }

    const trimmedNickname = nickname.trim();

    // Generate unique PIN (retry if collision)
    let pin: string;
    let pinHash: string;
    let attempts = 0;
    do {
      pin = generatePin();
      pinHash = await hashPin(pin);
      const existing = await prisma.user.findFirst({ where: { pinHash } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return NextResponse.json(
        { error: "Не удалось сгенерировать уникальный PIN, попробуйте ещё раз" },
        { status: 500 }
      );
    }

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
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: `Ошибка регистрации: ${err instanceof Error ? err.message : "неизвестная ошибка"}` },
      { status: 500 }
    );
  }
}
