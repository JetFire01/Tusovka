import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPin, createToken, AUTH_COOKIE, authCookieOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много попыток входа, попробуйте позже" },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { pin } = body;

  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    return NextResponse.json(
      { error: "Введите PIN-код (4 цифры)" },
      { status: 400 }
    );
  }

  const pinHash = await hashPin(pin);

  // Find user by PIN hash only
  const user = await prisma.user.findFirst({
    where: { pinHash },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Неверный PIN-код" },
      { status: 401 }
    );
  }

  const token = await createToken(user.id);

  const response = NextResponse.json({
    userId: user.id,
    nickname: user.nickname,
  });

  response.cookies.set(AUTH_COOKIE, token, authCookieOptions);

  return response;
}
