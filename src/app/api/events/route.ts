import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BLOCK_TYPES, BlockType } from "@/lib/blocks";

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
  const { title, description, startDate, endDate, numDays, eventTypeId } = body;

  if (!title || typeof title !== "string" || title.trim().length < 2) {
    return NextResponse.json(
      { error: "Название должно содержать минимум 2 символа" },
      { status: 400 }
    );
  }

  const template = eventTypeId
    ? await prisma.eventTemplate.findUnique({ where: { id: eventTypeId } })
    : null;

  const event = await prisma.event.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      startDate: startDate || null,
      endDate: endDate || null,
      numDays: numDays || 1,
      eventTypeId: template ? template.id : null,
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

  if (template) {
    let blockTypes: string[] = [];
    let foodNorms: unknown[] = [];
    let equipmentItems: Array<{ name: string; quantity?: string; itemMode?: string }> = [];
    try { blockTypes = JSON.parse(template.blockTypes); } catch {}
    try { foodNorms = JSON.parse(template.foodNorms); } catch {}
    try { equipmentItems = JSON.parse(template.equipmentItems); } catch {}

    let order = 0;
    for (const type of blockTypes) {
      const config = BLOCK_TYPES[type as BlockType];
      if (!config) continue;
      const blockConfig: Record<string, unknown> = {};
      if (type === "food" && Array.isArray(foodNorms) && foodNorms.length > 0) {
        blockConfig.foodNorms = foodNorms;
      }
      const created = await prisma.block.create({
        data: {
          eventId: event.id,
          type,
          title: config.defaultTitle,
          config: JSON.stringify(blockConfig),
          sortOrder: order++,
        },
      });

      if (type === "equipment" && Array.isArray(equipmentItems) && equipmentItems.length > 0) {
        for (const item of equipmentItems) {
          if (!item || typeof item.name !== "string" || !item.name.trim()) continue;
          const data: Record<string, unknown> = {
            itemMode: item.itemMode === "buy" ? "buy" : "bring",
          };
          if (item.quantity) data.quantity = item.quantity;
          await prisma.blockItem.create({
            data: {
              blockId: created.id,
              name: item.name.trim(),
              data: JSON.stringify(data),
            },
          });
        }
      }
    }
  }

  return NextResponse.json(event, { status: 201 });
}
