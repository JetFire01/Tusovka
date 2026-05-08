import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;
  const template = await prisma.eventTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) {
    return NextResponse.json({ error: "Шаблон не найден" }, { status: 404 });
  }
  return NextResponse.json(template);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { templateId } = await params;
  const body = await request.json();

  const data: Record<string, string> = {};
  if (typeof body.name === "string" && body.name.trim().length >= 2) {
    data.name = body.name.trim();
  }
  if (Array.isArray(body.blockTypes)) {
    data.blockTypes = JSON.stringify(body.blockTypes);
  }
  if (Array.isArray(body.foodNorms)) {
    data.foodNorms = JSON.stringify(body.foodNorms);
  }
  if (Array.isArray(body.equipmentItems)) {
    data.equipmentItems = JSON.stringify(body.equipmentItems);
  }

  const template = await prisma.eventTemplate.update({
    where: { id: templateId },
    data,
  });

  return NextResponse.json(template);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }
  const { templateId } = await params;
  await prisma.eventTemplate.delete({ where: { id: templateId } });
  return NextResponse.json({ ok: true });
}
