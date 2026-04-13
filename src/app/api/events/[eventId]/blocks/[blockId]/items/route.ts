import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; blockId: string }> }
) {
  const { blockId } = await params;
  const body = await request.json();

  const item = await prisma.blockItem.create({
    data: {
      blockId,
      name: body.name,
      data: body.data ? JSON.stringify(body.data) : "{}",
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; blockId: string }> }
) {
  const { blockId } = await params;
  const body = await request.json();

  // Update block config
  if (body.updateBlock) {
    const block = await prisma.block.update({
      where: { id: blockId },
      data: {
        config: JSON.stringify(body.config),
      },
    });
    return NextResponse.json(block);
  }

  const { itemId, ...data } = body;

  const item = await prisma.blockItem.update({
    where: { id: itemId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.data && { data: JSON.stringify(data.data) }),
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; blockId: string }> }
) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");

  if (!itemId) {
    const { blockId } = await params;
    // Delete the block itself
    await prisma.block.delete({ where: { id: blockId } });
    return NextResponse.json({ ok: true });
  }

  await prisma.blockItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
