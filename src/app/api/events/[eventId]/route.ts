import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
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
  const { eventId } = await params;
  const body = await request.json();

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
    },
  });

  return NextResponse.json(event);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  await prisma.event.delete({ where: { id: eventId } });
  return NextResponse.json({ ok: true });
}
