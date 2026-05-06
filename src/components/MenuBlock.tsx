"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Meal } from "@/lib/blocks";
import { Lang, t } from "@/lib/i18n";

const MEAL_LABEL_KEY: Record<Meal, Parameters<typeof t>[0]> = {
  breakfast: "menu.breakfast",
  lunch: "menu.lunch",
  dinner: "menu.dinner",
};

export function mealLabel(meal: Meal, lang: Lang): string {
  return t(MEAL_LABEL_KEY[meal], lang);
}

export type MenuItemData = {
  dayIndex?: number;
  meal?: Meal;
  suggestedByUserId?: string | null;
};

export function parseMenuItem(data: string): MenuItemData {
  try {
    return JSON.parse(data) as MenuItemData;
  } catch {
    return {};
  }
}

export type MenuItem = { id: string; name: string; ownerId: string | null };

export function groupMenuItems(
  items: { id: string; name: string; data: string }[]
): Map<string, MenuItem[]> {
  const map = new Map<string, MenuItem[]>();
  for (const it of items) {
    const d = parseMenuItem(it.data);
    if (typeof d.dayIndex !== "number" || !d.meal) continue;
    const key = `${d.dayIndex}:${d.meal}`;
    const list = map.get(key) || [];
    list.push({ id: it.id, name: it.name, ownerId: d.suggestedByUserId ?? null });
    map.set(key, list);
  }
  return map;
}

export function MealCell({
  meal,
  items,
  onAdd,
  onDelete,
  lang,
  adminMode,
  currentUserId,
  nicknameByUserId,
  adminUserId,
}: {
  meal: Meal;
  items: MenuItem[];
  onAdd: (name: string) => void;
  onDelete: (itemId: string) => void;
  lang: Lang;
  adminMode: boolean;
  currentUserId: string | null;
  nicknameByUserId: Map<string, string>;
  adminUserId: string | null;
}) {
  const [adding, setAdding] = useState(adminMode);
  const [draft, setDraft] = useState("");

  function submit() {
    const v = draft.trim();
    if (!v) return;
    onAdd(v);
    setDraft("");
    if (!adminMode) setAdding(false);
  }

  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-text-secondary mb-1">
        {t(MEAL_LABEL_KEY[meal], lang)}
      </div>
      {items.length === 0 && !adding && (
        <p className="text-xs text-text-tertiary">{t("menu.empty", lang)}</p>
      )}
      <ul className="space-y-1">
        {items.map((it) => {
          const canDelete =
            adminMode || (currentUserId !== null && it.ownerId === currentUserId);
          const resolvedOwnerId = it.ownerId ?? adminUserId;
          const ownerNickname = resolvedOwnerId
            ? nicknameByUserId.get(resolvedOwnerId)
            : undefined;
          return (
            <li
              key={it.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <span>{it.name}</span>
                {ownerNickname && (
                  <Badge variant="accent">{ownerNickname}</Badge>
                )}
              </span>
              {canDelete && (
                <button
                  onClick={() => onDelete(it.id)}
                  className="text-xs text-text-tertiary hover:text-destructive transition-colors"
                  aria-label="delete"
                >
                  ✕
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {adding ? (
        <div className="flex gap-2 mt-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={t("menu.placeholder", lang)}
            className="flex-1 px-3 py-1.5 bg-surface-card border border-border rounded-[var(--radius-apple)] text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            autoFocus={!adminMode}
          />
          <Button size="sm" onClick={submit} disabled={!draft.trim()}>
            {t("menu.add", lang)}
          </Button>
          {!adminMode && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft("");
                setAdding(false);
              }}
            >
              {t("menu.cancel", lang)}
            </Button>
          )}
        </div>
      ) : (
        !adminMode && (
          <button
            onClick={() => setAdding(true)}
            className="mt-2 text-xs text-accent hover:underline"
          >
            + {t("menu.addOwn", lang)}
          </button>
        )
      )}
    </div>
  );
}
