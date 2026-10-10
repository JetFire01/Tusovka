import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Ивент не найден" }, { status: 404 });
  }

  const existing = await prisma.participant.findUnique({
    where: {
      eventId_userId: { eventId, userId: user.userId },
    },
  });

  if (existing) {
    return NextResponse.json(existing);
  }

  const participant = await prisma.participant.create({
    data: {
      eventId,
      userId: user.userId,
      attending: "yes",
    },
  });

  return NextResponse.json(participant, { status: 201 });
}
