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
  const { blockId, response, attending, arrivalDay, expectedVersion } = body;

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

    const responseJson = JSON.stringify(response);
    const existing = await prisma.surveyResponse.findUnique({
      where: {
        participantId_blockId: {
          participantId: participant.id,
          blockId,
        },
      },
    });

    if (!existing) {
      // First save: only allowed when client thinks it's creating (no version or 0).
      if (expectedVersion !== undefined && expectedVersion !== 0 && expectedVersion !== null) {
        return NextResponse.json(
          {
            error: "conflict",
            current: { response: {}, version: 0, updatedAt: null },
          },
          { status: 409 }
        );
      }
      try {
        const created = await prisma.surveyResponse.create({
          data: {
            participantId: participant.id,
            blockId,
            response: responseJson,
            version: 1,
          },
        });
        return NextResponse.json({
          ok: true,
          version: created.version,
          updatedAt: created.updatedAt,
        });
      } catch {
        // Lost race on unique constraint — refetch and return as conflict.
        const current = await prisma.surveyResponse.findUnique({
          where: {
            participantId_blockId: {
              participantId: participant.id,
              blockId,
            },
          },
        });
        return NextResponse.json(
          {
            error: "conflict",
            current: current
              ? {
                  response: JSON.parse(current.response),
                  version: current.version,
                  updatedAt: current.updatedAt,
                }
              : null,
          },
          { status: 409 }
        );
      }
    }

    // Update path with version guard.
    if (expectedVersion === undefined || expectedVersion === null) {
      return NextResponse.json(
        { error: "expectedVersion is required for updates" },
        { status: 400 }
      );
    }

    const result = await prisma.surveyResponse.updateMany({
      where: {
        id: existing.id,
        version: expectedVersion,
      },
      data: {
        response: responseJson,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      const current = await prisma.surveyResponse.findUnique({
        where: { id: existing.id },
      });
      return NextResponse.json(
        {
          error: "conflict",
          current: current
            ? {
                response: JSON.parse(current.response),
                version: current.version,
                updatedAt: current.updatedAt,
              }
            : null,
        },
        { status: 409 }
      );
    }

    const fresh = await prisma.surveyResponse.findUnique({
      where: { id: existing.id },
      select: { version: true, updatedAt: true },
    });
    return NextResponse.json({
      ok: true,
      version: fresh?.version,
      updatedAt: fresh?.updatedAt,
    });
  }

  return NextResponse.json({ ok: true });
}
