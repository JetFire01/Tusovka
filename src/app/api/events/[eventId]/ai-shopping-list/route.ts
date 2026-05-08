import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { callGemini, GeminiError } from "@/lib/gemini";

interface FoodNormProduct {
  product: string;
  quantity: string;
  unit: string;
}

interface FoodNormSubblock {
  name: string;
  items: FoodNormProduct[];
}

interface MenuItemData {
  dayIndex?: number;
  meal?: string;
  suggestedByUserId?: string | null;
}

interface AIShoppingItem {
  name: string;
  quantity: string;
  notes?: string;
  source?: string;
}

interface AIShoppingResult {
  items: AIShoppingItem[];
  rationale: string;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Название продукта" },
          quantity: {
            type: "string",
            description: "Количество с единицей измерения, например '5 кг' или '12 шт'",
          },
          notes: {
            type: "string",
            description: "Краткое пояснение, для какого блюда нужен продукт",
          },
        },
        required: ["name", "quantity"],
      },
    },
    rationale: {
      type: "string",
      description:
        "Краткое объяснение (1-3 предложения) — учтены ли замечания афтепати, как считалось количество",
    },
  },
  required: ["items", "rationale"],
};

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { eventId } = await params;
  const body = await request.json().catch(() => ({}));
  const extraInstructions: string | undefined =
    typeof body?.extraInstructions === "string" ? body.extraInstructions.trim() : undefined;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      blocks: { include: { items: true } },
      participants: true,
      eventType: true,
    },
  });
  if (!event) {
    return NextResponse.json({ error: "Ивент не найден" }, { status: 404 });
  }

  const menuBlock = event.blocks.find((b) => b.type === "menu");
  const menuItems = (menuBlock?.items ?? []).map((it) => {
    const d = safeParse<MenuItemData>(it.data, {});
    return {
      name: it.name,
      dayIndex: typeof d.dayIndex === "number" ? d.dayIndex : 0,
      meal: d.meal || "",
    };
  });

  if (menuItems.length === 0) {
    return NextResponse.json(
      { error: "В блоке Меню нет блюд. Сначала добавьте блюда." },
      { status: 400 }
    );
  }

  const attendees = event.participants.filter((p) => p.attending === "yes");
  const numAttending = Math.max(attendees.length, 1);

  const foodNorms: FoodNormSubblock[] = event.eventType
    ? safeParse<FoodNormSubblock[]>(event.eventType.foodNorms, [])
    : [];

  let pastComments: { eventTitle: string; comments: string[] }[] = [];
  if (event.eventTypeId) {
    const sameTypeEvents = await prisma.event.findMany({
      where: {
        eventTypeId: event.eventTypeId,
        id: { not: event.id },
      },
      include: {
        blocks: {
          where: { type: "afterparty" },
          include: { items: true },
        },
      },
    });
    pastComments = sameTypeEvents
      .map((e) => {
        const all = e.blocks.flatMap((b) => b.items.map((it) => it.name));
        return { eventTitle: e.title, comments: all };
      })
      .filter((c) => c.comments.length > 0);
  }

  const prompt = buildPrompt({
    menuItems,
    foodNorms,
    numAttending,
    pastComments,
    eventTypeName: event.eventType?.name ?? null,
    extraInstructions,
  });

  let raw: string;
  try {
    raw = await callGemini({
      prompt,
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.3,
    });
  } catch (err) {
    if (err instanceof GeminiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ошибка ИИ" },
      { status: 500 }
    );
  }

  const parsed = safeParse<AIShoppingResult>(raw, { items: [], rationale: "" });
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
    return NextResponse.json(
      { error: "ИИ не сформировал список", raw },
      { status: 502 }
    );
  }

  return NextResponse.json({
    items: parsed.items,
    rationale: parsed.rationale || "",
    meta: {
      numAttending,
      menuItemsCount: menuItems.length,
      foodNormsAvailable: foodNorms.length > 0,
      pastCommentsConsidered: pastComments.reduce(
        (sum, c) => sum + c.comments.length,
        0
      ),
    },
  });
}

function buildPrompt({
  menuItems,
  foodNorms,
  numAttending,
  pastComments,
  eventTypeName,
  extraInstructions,
}: {
  menuItems: { name: string; dayIndex: number; meal: string }[];
  foodNorms: FoodNormSubblock[];
  numAttending: number;
  pastComments: { eventTitle: string; comments: string[] }[];
  eventTypeName: string | null;
  extraInstructions?: string;
}): string {
  const menuList = menuItems
    .map(
      (m, i) =>
        `${i + 1}. "${m.name}" (день ${m.dayIndex + 1}${m.meal ? `, ${m.meal}` : ""})`
    )
    .join("\n");

  const normsBlock =
    foodNorms.length > 0
      ? foodNorms
          .map((sb) => {
            const items = sb.items
              .filter((p) => p.product && p.quantity)
              .map((p) => `   • ${p.product}: ${p.quantity} ${p.unit || ""}`.trim())
              .join("\n");
            return `▸ Блюдо: "${sb.name}" — расход на 1 человека:\n${items || "   (нет данных)"}`;
          })
          .join("\n\n")
      : "(норм по продуктам в шаблоне ивента нет — ингредиенты придумай сам, исходя из обычных рецептов)";

  const commentsBlock =
    pastComments.length > 0
      ? pastComments
          .map((c) => {
            const items = c.comments.map((x) => `   - ${x}`).join("\n");
            return `▸ Ивент "${c.eventTitle}":\n${items}`;
          })
          .join("\n")
      : "(прошлых комментариев нет)";

  return `Ты помощник-организатор тусовок. Твоя задача — составить итоговый список продуктов для закупки.

Тип тусовки: ${eventTypeName || "не указан"}
Количество участников (идущих): ${numAttending}

БЛЮДА ИЗ МЕНЮ (что готовим):
${menuList}

БАЗОВЫЕ НОРМЫ РАСХОДА ИЗ ШАБЛОНА ТУСОВКИ (на 1 человека):
${normsBlock}

ЗАМЕЧАНИЯ С ПРОШЛЫХ ТАКИХ ЖЕ ТУСОВОК (что было в избытке/недостатке):
${commentsBlock}

ЗАДАЧА:
1. Для каждого блюда из меню:
   • Если оно совпадает (или близко по названию) с блюдом из норм — посчитай продукты, умножив норму на 1 человека на ${numAttending} участников.
   • Если блюда нет в нормах — сам придумай разумный набор ингредиентов и количество для ${numAttending} человек.
2. Объедини одинаковые продукты разных блюд в одну позицию (суммируй количества), но при этом в notes укажи, для каких блюд он пойдёт.
3. Учти замечания афтепати: если в прошлый раз "слишком много" чего-то — уменьши, если "не хватило" — увеличь. Кратко объясни в rationale, как ты учёл замечания.
4. Используй разумные единицы измерения (кг, г, шт, л, мл, упак).
5. Если позиций менее 3-х, всё равно постарайся разбить, минимум одна позиция на блюдо.
${extraInstructions ? `\nДОПОЛНИТЕЛЬНЫЕ УКАЗАНИЯ ОТ ПОЛЬЗОВАТЕЛЯ:\n${extraInstructions}\n` : ""}
Верни строго JSON по схеме (items + rationale). Без преамбулы, без markdown.`;
}
