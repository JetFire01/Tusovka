"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { BLOCK_TYPES, BlockType, formatDateRu } from "@/lib/blocks";
import { useLang, t } from "@/lib/i18n";

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
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function addBlock(type: BlockType) {
    const config = BLOCK_TYPES[type];
    await fetch(`/api/events/${eventId}/blocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        title: config.defaultTitle,
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
              <span className="text-sm font-medium">{config.label}</span>
              <span className="text-xs text-text-tertiary">
                {config.defaultTitle}
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

  const hasImportExport = ["food", "day_food", "equipment", "alcohol", "pyrotechnics"].includes(block.type);

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

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CardTitle>{block.title}</CardTitle>
          <Badge variant="accent">{blockConfig?.label || block.type}</Badge>
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
      <Modal open={showImport} onClose={() => setShowImport(false)} title="Импорт позиций">
        <div className="space-y-3">
          <p className="text-xs text-text-secondary">
            Введите позиции, каждая с новой строки в формате:
          </p>
          <p className="text-xs text-text-tertiary bg-surface px-3 py-2 rounded-[var(--radius-apple)] font-mono">
            Мясо - 4кг - 55,90<br />
            Огурцы - 1кг<br />
            Фисташки - 1кг - 12,50
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            autoFocus
            placeholder="Вставьте список позиций..."
            className="w-full px-3.5 py-2.5 bg-surface-card border border-border rounded-[var(--radius-apple)] text-text-primary placeholder:text-text-tertiary text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-none font-mono"
          />
          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={!importText.trim()}>
              Импортировать
            </Button>
            <Button variant="ghost" onClick={() => setShowImport(false)}>
              Отмена
            </Button>
          </div>
        </div>
      </Modal>

      {block.items.length === 0 && !isEditing ? (
        <p className="text-sm text-text-tertiary">
          Нет элементов. Нажмите &quot;Добавить&quot; чтобы начать.
        </p>
      ) : (
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
                blockType={block.type}
                onEdit={() => setEditingItem({ blockId: block.id, item })}
                onDelete={() => onDeleteItem(item.id)}
              />
            );
          })}
        </div>
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

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CardTitle>{block.title}</CardTitle>
          <Badge variant="accent">Дата и место</Badge>
        </div>
        <Button size="sm" variant="ghost" onClick={onDeleteBlock}>
          Удалить
        </Button>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Дата начала"
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setDirty(true); }}
          />
          <Input
            label="Время начала"
            type="time"
            value={startTime}
            onChange={(e) => { setStartTime(e.target.value); setDirty(true); }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Дата окончания"
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setDirty(true); }}
          />
          <Input
            label="Время окончания"
            type="time"
            value={endTime}
            onChange={(e) => { setEndTime(e.target.value); setDirty(true); }}
          />
        </div>
        <Input
          label="Место проведения"
          value={place}
          onChange={(e) => { setPlace(e.target.value); setDirty(true); }}
          placeholder="Национальный парк, д. Крупица..."
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
            Сохранить
          </Button>
        )}
      </div>
    </Card>
  );
}

function ItemDisplay({
  item,
  data,
  blockType,
  onEdit,
  onDelete,
}: {
  item: ItemData;
  data: Record<string, string | number | boolean | undefined>;
  blockType: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-[8px] hover:bg-surface transition-colors group">
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{item.name}</span>
          {data.quantity && (
            <span className="text-text-secondary text-sm">— {String(data.quantity)}</span>
          )}
          {data.itemMode === "buy" && (
            <Badge variant="accent">Купить</Badge>
          )}
          {data.itemMode === "bring" && (
            <Badge variant="success">Взять своё</Badge>
          )}
          {data.forEveryone && (
            <Badge variant="warning">Для всех</Badge>
          )}
          {data.transportType === "car" && (
            <Badge variant="accent">Машина</Badge>
          )}
          {data.transportType === "other" && (
            <Badge variant="default">Другое</Badge>
          )}
        </div>
        {data.source && (
          <span className="text-text-tertiary text-xs">({String(data.source)})</span>
        )}
        {data.cost !== undefined && data.cost !== "" && (
          <span className="text-accent text-sm ml-1">
            Цена – {String(data.cost)}
            {data.buyerName && (
              <span className="text-text-secondary"> ({String(data.buyerName)})</span>
            )}
          </span>
        )}
        {data.fuelCost !== undefined && data.fuelCost !== "" && (
          <span className="text-accent text-sm ml-1">
            Бензин – {String(data.fuelCost)}
            {data.fuelBuyerName && (
              <span className="text-text-secondary"> ({String(data.fuelBuyerName)})</span>
            )}
          </span>
        )}
        {data.departureDate && (
          <p className="text-xs text-text-secondary mt-0.5">
            Выезд: {formatDateRu(String(data.departureDate))}
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
          Изм.
        </button>
        <button
          className="text-xs text-destructive hover:underline px-2 py-1"
          onClick={onDelete}
        >
          Уд.
        </button>
      </div>
    </div>
  );
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
  const [buyerName, setBuyerName] = useState((initial?.buyerName as string) || "");
  const [fuelCost, setFuelCost] = useState(initial?.fuelCost?.toString() || "");
  const [fuelBuyerName, setFuelBuyerName] = useState((initial?.fuelBuyerName as string) || "");
  const [totalSeats, setTotalSeats] = useState(initial?.totalSeats?.toString() || "");
  const [departureDate, setDepartureDate] = useState((initial?.departureDate as string) || "");
  const [forEveryone, setForEveryone] = useState((initial?.forEveryone as boolean) || false);
  const [sharedFuel, setSharedFuel] = useState((initial?.sharedFuel as boolean) || false);
  const [driverPays, setDriverPays] = useState((initial?.driverPays as boolean) || false);

  // Equipment: show mode selector first
  if (blockType === "equipment" && !equipmentMode && !initial) {
    return (
      <div className="p-3 bg-surface rounded-[var(--radius-apple)] space-y-3">
        <p className="text-sm font-medium text-text-primary">Тип позиции:</p>
        <div className="flex gap-3">
          <button
            onClick={() => setEquipmentMode("bring")}
            className="flex-1 p-4 rounded-[var(--radius-apple)] border border-border hover:border-accent hover:bg-accent/5 transition-all text-center"
          >
            <p className="font-medium text-sm">Взять своё</p>
            <p className="text-xs text-text-tertiary mt-1">У кого-то есть эта вещь</p>
          </button>
          <button
            onClick={() => setEquipmentMode("buy")}
            className="flex-1 p-4 rounded-[var(--radius-apple)] border border-border hover:border-accent hover:bg-accent/5 transition-all text-center"
          >
            <p className="font-medium text-sm">Купить</p>
            <p className="text-xs text-text-tertiary mt-1">Нужно купить в магазине</p>
          </button>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    );
  }

  // Transport: show type selector first
  if (blockType === "transport" && !transportType && !initial) {
    return (
      <div className="p-3 bg-surface rounded-[var(--radius-apple)] space-y-3">
        <p className="text-sm font-medium text-text-primary">Тип транспорта:</p>
        <div className="flex gap-3">
          <button
            onClick={() => setTransportType("car")}
            className="flex-1 p-4 rounded-[var(--radius-apple)] border border-border hover:border-accent hover:bg-accent/5 transition-all text-center"
          >
            <p className="font-medium text-sm">Машина</p>
            <p className="text-xs text-text-tertiary mt-1">Автомобиль с местами</p>
          </button>
          <button
            onClick={() => setTransportType("other")}
            className="flex-1 p-4 rounded-[var(--radius-apple)] border border-border hover:border-accent hover:bg-accent/5 transition-all text-center"
          >
            <p className="font-medium text-sm">Другое</p>
            <p className="text-xs text-text-tertiary mt-1">Автобус, поезд и т.д.</p>
          </button>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Отмена
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

    // Equipment fields
    if (blockType === "equipment") {
      data.itemMode = equipmentMode || initial?.itemMode || "bring";
      data.forEveryone = forEveryone;
      if (equipmentMode === "buy" || initial?.itemMode === "buy") {
        if (cost) data.cost = parseFloat(cost);
        if (buyerName) data.buyerName = buyerName;
      }
    }

    // Transport fields
    if (blockType === "transport") {
      data.transportType = transportType || initial?.transportType || "car";
      if (transportType === "car" || initial?.transportType === "car") {
        if (totalSeats) data.totalSeats = parseInt(totalSeats);
        if (departureDate) data.departureDate = departureDate;
        if (fuelCost) data.fuelCost = parseFloat(fuelCost);
        if (fuelBuyerName) data.fuelBuyerName = fuelBuyerName;
        data.sharedFuel = sharedFuel;
        data.driverPays = driverPays;
      }
    }

    // Cost fields for alcohol, pyrotechnics, film, custom, food
    if (["alcohol", "pyrotechnics", "film", "custom"].includes(blockType)) {
      if (cost) data.cost = parseFloat(cost);
      if (buyerName) data.buyerName = buyerName;
    }

    if (["food", "day_food"].includes(blockType)) {
      if (cost) data.cost = parseFloat(cost);
      if (buyerName) data.buyerName = buyerName;
    }

    onSave(name.trim(), data);
  }

  const isEquipmentBuy = blockType === "equipment" && (equipmentMode === "buy" || initial?.itemMode === "buy");
  const isTransportCar = blockType === "transport" && (transportType === "car" || initial?.transportType === "car");
  const showQuantity = ["food", "alcohol", "equipment", "pyrotechnics", "film", "day_food", "custom"].includes(blockType);
  const showSource = ["food", "day_food"].includes(blockType);
  const showCostAndBuyer = ["alcohol", "pyrotechnics", "film", "custom", "food", "day_food"].includes(blockType) || isEquipmentBuy;

  const participantOptions = participants.map((p) => p.user.nickname);

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 bg-surface rounded-[var(--radius-apple)] space-y-3"
    >
      {blockType === "equipment" && (
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={equipmentMode === "buy" ? "accent" : "success"}>
            {equipmentMode === "buy" ? "Купить" : "Взять своё"}
          </Badge>
        </div>
      )}
      {blockType === "transport" && (
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={transportType === "car" ? "accent" : "default"}>
            {transportType === "car" ? "Машина" : "Другое"}
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          placeholder="Название"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        {showQuantity && (
          <Input
            placeholder="Количество"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        )}
        {showSource && (
          <Input
            placeholder="Где купить"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        )}
        {showCostAndBuyer && (
          <>
            <Input
              placeholder="Цена"
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <select
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-card border border-border rounded-[var(--radius-apple)] text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              >
                <option value="">Кто купил?</option>
                {participantOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Transport car fields */}
        {isTransportCar && (
          <>
            <Input
              placeholder="Всего мест"
              type="number"
              value={totalSeats}
              onChange={(e) => setTotalSeats(e.target.value)}
            />
            <Input
              label="День выезда"
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
            />
            <Input
              placeholder="Сумма за бензин"
              type="number"
              step="0.01"
              value={fuelCost}
              onChange={(e) => setFuelCost(e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <select
                value={fuelBuyerName}
                onChange={(e) => setFuelBuyerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-card border border-border rounded-[var(--radius-apple)] text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              >
                <option value="">Кто заплатил за бензин?</option>
                {participantOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Tent */}
        {blockType === "tent" && (
          <Input
            placeholder="Вакантных мест"
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
          <span className="text-sm text-text-primary">Для всех участников</span>
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
            <span className="text-sm text-text-primary">Средняя цена бензина для всех участников</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={driverPays}
              onChange={(e) => setDriverPays(e.target.checked)}
              className="w-4 h-4 rounded border-border text-accent focus:ring-accent/50"
            />
            <span className="text-sm text-text-primary">Водитель платит за бензин</span>
          </label>
        </div>
      )}

      <Input
        placeholder="Примечания"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {departureDate && isTransportCar && (
        <p className="text-xs text-text-secondary">
          Выезд: {formatDateRu(departureDate)}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm">
          {initial ? "Сохранить" : "Добавить"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
