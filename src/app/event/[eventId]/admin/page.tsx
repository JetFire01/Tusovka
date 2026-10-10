"use client";

import { useState, useEffect, useCallback } from "react";
import { useEventSync } from "@/hooks/useEventSync";
import { useParams } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
  BLOCK_TYPES,
  BlockType,
  buyerLabel,
  formatDateRu,
  getAvailableMeals,
  getEventDayDates,
} from "@/lib/blocks";
import { MealCell, groupMenuItems } from "@/components/MenuBlock";
import { useLang, t, Lang } from "@/lib/i18n";

const BLOCK_LABEL_KEYS: Record<BlockType, string> = {
  date_place: "block.datePlace",
  food: "block.food",
  menu: "block.menu",
  alcohol: "block.alcohol",
  tent: "block.tent",
  equipment: "block.equipment",
  transport: "block.transport",
  pyrotechnics: "block.pyrotechnics",
  film: "block.film",
  day_food: "block.dayFood",
  activities: "block.activities",
  afterparty: "block.afterparty",
  custom: "block.custom",
};

function blockLabel(type: BlockType, lang: Lang) {
  const key = BLOCK_LABEL_KEYS[type];
  return key ? t(key as Parameters<typeof t>[0], lang) : type;
}

function blockDefaultTitle(type: BlockType, lang: Lang) {
  const key = `blockTitle.${type}` as Parameters<typeof t>[0];
  return t(key, lang);
}

interface BlockData {
  id: string;
  type: string;
  title: string;
  config: string;
  sortOrder: number;
  items: ItemData[];
}

interface ItemData {
  id: string;
  name: string;
  data: string;
}

interface ParticipantInfo {
  user: { id: string; nickname: string };
}

export default function AdminPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const { lang } = useLang();
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    blockId: string;
    item?: ItemData;
  } | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}`);
    if (res.ok) {
      const data = await res.json();
      setBlocks(data.blocks);
      setParticipants(data.participants);
      setCreatedBy(data.createdBy ?? null);
    }
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await fetchData();
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  useEventSync(eventId, {
    onChange: fetchData,
    pause: () => showAddBlock || editingItem !== null,
  });

  async function addBlock(type: BlockType) {
    await fetch(`/api/events/${eventId}/blocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        title: blockDefaultTitle(type, lang),
      }),
    });
    setShowAddBlock(false);
    fetchData();
  }

  async function deleteBlock(blockId: string) {
    await fetch(`/api/events/${eventId}/blocks/${blockId}/items`, {
      method: "DELETE",
    });
    fetchData();
  }

  async function addItem(blockId: string, name: string, data: Record<string, unknown>) {
    await fetch(`/api/events/${eventId}/blocks/${blockId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, data }),
    });
    fetchData();
  }

  async function updateItem(blockId: string, itemId: string, name: string, data: Record<string, unknown>) {
    await fetch(`/api/events/${eventId}/blocks/${blockId}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, name, data }),
    });
    fetchData();
  }

  async function deleteItem(blockId: string, itemId: string) {
    await fetch(
      `/api/events/${eventId}/blocks/${blockId}/items?itemId=${itemId}`,
      { method: "DELETE" }
    );
    fetchData();
  }

  async function updateBlockConfig(blockId: string, config: Record<string, unknown>) {
    await fetch(`/api/events/${eventId}/blocks/${blockId}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updateBlock: true, config }),
    });
    fetchData();
  }

  async function moveBlock(blockId: string, direction: "up" | "down") {
    await fetch(`/api/events/${eventId}/blocks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId, direction }),
    });
    fetchData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("admin.title", lang)}</h1>
        <Button onClick={() => setShowAddBlock(true)} size="sm">
          {t("admin.addBlock", lang)}
        </Button>
      </div>

      {blocks.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-text-secondary mb-4">
            {t("admin.noBlocks", lang)}
          </p>
          <Button onClick={() => setShowAddBlock(true)}>{t("admin.addBlock", lang)}</Button>
        </Card>
      ) : (
        blocks.map((block, idx) => (
          <BlockEditor
            key={block.id}
            block={block}
            participants={participants}
            allBlocks={blocks}
            createdBy={createdBy}
            onAddItem={(name, data) => addItem(block.id, name, data)}
            onUpdateItem={(itemId, name, data) =>
              updateItem(block.id, itemId, name, data)
            }
            onDeleteItem={(itemId) => deleteItem(block.id, itemId)}
            onDeleteBlock={() => deleteBlock(block.id)}
            onUpdateConfig={(config) => updateBlockConfig(block.id, config)}
            onMoveUp={idx > 0 ? () => moveBlock(block.id, "up") : undefined}
            onMoveDown={idx < blocks.length - 1 ? () => moveBlock(block.id, "down") : undefined}
            editingItem={editingItem}
            setEditingItem={setEditingItem}
          />
        ))
      )}

      <Modal
        open={showAddBlock}
        onClose={() => setShowAddBlock(false)}
        title={t("admin.addBlockTitle", lang)}
      >
        <div className="grid grid-cols-2 gap-3">
          {Object.values(BLOCK_TYPES).map((config) => (
            <button
              key={config.key}
              onClick={() => addBlock(config.key)}
              className="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-apple)] border border-border hover:border-accent hover:bg-accent/5 transition-all text-center"
            >
              <span className="text-sm font-medium">{blockLabel(config.key, lang)}</span>
              <span className="text-xs text-text-tertiary">
                {blockDefaultTitle(config.key, lang)}
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function BlockEditor({
  block,
  participants,
  allBlocks,
  createdBy,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onDeleteBlock,
  onUpdateConfig,
  onMoveUp,
  onMoveDown,
  editingItem,
  setEditingItem,
}: {
  block: BlockData;
  participants: ParticipantInfo[];
  allBlocks: BlockData[];
  createdBy: string | null;
  onAddItem: (name: string, data: Record<string, unknown>) => void;
  onUpdateItem: (itemId: string, name: string, data: Record<string, unknown>) => void;
  onDeleteItem: (itemId: string) => void;
  onDeleteBlock: () => void;
  onUpdateConfig: (config: Record<string, unknown>) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  editingItem: { blockId: string; item?: ItemData } | null;
  setEditingItem: (v: { blockId: string; item?: ItemData } | null) => void;
}) {
  const { lang } = useLang();
  const blockConfig = BLOCK_TYPES[block.type as BlockType];
  const isEditing = editingItem?.blockId === block.id;
  const config = JSON.parse(block.config);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [exportNotice, setExportNotice] = useState(false);
  const [foodExpanded, setFoodExpanded] = useState(false);

  const hasImportExport = ["food", "day_food", "equipment", "alcohol", "pyrotechnics"].includes(block.type);
  const isFood = block.type === "food";
  const showItems = !isFood || foodExpanded || isEditing;

  function handleImport() {
    const lines = importText.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      const parts = line.split(" - ").map((p) => p.trim());
      const name = parts[0];
      if (!name) continue;
      const data: Record<string, unknown> = {};
      if (parts[1]) data.quantity = parts[1];
      if (parts[2]) {
        const costStr = parts[2].replace(",", ".");
        const cost = parseFloat(costStr);
        if (!isNaN(cost)) data.cost = cost;
      }
      if (block.type === "equipment") data.itemMode = "buy";
      onAddItem(name, data);
    }
    setImportText("");
    setShowImport(false);
  }

  function handleExport() {
    const lines = block.items.map((item) => {
      const d = JSON.parse(item.data);
      let line = item.name;
      if (d.quantity) line += ` - ${d.quantity}`;
      if (d.cost !== undefined && d.cost !== "") line += ` - ${d.cost}`;
      return line;
    });
    navigator.clipboard.writeText(lines.join("\n"));
    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 2000);
  }

  // Date & Place block has a special editor
  if (block.type === "date_place") {
    return (
      <DatePlaceEditor
        block={block}
        config={config}
        onUpdateConfig={onUpdateConfig}
        onDeleteBlock={onDeleteBlock}
      />
    );
  }

  if (block.type === "menu") {
    return (
      <MenuEditor
        block={block}
        allBlocks={allBlocks}
        participants={participants}
        createdBy={createdBy}
        onAddItem={onAddItem}
        onDeleteItem={onDeleteItem}
        onDeleteBlock={onDeleteBlock}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        adminMode
      />
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CardTitle>{block.title}</CardTitle>
          <Badge variant="accent">{blockConfig ? blockLabel(blockConfig.key, lang) : block.type}</Badge>
          {exportNotice && (
            <span className="text-xs text-success font-medium animate-pulse">
              {t("admin.copied", lang)}
            </span>
          )}
        </div>
        <div className="flex gap-1 flex-wrap justify-end items-center">
          {onMoveUp && (
            <button onClick={onMoveUp} className="px-1.5 py-1 text-text-secondary hover:text-text-primary transition-colors text-lg leading-none" title="↑">↑</button>
          )}
          {onMoveDown && (
            <button onClick={onMoveDown} className="px-1.5 py-1 text-text-secondary hover:text-text-primary transition-colors text-lg leading-none" title="↓">↓</button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setEditingItem({ blockId: block.id })}
          >
            {t("admin.add", lang)}
          </Button>
          {hasImportExport && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setShowImport(true)}>
                {t("admin.import", lang)}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleExport}>
                {t("admin.export", lang)}
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={onDeleteBlock}>
            {t("admin.delete", lang)}
          </Button>
        </div>
      </div>

      {/* Import Modal */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title={t("admin.importTitle", lang)}>
        <div className="space-y-3">
          <p className="text-xs text-text-secondary">
            {t("admin.importHint", lang)}
          </p>
          <p className="text-xs text-text-tertiary bg-surface px-3 py-2 rounded-[var(--radius-apple)] font-mono">
            Meat - 4kg - 55.90<br />
            Cucumbers - 1kg<br />
            Pistachios - 1kg - 12.50
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            autoFocus
            placeholder={t("admin.importPlaceholder", lang)}
            className="w-full px-3.5 py-2.5 bg-surface-card border border-border rounded-[var(--radius-apple)] text-text-primary placeholder:text-text-tertiary text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-none font-mono"
          />
          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={!importText.trim()}>
              {t("admin.importBtn", lang)}
            </Button>
            <Button variant="ghost" onClick={() => setShowImport(false)}>
              {t("admin.cancel", lang)}
            </Button>
          </div>
        </div>
      </Modal>

      {block.items.length === 0 && !isEditing ? (
        <p className="text-sm text-text-tertiary">
          {t("admin.noItemsHint", lang)}
        </p>
      ) : (
        <>
          {isFood && block.items.length > 0 && (
            <button
              onClick={() => setFoodExpanded((v) => !v)}
              className="flex items-center gap-2 text-sm text-accent hover:underline mb-2"
            >
              <span>{showItems ? "▼" : "▶"}</span>
              <span>
                {showItems ? t("common.collapse", lang) : t("common.expand", lang)} (
                {block.items.length} {t("common.itemsCount", lang)})
              </span>
            </button>
          )}
          {showItems && (
            <div className="space-y-2">
              {block.items.map((item) => {
                const data = JSON.parse(item.data);
                const isEditingThis =
                  editingItem?.blockId === block.id &&
                  editingItem?.item?.id === item.id;

                if (isEditingThis) {
                  return (
                    <ItemForm
                      key={item.id}
                      blockType={block.type}
                      participants={participants}
                      initial={{ name: item.name, ...data }}
                      onSave={(name, formData) => {
                        onUpdateItem(item.id, name, formData);
                        setEditingItem(null);
                      }}
                      onCancel={() => setEditingItem(null)}
                    />
                  );
                }

                return (
                  <ItemDisplay
                    key={item.id}
                    item={item}
                    data={data}
                    participants={participants}
                    onEdit={() => setEditingItem({ blockId: block.id, item })}
                    onDelete={() => onDeleteItem(item.id)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {isEditing && !editingItem?.item && (
        <div className="mt-3">
          <ItemForm
            blockType={block.type}
            participants={participants}
            onSave={(name, data) => {
              onAddItem(name, data);
              setEditingItem(null);
            }}
            onCancel={() => setEditingItem(null)}
          />
        </div>
      )}
    </Card>
  );
}

function DatePlaceEditor({
  block,
  config,
  onUpdateConfig,
  onDeleteBlock,
}: {
  block: BlockData;
  config: Record<string, string>;
  onUpdateConfig: (config: Record<string, unknown>) => void;
  onDeleteBlock: () => void;
}) {
  const [startDate, setStartDate] = useState(config.startDate || "");
  const [startTime, setStartTime] = useState(config.startTime || "");
  const [endDate, setEndDate] = useState(config.endDate || "");
  const [endTime, setEndTime] = useState(config.endTime || "");
  const [place, setPlace] = useState(config.place || "");
  const [dirty, setDirty] = useState(false);

  function save() {
    onUpdateConfig({ startDate, startTime, endDate, endTime, place });
    setDirty(false);
  }

  const { lang } = useLang();

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CardTitle>{block.title}</CardTitle>
          <Badge variant="accent">{t("block.datePlace", lang)}</Badge>
        </div>
        <Button size="sm" variant="ghost" onClick={onDeleteBlock}>
          {t("admin.delete", lang)}
        </Button>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t("datePlace.startDate", lang)}
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setDirty(true); }}
          />
          <Input
            label={t("datePlace.startTime", lang)}
            type="time"
            value={startTime}
            onChange={(e) => { setStartTime(e.target.value); setDirty(true); }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t("datePlace.endDate", lang)}
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setDirty(true); }}
          />
          <Input
            label={t("datePlace.endTime", lang)}
            type="time"
            value={endTime}
            onChange={(e) => { setEndTime(e.target.value); setDirty(true); }}
          />
        </div>
        <Input
          label={t("datePlace.place", lang)}
          value={place}
          onChange={(e) => { setPlace(e.target.value); setDirty(true); }}
        />
        {startDate && (
          <p className="text-sm text-text-secondary">
            {formatDateRu(startDate)}
            {startTime && `, ${startTime}`}
            {endDate && ` — ${formatDateRu(endDate)}`}
            {endTime && `, ${endTime}`}
          </p>
        )}
        {dirty && (
          <Button size="sm" onClick={save}>
            {t("admin.save", lang)}
          </Button>
        )}
      </div>
    </Card>
  );
}

function ItemDisplay({
  item,
  data,
  participants,
  onEdit,
  onDelete,
}: {
  item: ItemData;
  data: Record<string, string | number | boolean | undefined>;
  participants: ParticipantInfo[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { lang } = useLang();
  const buyer = buyerLabel(participants, data.buyerUserId, data.buyerName);
  const fuelBuyer = buyerLabel(participants, data.fuelBuyerUserId, data.fuelBuyerName);
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-[8px] hover:bg-surface transition-colors group">
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm whitespace-pre-wrap">{item.name}</span>
          {data.quantity && (
            <span className="text-text-secondary text-sm">— {String(data.quantity)}</span>
          )}
          {data.itemMode === "buy" && (
            <Badge variant="accent">{t("admin.buy", lang)}</Badge>
          )}
          {data.itemMode === "bring" && (
            <Badge variant="success">{t("admin.bringOwn", lang)}</Badge>
          )}
          {data.forEveryone && (
            <Badge variant="warning">{t("admin.forEveryone", lang)}</Badge>
          )}
          {data.transportType === "car" && (
            <Badge variant="accent">{t("admin.car", lang)}</Badge>
          )}
          {data.transportType === "other" && (
            <Badge variant="default">{t("admin.other", lang)}</Badge>
          )}
        </div>
        {data.source && (
          <span className="text-text-tertiary text-xs">({String(data.source)})</span>
        )}
        {data.cost !== undefined && data.cost !== "" && (
          <span className="text-accent text-sm ml-1">
            {t("common.priceLabel", lang)} – {String(data.cost)}
            {buyer && (
              <span className="text-text-secondary"> ({buyer})</span>
            )}
          </span>
        )}
        {data.fuelCost !== undefined && data.fuelCost !== "" && (
          <span className="text-accent text-sm ml-1">
            {t("common.fuelLabel", lang)} – {String(data.fuelCost)}
            {fuelBuyer && (
              <span className="text-text-secondary"> ({fuelBuyer})</span>
            )}
          </span>
        )}
        {data.departureDate && (
          <p className="text-xs text-text-secondary mt-0.5">
            {t("common.departure", lang)}: {formatDateRu(String(data.departureDate))}
          </p>
        )}
        {data.notes && (
          <p className="text-xs text-text-tertiary mt-0.5">{String(data.notes)}</p>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="text-xs text-accent hover:underline px-2 py-1"
          onClick={onEdit}
        >
          {t("admin.edit", lang)}
        </button>
        <button
          className="text-xs text-destructive hover:underline px-2 py-1"
          onClick={onDelete}
        >
          {t("admin.del", lang)}
        </button>
      </div>
    </div>
  );
}

// Начальное значение селекта покупателя: сохранённый userId,
// для старых данных — поиск участника по сохранённому нику.
function resolveBuyerUserId(
  participants: ParticipantInfo[],
  userId: unknown,
  nickname: unknown
): string {
  if (typeof userId === "string" && userId) return userId;
  if (typeof nickname === "string" && nickname) {
    const match = participants.find((p) => p.user.nickname === nickname);
    if (match) return match.user.id;
  }
  return "";
}

function ItemForm({
  blockType,
  participants,
  initial,
  onSave,
  onCancel,
}: {
  blockType: string;
  participants: ParticipantInfo[];
  initial?: Record<string, unknown>;
  onSave: (name: string, data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  // Equipment mode selection
  const [equipmentMode, setEquipmentMode] = useState<"bring" | "buy" | null>(
    (initial?.itemMode as "bring" | "buy") || null
  );
  // Transport mode selection
  const [transportType, setTransportType] = useState<"car" | "other" | null>(
    (initial?.transportType as "car" | "other") || null
  );

  const [name, setName] = useState((initial?.name as string) || "");
  const [quantity, setQuantity] = useState((initial?.quantity as string) || "");
  const [source, setSource] = useState((initial?.source as string) || "");
  const [notes, setNotes] = useState((initial?.notes as string) || "");
  const [cost, setCost] = useState(initial?.cost?.toString() || "");
  const [buyerUserId, setBuyerUserId] = useState(() =>
    resolveBuyerUserId(participants, initial?.buyerUserId, initial?.buyerName)
  );
  const [fuelCost, setFuelCost] = useState(initial?.fuelCost?.toString() || "");
  const [fuelBuyerUserId, setFuelBuyerUserId] = useState(() =>
    resolveBuyerUserId(participants, initial?.fuelBuyerUserId, initial?.fuelBuyerName)
  );
  const [totalSeats, setTotalSeats] = useState(initial?.totalSeats?.toString() || "");
  const [departureDate, setDepartureDate] = useState((initial?.departureDate as string) || "");
  const [forEveryone, setForEveryone] = useState((initial?.forEveryone as boolean) || false);
  const [sharedFuel, setSharedFuel] = useState((initial?.sharedFuel as boolean) || false);
  const [driverPays, setDriverPays] = useState((initial?.driverPays as boolean) || false);

  const { lang } = useLang();

  // Equipment: show mode selector first
  if (blockType === "equipment" && !equipmentMode && !initial) {
    return (
      <div className="p-3 bg-surface rounded-[var(--radius-apple)] space-y-3">
        <p className="text-sm font-medium text-text-primary">{t("admin.itemType", lang)}</p>
        <div className="flex gap-3">
          <button
            onClick={() => setEquipmentMode("bring")}
            className="flex-1 p-4 rounded-[var(--radius-apple)] border border-border hover:border-accent hover:bg-accent/5 transition-all text-center"
          >
            <p className="font-medium text-sm">{t("admin.bringOwn", lang)}</p>
            <p className="text-xs text-text-tertiary mt-1">{t("admin.someoneHas", lang)}</p>
          </button>
          <button
            onClick={() => setEquipmentMode("buy")}
            className="flex-1 p-4 rounded-[var(--radius-apple)] border border-border hover:border-accent hover:bg-accent/5 transition-all text-center"
          >
            <p className="font-medium text-sm">{t("admin.buy", lang)}</p>
            <p className="text-xs text-text-tertiary mt-1">{t("admin.buyInStore", lang)}</p>
          </button>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t("admin.cancel", lang)}
        </Button>
      </div>
    );
  }

  // Transport: show type selector first
  if (blockType === "transport" && !transportType && !initial) {
    return (
      <div className="p-3 bg-surface rounded-[var(--radius-apple)] space-y-3">
        <p className="text-sm font-medium text-text-primary">{t("admin.transportType", lang)}</p>
        <div className="flex gap-3">
          <button
            onClick={() => setTransportType("car")}
            className="flex-1 p-4 rounded-[var(--radius-apple)] border border-border hover:border-accent hover:bg-accent/5 transition-all text-center"
          >
            <p className="font-medium text-sm">{t("admin.car", lang)}</p>
            <p className="text-xs text-text-tertiary mt-1">{t("admin.carWithSeats", lang)}</p>
          </button>
          <button
            onClick={() => setTransportType("other")}
            className="flex-1 p-4 rounded-[var(--radius-apple)] border border-border hover:border-accent hover:bg-accent/5 transition-all text-center"
          >
            <p className="font-medium text-sm">{t("admin.other", lang)}</p>
            <p className="text-xs text-text-tertiary mt-1">{t("admin.busTrainEtc", lang)}</p>
          </button>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t("admin.cancel", lang)}
        </Button>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const data: Record<string, unknown> = {};
    if (quantity) data.quantity = quantity;
    if (source) data.source = source;
    if (notes) data.notes = notes;

    // Записывает buyerUserId как идентификатор и buyerName как снимок ника
    // (для отображения и обратной совместимости). Если выбора нет, а старая
    // позиция хранила покупателя, не найденного среди участников, — сохраняет
    // прежние поля, чтобы правка других полей не стирала покупателя.
    function applyBuyer(
      idKey: "buyerUserId" | "fuelBuyerUserId",
      nameKey: "buyerName" | "fuelBuyerName",
      selectedId: string
    ) {
      const selected = participants.find((p) => p.user.id === selectedId);
      if (selected) {
        data[idKey] = selected.user.id;
        data[nameKey] = selected.user.nickname;
        return;
      }
      if (typeof initial?.[nameKey] === "string" && initial[nameKey]) {
        data[nameKey] = initial[nameKey];
        if (typeof initial?.[idKey] === "string" && initial[idKey]) {
          data[idKey] = initial[idKey];
        }
      }
    }

    // Equipment fields
    if (blockType === "equipment") {
      data.itemMode = equipmentMode || initial?.itemMode || "bring";
      data.forEveryone = forEveryone;
      if (equipmentMode === "buy" || initial?.itemMode === "buy") {
        if (cost) data.cost = parseFloat(cost);
        applyBuyer("buyerUserId", "buyerName", buyerUserId);
      }
    }

    // Transport fields
    if (blockType === "transport") {
      data.transportType = transportType || initial?.transportType || "car";
      if (transportType === "car" || initial?.transportType === "car") {
        if (totalSeats) data.totalSeats = parseInt(totalSeats);
        if (departureDate) data.departureDate = departureDate;
        if (fuelCost) data.fuelCost = parseFloat(fuelCost);
        applyBuyer("fuelBuyerUserId", "fuelBuyerName", fuelBuyerUserId);
        data.sharedFuel = sharedFuel;
        data.driverPays = driverPays;
      }
    }

    // Cost fields for alcohol, pyrotechnics, film, custom, food
    if (["alcohol", "pyrotechnics", "film", "custom", "food", "day_food"].includes(blockType)) {
      if (cost) data.cost = parseFloat(cost);
      applyBuyer("buyerUserId", "buyerName", buyerUserId);
    }

    onSave(name.trim(), data);
  }

  const isEquipmentBuy = blockType === "equipment" && (equipmentMode === "buy" || initial?.itemMode === "buy");
  const isTransportCar = blockType === "transport" && (transportType === "car" || initial?.transportType === "car");
  const showQuantity = ["food", "alcohol", "equipment", "pyrotechnics", "film", "day_food", "custom"].includes(blockType);
  const showSource = ["food", "day_food"].includes(blockType);
  const showCostAndBuyer = ["alcohol", "pyrotechnics", "film", "custom", "food", "day_food"].includes(blockType) || isEquipmentBuy;


  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 bg-surface rounded-[var(--radius-apple)] space-y-3"
    >
      {blockType === "equipment" && (
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={equipmentMode === "buy" ? "accent" : "success"}>
            {equipmentMode === "buy" ? t("admin.buy", lang) : t("admin.bringOwn", lang)}
          </Badge>
        </div>
      )}
      {blockType === "transport" && (
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={transportType === "car" ? "accent" : "default"}>
            {transportType === "car" ? t("admin.car", lang) : t("admin.other", lang)}
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {blockType === "afterparty" ? (
          <textarea
            placeholder={t("afterparty.placeholder", lang)}
            value={name}
            onChange={(e) => setName(e.target.value)}
            rows={3}
            autoFocus
            className="w-full px-3.5 py-2.5 bg-surface-card border border-border rounded-[var(--radius-apple)] text-text-primary placeholder:text-text-tertiary text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-y"
          />
        ) : (
          <Input
            placeholder={t("form.name", lang)}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        )}
        {showQuantity && (
          <Input
            placeholder={t("form.quantity", lang)}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        )}
        {showSource && (
          <Input
            placeholder={t("form.whereToBuy", lang)}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        )}
        {showCostAndBuyer && (
          <>
            <Input
              placeholder={t("form.price", lang)}
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <select
                value={buyerUserId}
                onChange={(e) => setBuyerUserId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-card border border-border rounded-[var(--radius-apple)] text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              >
                <option value="">{t("form.whoBought", lang)}</option>
                {participants.map((p) => (
                  <option key={p.user.id} value={p.user.id}>{p.user.nickname}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Transport car fields */}
        {isTransportCar && (
          <>
            <Input
              placeholder={t("form.totalSeats", lang)}
              type="number"
              value={totalSeats}
              onChange={(e) => setTotalSeats(e.target.value)}
            />
            <Input
              label={t("form.departureDate", lang)}
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
            />
            <Input
              placeholder={t("form.fuelCost", lang)}
              type="number"
              step="0.01"
              value={fuelCost}
              onChange={(e) => setFuelCost(e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <select
                value={fuelBuyerUserId}
                onChange={(e) => setFuelBuyerUserId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-card border border-border rounded-[var(--radius-apple)] text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              >
                <option value="">{t("form.whoPaidFuel", lang)}</option>
                {participants.map((p) => (
                  <option key={p.user.id} value={p.user.id}>{p.user.nickname}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Tent */}
        {blockType === "tent" && (
          <Input
            placeholder={t("form.vacantSpots", lang)}
            type="number"
            value={totalSeats}
            onChange={(e) => setTotalSeats(e.target.value)}
          />
        )}
      </div>

      {/* Equipment: "Для всех" checkbox */}
      {blockType === "equipment" && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={forEveryone}
            onChange={(e) => setForEveryone(e.target.checked)}
            className="w-4 h-4 rounded border-border text-accent focus:ring-accent/50"
          />
          <span className="text-sm text-text-primary">{t("admin.forEveryone", lang)}</span>
        </label>
      )}

      {/* Transport car checkboxes */}
      {isTransportCar && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sharedFuel}
              onChange={(e) => setSharedFuel(e.target.checked)}
              className="w-4 h-4 rounded border-border text-accent focus:ring-accent/50"
            />
            <span className="text-sm text-text-primary">{t("admin.sharedFuel", lang)}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={driverPays}
              onChange={(e) => setDriverPays(e.target.checked)}
              className="w-4 h-4 rounded border-border text-accent focus:ring-accent/50"
            />
            <span className="text-sm text-text-primary">{t("admin.driverPays", lang)}</span>
          </label>
        </div>
      )}

      <Input
        placeholder={t("form.notes", lang)}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {departureDate && isTransportCar && (
        <p className="text-xs text-text-secondary">
          {t("common.departure", lang)}: {formatDateRu(departureDate)}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm">
          {initial ? t("admin.save", lang) : t("admin.add", lang)}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t("admin.cancel", lang)}
        </Button>
      </div>
    </form>
  );
}

function readDateConfig(allBlocks: BlockData[]): {
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
} {
  const dp = allBlocks.find((b) => b.type === "date_place");
  if (!dp) return {};
  try {
    return JSON.parse(dp.config);
  } catch {
    return {};
  }
}

function dayCount(startDate?: string, endDate?: string): number {
  if (!startDate) return 0;
  if (!endDate) return 1;
  const s = new Date(startDate);
  const e = new Date(endDate);
  const ms = e.getTime() - s.getTime();
  if (ms < 0) return 1;
  return Math.floor(ms / 86400000) + 1;
}

function MenuEditor({
  block,
  allBlocks,
  participants,
  createdBy,
  onAddItem,
  onDeleteItem,
  onDeleteBlock,
  onMoveUp,
  onMoveDown,
}: {
  block: BlockData;
  allBlocks: BlockData[];
  participants: ParticipantInfo[];
  createdBy: string | null;
  onAddItem: (name: string, data: Record<string, unknown>) => void;
  onDeleteItem: (itemId: string) => void;
  onDeleteBlock: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  adminMode: boolean;
}) {
  const { lang } = useLang();
  const params = useParams();
  const eventId = params.eventId as string;
  const dateCfg = readDateConfig(allBlocks);
  const totalDays = dayCount(dateCfg.startDate, dateCfg.endDate);
  const dates = getEventDayDates(dateCfg.startDate, totalDays);
  const [expanded, setExpanded] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const foodBlockId = allBlocks.find((b) => b.type === "food")?.id ?? null;

  const itemsByCell = groupMenuItems(block.items);
  const nicknameByUserId = new Map<string, string>();
  for (const p of participants) nicknameByUserId.set(p.user.id, p.user.nickname);

  function openAi() {
    setExpanded(true);
    setAiModalOpen(true);
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CardTitle>{block.title}</CardTitle>
          <Badge variant="accent">{t("block.menu", lang)}</Badge>
        </div>
        <div className="flex gap-1 items-center flex-wrap justify-end">
          <Button
            size="sm"
            onClick={openAi}
            className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-600"
            disabled={block.items.length === 0}
          >
            {t("ai.createShoppingList", lang)}
          </Button>
          {onMoveUp && (
            <button onClick={onMoveUp} className="px-1.5 py-1 text-text-secondary hover:text-text-primary transition-colors text-lg leading-none">↑</button>
          )}
          {onMoveDown && (
            <button onClick={onMoveDown} className="px-1.5 py-1 text-text-secondary hover:text-text-primary transition-colors text-lg leading-none">↓</button>
          )}
          <Button size="sm" variant="ghost" onClick={onDeleteBlock}>
            {t("admin.delete", lang)}
          </Button>
        </div>
      </div>

      <AIShoppingListModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        eventId={eventId}
        foodBlockId={foodBlockId}
      />

      {totalDays === 0 ? (
        <p className="text-sm text-text-tertiary">{t("menu.noDates", lang)}</p>
      ) : (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-2 text-sm text-accent hover:underline mb-2"
          >
            <span>{expanded ? "▼" : "▶"}</span>
            <span>
              {expanded ? t("common.collapse", lang) : t("common.expand", lang)} (
              {block.items.length} {t("common.itemsCount", lang)})
            </span>
          </button>
          {expanded && (
            <div className="space-y-4">
              {dates.map((date, dayIndex) => {
            const meals = getAvailableMeals(
              dateCfg.startTime,
              dateCfg.endTime,
              dayIndex,
              totalDays
            );
            return (
              <div key={dayIndex} className="border border-border rounded-[var(--radius-apple)] p-3">
                <div className="text-sm font-medium mb-2">{formatDateRu(date)}</div>
                <div className="space-y-3">
                  {meals.map((meal) => (
                    <MealCell
                      key={meal}
                      meal={meal}
                      items={itemsByCell.get(`${dayIndex}:${meal}`) || []}
                      onAdd={(name) =>
                        onAddItem(name, { dayIndex, meal })
                      }
                      onDelete={onDeleteItem}
                      lang={lang}
                      adminMode
                      currentUserId={createdBy}
                      nicknameByUserId={nicknameByUserId}
                      adminUserId={createdBy}
                    />
                  ))}
                </div>
              </div>
            );
          })}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

interface AIShoppingItem {
  name: string;
  quantity: string;
  notes?: string;
}

interface AIShoppingMeta {
  numAttending: number;
  menuItemsCount: number;
  foodNormsAvailable: boolean;
  pastCommentsConsidered: number;
}

function AIShoppingListModal({
  open,
  onClose,
  eventId,
  foodBlockId,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  foodBlockId: string | null;
}) {
  const { lang } = useLang();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AIShoppingItem[]>([]);
  const [rationale, setRationale] = useState<string>("");
  const [meta, setMeta] = useState<AIShoppingMeta | null>(null);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);

  const generate = useCallback(
    async (extra?: string) => {
      setLoading(true);
      setError(null);
      setSavedNotice(false);
      try {
        const res = await fetch(`/api/events/${eventId}/ai-shopping-list`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ extraInstructions: extra ?? extraInstructions }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json?.error || t("ai.errorGeneric", lang));
          setItems([]);
          setRationale("");
          setMeta(null);
          return;
        }
        setItems(Array.isArray(json.items) ? json.items : []);
        setRationale(typeof json.rationale === "string" ? json.rationale : "");
        setMeta(json.meta ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("ai.errorGeneric", lang));
      } finally {
        setLoading(false);
      }
    },
    [eventId, extraInstructions, lang]
  );

  useEffect(() => {
    if (open && items.length === 0 && !loading && !error) {
      generate();
    }
    if (!open) {
      // reset on close
      setItems([]);
      setRationale("");
      setError(null);
      setMeta(null);
      setSavedNotice(false);
      setExtraInstructions("");
    }
  }, [open, items.length, loading, error, generate]);

  function updateItem(idx: number, field: keyof AIShoppingItem, value: string) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it))
    );
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function addRow() {
    setItems((prev) => [...prev, { name: "", quantity: "", notes: "" }]);
  }

  async function approve() {
    setSaving(true);
    setError(null);
    try {
      let targetBlockId = foodBlockId;
      if (!targetBlockId) {
        const res = await fetch(`/api/events/${eventId}/blocks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "food",
            title: t("blockTitle.food", lang),
          }),
        });
        if (!res.ok) {
          setError(t("ai.errorGeneric", lang));
          setSaving(false);
          return;
        }
        const created = await res.json();
        targetBlockId = created.id;
      }
      const valid = items.filter((it) => it.name.trim() !== "");
      for (const it of valid) {
        await fetch(`/api/events/${eventId}/blocks/${targetBlockId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: it.name.trim(),
            data: {
              quantity: it.quantity || undefined,
              notes: it.notes || undefined,
            },
          }),
        });
      }
      setSavedNotice(true);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ai.errorGeneric", lang));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-surface-card rounded-[var(--radius-apple-lg)] shadow-[var(--shadow-apple-lg)]">
        <div className="px-5 pt-5 pb-3 border-b border-border flex items-center justify-between sticky top-0 bg-surface-card z-10">
          <h2 className="text-lg font-semibold text-text-primary">
            {t("ai.modalTitle", lang)}
          </h2>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary text-xl leading-none px-2"
            aria-label="close"
          >
            ×
          </button>
        </div>
        <div className="p-5 space-y-4">
          {meta && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="accent">
                {t("ai.metaAttending", lang)}: {meta.numAttending}
              </Badge>
              <Badge variant="default">
                {t("ai.metaMenu", lang)}: {meta.menuItemsCount}
              </Badge>
              <Badge variant={meta.foodNormsAvailable ? "success" : "default"}>
                {t("ai.metaNorms", lang)}:{" "}
                {meta.foodNormsAvailable
                  ? t("ai.metaNormsYes", lang)
                  : t("ai.metaNormsNo", lang)}
              </Badge>
              <Badge variant={meta.pastCommentsConsidered > 0 ? "warning" : "default"}>
                {t("ai.metaPastComments", lang)}: {meta.pastCommentsConsidered}
              </Badge>
            </div>
          )}

          {loading && (
            <div className="py-8 text-center text-sm text-text-secondary">
              <div className="inline-block w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mr-2 align-middle" />
              {t("ai.generating", lang)}
            </div>
          )}

          {error && !loading && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-[var(--radius-apple)]">
              {error}
            </p>
          )}

          {!loading && items.length === 0 && !error && (
            <p className="text-sm text-text-tertiary">{t("ai.empty", lang)}</p>
          )}

          {!loading && items.length > 0 && (
            <>
              {rationale && (
                <div className="p-3 rounded-[var(--radius-apple)] bg-surface border border-border">
                  <p className="text-xs uppercase tracking-wide text-text-secondary mb-1">
                    {t("ai.rationaleLabel", lang)}
                  </p>
                  <p className="text-sm text-text-primary whitespace-pre-wrap">
                    {rationale}
                  </p>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-text-secondary border-b border-border">
                      <th className="py-2 pr-2 w-2/5">{t("ai.colName", lang)}</th>
                      <th className="py-2 pr-2 w-1/5">{t("ai.colQty", lang)}</th>
                      <th className="py-2 pr-2 w-2/5">{t("ai.colNotes", lang)}</th>
                      <th className="py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx} className="border-b border-border last:border-0">
                        <td className="py-1.5 pr-2">
                          <input
                            value={it.name}
                            onChange={(e) => updateItem(idx, "name", e.target.value)}
                            className="w-full px-2 py-1 bg-surface-card border border-border rounded-[6px] text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            value={it.quantity}
                            onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                            className="w-full px-2 py-1 bg-surface-card border border-border rounded-[6px] text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            value={it.notes || ""}
                            onChange={(e) => updateItem(idx, "notes", e.target.value)}
                            className="w-full px-2 py-1 bg-surface-card border border-border rounded-[6px] text-xs text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50"
                          />
                        </td>
                        <td className="py-1.5 text-right">
                          <button
                            onClick={() => removeItem(idx)}
                            className="text-text-tertiary hover:text-destructive px-1"
                            title="×"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={addRow}
                className="text-sm text-accent hover:underline"
              >
                {t("ai.addRow", lang)}
              </button>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs text-text-secondary">
              {t("ai.extraHintLabel", lang)}
            </label>
            <input
              value={extraInstructions}
              onChange={(e) => setExtraInstructions(e.target.value)}
              placeholder={t("ai.extraHintPlaceholder", lang)}
              className="w-full px-3 py-1.5 bg-surface-card border border-border rounded-[var(--radius-apple)] text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          {savedNotice && (
            <p className="text-sm text-success bg-success/10 px-3 py-2 rounded-[var(--radius-apple)]">
              {t("ai.savedToFood", lang)}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <Button
              onClick={approve}
              disabled={loading || saving || items.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-600"
            >
              {saving ? t("ai.saving", lang) : t("ai.approve", lang)}
            </Button>
            <Button
              variant="secondary"
              onClick={() => generate(extraInstructions)}
              disabled={loading || saving}
            >
              {t("ai.regenerate", lang)}
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              {t("ai.close", lang)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

