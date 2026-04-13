import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPin, createToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { pin } = body;

  if (!pin) {
    return NextResponse.json(
      { error: "Введите PIN-код" },
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

  response.cookies.set("auth-token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}
