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

  const [event, blocks, items, claims, responses, participants] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      select: { updatedAt: true },
    }),
    prisma.block.aggregate({
      where: { eventId },
      _max: { updatedAt: true },
    }),
    prisma.blockItem.aggregate({
      where: { block: { eventId } },
      _max: { updatedAt: true },
    }),
    prisma.claim.aggregate({
      where: { blockItem: { block: { eventId } } },
      _max: { updatedAt: true },
    }),
    prisma.surveyResponse.aggregate({
      where: { block: { eventId } },
      _max: { updatedAt: true },
    }),
    prisma.participant.aggregate({
      where: { eventId },
      _max: { updatedAt: true },
      _count: true,
    }),
  ]);

  if (!event) {
    return NextResponse.json({ error: "Ивент не найден" }, { status: 404 });
  }

  const candidates = [
    event.updatedAt,
    blocks._max.updatedAt,
    items._max.updatedAt,
    claims._max.updatedAt,
    responses._max.updatedAt,
    participants._max.updatedAt,
  ].filter((d): d is Date => d != null);

  const updatedAt = candidates.length
    ? new Date(Math.max(...candidates.map((d) => d.getTime())))
    : event.updatedAt;

  return NextResponse.json({
    updatedAt,
    participantCount: participants._count,
  });
}
