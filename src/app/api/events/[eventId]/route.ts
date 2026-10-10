import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }
  const { eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      blocks: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            include: {
              claims: {
                include: { user: { select: { id: true, nickname: true } } },
              },
            },
          },
        },
      },
      participants: {
        include: {
          user: { select: { id: true, nickname: true } },
          surveyResponses: true,
        },
      },
      purchases: {
        include: {
          buyer: { select: { id: true, nickname: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Ивент не найден" }, { status: 404 });
  }

  return NextResponse.json(event);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }
  const { eventId } = await params;

  const participant = await prisma.participant.findUnique({
    where: { eventId_userId: { eventId, userId: user.userId } },
  });
  if (!participant) {
    return NextResponse.json(
      { error: "Изменять ивент могут только его участники" },
      { status: 403 }
    );
  }

  const body = await request.json();

  if (body.numDays !== undefined) {
    const n = Number(body.numDays);
    if (!Number.isInteger(n) || n < 1 || n > 60) {
      return NextResponse.json(
        { error: "numDays должен быть целым числом от 1 до 60" },
        { status: 400 }
      );
    }
    body.numDays = n;
  }

  const event = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...(body.title && { title: body.title.trim() }),
      ...(body.description !== undefined && {
        description: body.description?.trim() || null,
      }),
      ...(body.startDate !== undefined && { startDate: body.startDate }),
      ...(body.endDate !== undefined && { endDate: body.endDate }),
      ...(body.numDays !== undefined && { numDays: body.numDays }),
      ...(body.eventTypeId !== undefined && {
        eventTypeId: body.eventTypeId || null,
      }),
    },
  });

  return NextResponse.json(event);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }
  const { eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { createdBy: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Ивент не найден" }, { status: 404 });
  }
  if (event.createdBy !== user.userId) {
    return NextResponse.json(
      { error: "Удалить ивент может только его создатель" },
      { status: 403 }
    );
  }

  await prisma.event.delete({ where: { id: eventId } });
  return NextResponse.json({ ok: true });
}
