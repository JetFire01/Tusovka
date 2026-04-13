import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = await request.json();
  const { blockItemId, claimType, data } = body;

  const claim = await prisma.claim.upsert({
    where: {
      blockItemId_userId_claimType: {
        blockItemId,
        userId: user.userId,
        claimType,
      },
    },
    create: {
      blockItemId,
      userId: user.userId,
      claimType,
      data: data ? JSON.stringify(data) : "{}",
    },
    update: {
      data: data ? JSON.stringify(data) : "{}",
    },
  });

  return NextResponse.json(claim);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const claimId = searchParams.get("claimId");

  if (!claimId) {
    return NextResponse.json({ error: "claimId обязателен" }, { status: 400 });
  }

  await prisma.claim.delete({ where: { id: claimId } });
  return NextResponse.json({ ok: true });
}
