import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const templates = await prisma.eventTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = await request.json();
  const { name, blockTypes, foodNorms, equipmentItems } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json(
      { error: "Название должно содержать минимум 2 символа" },
      { status: 400 }
    );
  }

  const template = await prisma.eventTemplate.create({
    data: {
      name: name.trim(),
      blockTypes: JSON.stringify(Array.isArray(blockTypes) ? blockTypes : []),
      foodNorms: JSON.stringify(Array.isArray(foodNorms) ? foodNorms : []),
      equipmentItems: JSON.stringify(
        Array.isArray(equipmentItems) ? equipmentItems : []
      ),
      createdBy: user.userId,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
