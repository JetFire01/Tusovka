import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { participants: true } },
      blocks: { select: { type: true } },
    },
  });

  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, startDate, endDate, numDays } = body;

  if (!title || typeof title !== "string" || title.trim().length < 2) {
    return NextResponse.json(
      { error: "Название должно содержать минимум 2 символа" },
      { status: 400 }
    );
  }

  const event = await prisma.event.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      startDate: startDate || null,
      endDate: endDate || null,
      numDays: numDays || 1,
      createdBy: user.userId,
    },
  });

  // Auto-join creator as participant
  await prisma.participant.create({
    data: {
      eventId: event.id,
      userId: user.userId,
      attending: "yes",
    },
  });

  return NextResponse.json(event, { status: 201 });
}
