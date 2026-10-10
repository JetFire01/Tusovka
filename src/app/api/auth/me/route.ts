import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, nickname: true },
  });
  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: { userId: user.id, nickname: user.nickname },
  });
}
