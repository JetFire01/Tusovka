import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = await request.json();
  const { blockId, response, attending, arrivalDay } = body;

  // Update participant info if provided
  if (attending !== undefined || arrivalDay !== undefined) {
    await prisma.participant.update({
      where: {
        eventId_userId: { eventId, userId: user.userId },
      },
      data: {
        ...(attending !== undefined && { attending }),
        ...(arrivalDay !== undefined && { arrivalDay }),
      },
    });
  }

  // Update survey response if blockId provided
  if (blockId && response !== undefined) {
    const participant = await prisma.participant.findUnique({
      where: {
        eventId_userId: { eventId, userId: user.userId },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Вы не участник этого ивента" },
        { status: 403 }
      );
    }

    await prisma.surveyResponse.upsert({
      where: {
        participantId_blockId: {
          participantId: participant.id,
          blockId,
        },
      },
      create: {
        participantId: participant.id,
        blockId,
        response: JSON.stringify(response),
      },
      update: {
        response: JSON.stringify(response),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
