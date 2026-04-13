"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDateRu } from "@/lib/blocks";

interface BlockData {
  id: string;
  type: string;
  title: string;
  config: string;
  items: {
    id: string;
    name: string;
    data: string;
    claims: {
      id: string;
      claimType: string;
      data: string;
      user: { id: string; nickname: string };
    }[];
  }[];
}

interface ParticipantData {
  id: string;
  attending: string;
  arrivalDay: number | null;
  userId: string;
  surveyResponses: { blockId: string; response: string }[];
}

interface EventInfo {
  id: string;
  blocks: BlockData[];
  participants: (ParticipantData & { user: { id: string; nickname: string } })[];
}

export default function SurveyPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [attending, setAttending] = useState("yes");
  const [startDateStr, setStartDateStr] = useState("");
  const [endDateStr, setEndDateStr] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [responses, setResponses] = useState<Record<string, Record<string, unknown>>>({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}`);
    if (res.ok) {
      const data: EventInfo = await res.json();
      setBlocks(data.blocks);

      // Get event dates from date_place block
      const datePlaceBlock = data.blocks.find((b) => b.type === "date_place");
      if (datePlaceBlock) {
        const cfg = JSON.parse(datePlaceBlock.config);
        if (cfg.startDate) setEventStartDate(cfg.startDate);
        if (cfg.endDate) setEventEndDate(cfg.endDate);
      }

      const myParticipant = data.participants.find(
        (p) => p.user?.id === user?.userId
      );
      if (myParticipant) {
        setAttending(myParticipant.attending);

        const existing: Record<string, Record<string, unknown>> = {};
        for (const sr of myParticipant.surveyResponses) {
          existing[sr.blockId] = JSON.parse(sr.response);
        }
        setResponses(existing);

        // Load saved dates
        const attendanceResp = existing[data.blocks.find(b => b.type === "date_place")?.id || ""];
        if (attendanceResp) {
          if (attendanceResp.startDate) setStartDateStr(attendanceResp.startDate as string);
          if (attendanceResp.endDate) setEndDateStr(attendanceResp.endDate as string);
        }
      }
    }
  }, [eventId, user?.userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function updateResponse(blockId: string, key: string, value: unknown) {
    setResponses((prev) => ({
      ...prev,
      [blockId]: { ...(prev[blockId] || {}), [key]: value },
    }));
  }

  async function handleSave() {
    setSaving(true);

    // Save attendance
    await fetch(`/api/events/${eventId}/responses`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attending,
        arrivalDay: startDateStr ? 1 : null,
      }),
    });

    // Save attendance dates in date_place block response
    const datePlaceBlock = blocks.find((b) => b.type === "date_place");
    if (datePlaceBlock) {
      await fetch(`/api/events/${eventId}/responses`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockId: datePlaceBlock.id,
          response: { startDate: startDateStr, endDate: endDateStr },
        }),
      });
    }

    // Save each block response
    for (const [blockId, response] of Object.entries(responses)) {
      await fetch(`/api/events/${eventId}/responses`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, response }),
      });
    }

    setSaving(false);
    // Redirect to statistics after saving
    router.push(`/event/${eventId}/statistics`);
  }

  async function makeClaim(
    blockItemId: string,
    claimType: string,
    data?: Record<string, unknown>
  ) {
    await fetch(`/api/events/${eventId}/claims`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockItemId, claimType, data }),
    });
    fetchData();
  }

  async function removeClaim(claimId: string) {
    await fetch(`/api/events/${eventId}/claims?claimId=${claimId}`, {
      method: "DELETE",
    });
    fetchData();
  }

  if (!user) {
    return (
      <Card className="text-center py-12">
        <p className="text-text-secondary">Войдите для прохождения опросника</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Опросник</h1>

      {/* Attendance */}
      <Card>
        <CardTitle>Участие</CardTitle>
        <CardDescription>Вы идёте?</CardDescription>
        <div className="flex gap-2 mt-3">
          {["yes", "no", "unknown"].map((v) => (
            <button
              key={v}
              onClick={() => setAttending(v)}
              className={`px-4 py-2 rounded-[var(--radius-apple)] text-sm font-medium transition-all ${
                attending === v
                  ? "bg-accent text-white"
                  : "bg-surface text-text-secondary hover:bg-surface/80"
              }`}
            >
              {v === "yes" ? "Да" : v === "no" ? "Нет" : "Не уверен"}
            </button>
          ))}
        </div>
        {attending === "yes" && eventStartDate && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-primary">Дата приезда</label>
                <input
                  type="date"
                  min={eventStartDate}
                  max={eventEndDate || eventStartDate}
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-card border border-border rounded-[var(--radius-apple)] text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-primary">Дата отъезда</label>
                <input
                  type="date"
                  min={startDateStr || eventStartDate}
                  max={eventEndDate || eventStartDate}
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-card border border-border rounded-[var(--radius-apple)] text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                />
              </div>
            </div>
            {startDateStr && (
              <p className="text-sm text-text-secondary">
                {formatDateRu(startDateStr)}
                {endDateStr && ` — ${formatDateRu(endDateStr)}`}
              </p>
            )}
          </div>
        )}
        {attending === "yes" && !eventStartDate && (
          <p className="text-xs text-text-tertiary mt-2">
            Даты мероприятия ещё не указаны в админке (блок &quot;Дата и место&quot;)
          </p>
        )}
      </Card>

      {/* Block-specific surveys */}
      {blocks.filter(b => b.type !== "date_place").map((block) => (
        <BlockSurvey
          key={block.id}
          block={block}
          response={responses[block.id] || {}}
          onUpdate={(key, value) => updateResponse(block.id, key, value)}
          userId={user.userId}
          onClaim={makeClaim}
          onRemoveClaim={removeClaim}
        />
      ))}

      {/* Save */}
      <div className="sticky bottom-20 sm:bottom-4 z-20">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full shadow-[var(--shadow-apple-lg)]"
          size="lg"
        >
          {saving ? "Сохранение..." : "Сохранить ответы"}
        </Button>
      </div>
    </div>
  );
}

function BlockSurvey({
  block,
  response,
  onUpdate,
  userId,
  onClaim,
  onRemoveClaim,
}: {
  block: BlockData;
  response: Record<string, unknown>;
  onUpdate: (key: string, value: unknown) => void;
  userId: string;
  onClaim: (blockItemId: string, claimType: string, data?: Record<string, unknown>) => void;
  onRemoveClaim: (claimId: string) => void;
}) {
  const type = block.type;

  if (type === "alcohol") {
    return (
      <Card>
        <CardTitle>{block.title}</CardTitle>
        <CardDescription>Что вы пьёте?</CardDescription>
        <div className="flex flex-wrap gap-2 mt-3">
          {["Всё", "Не пью", "Пью только..."].map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onUpdate("preference", opt);
                if (opt !== "Пью только...") {
                  onUpdate("types", []);
                }
              }}
              className={`px-4 py-2 rounded-[var(--radius-apple)] text-sm font-medium transition-all ${
                response.preference === opt
                  ? "bg-accent text-white"
                  : "bg-surface text-text-secondary hover:bg-surface/80"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        {response.preference === "Пью только..." && (
          <div className="mt-3">
            <p className="text-sm text-text-secondary mb-2">
              Выберите что вы пьёте:
            </p>
            <div className="flex flex-wrap gap-2">
              {block.items.map((item) => {
                const data = JSON.parse(item.data);
                const selected = ((response.types as string[]) || []).includes(item.name);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      const current = (response.types as string[]) || [];
                      onUpdate(
                        "types",
                        selected
                          ? current.filter((t) => t !== item.name)
                          : [...current, item.name]
                      );
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      selected
                        ? "bg-accent text-white"
                        : "bg-surface text-text-secondary"
                    }`}
                  >
                    {item.name}
                    {data.cost !== undefined && (
                      <span className="ml-1 opacity-70">Цена – {data.cost}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {/* Show cost info for "Всё" */}
        {response.preference === "Всё" && block.items.some(i => JSON.parse(i.data).cost) && (
          <div className="mt-3 space-y-1">
            {block.items.map((item) => {
              const data = JSON.parse(item.data);
              return data.cost ? (
                <p key={item.id} className="text-xs text-text-secondary">
                  {item.name}: Цена – {data.cost}
                </p>
              ) : null;
            })}
          </div>
        )}
      </Card>
    );
  }

  if (type === "transport") {
    const cars = block.items.filter((i) => JSON.parse(i.data).transportType === "car");
    const others = block.items.filter((i) => JSON.parse(i.data).transportType === "other");
    const hasCars = cars.length > 0;

    return (
      <Card>
        <CardTitle>{block.title}</CardTitle>
        <CardDescription>Как вы добираетесь?</CardDescription>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onUpdate("mode", "passenger")}
            disabled={!hasCars}
            className={`px-4 py-2 rounded-[var(--radius-apple)] text-sm font-medium transition-all ${
              response.mode === "passenger"
                ? "bg-accent text-white"
                : !hasCars
                ? "bg-surface text-text-tertiary cursor-not-allowed"
                : "bg-surface text-text-secondary hover:bg-surface/80"
            }`}
          >
            Пассажиром
            {!hasCars && <span className="block text-xs">(нет машин)</span>}
          </button>
          <button
            onClick={() => onUpdate("mode", "self")}
            className={`px-4 py-2 rounded-[var(--radius-apple)] text-sm font-medium transition-all ${
              response.mode === "self"
                ? "bg-accent text-white"
                : "bg-surface text-text-secondary hover:bg-surface/80"
            }`}
          >
            Своим ходом
          </button>
        </div>

        {response.mode === "passenger" && cars.length > 0 && (
          <div className="mt-3">
            <p className="text-sm text-text-secondary mb-2">Доступные машины:</p>
            {cars.map((item) => {
              const data = JSON.parse(item.data);
              const bookedSeats = item.claims.filter(
                (c) => c.claimType === "book_seat"
              ).length;
              const available = (data.totalSeats || 4) - 1 - bookedSeats;
              const myBooking = item.claims.find(
                (c) => c.claimType === "book_seat" && c.user.id === userId
              );

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-border-light"
                >
                  <div>
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-text-secondary ml-2">
                      {available > 0 ? `${available} свободных мест` : "Мест нет"}
                    </span>
                    {data.departureDate && (
                      <p className="text-xs text-text-tertiary">
                        Выезд: {formatDateRu(data.departureDate)}
                      </p>
                    )}
                    {data.fuelCost && (
                      <p className="text-xs text-text-secondary">
                        Цена – {data.fuelCost} (бензин)
                      </p>
                    )}
                    {item.claims.filter(c => c.claimType === "book_seat").length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {item.claims.filter(c => c.claimType === "book_seat").map((c) => (
                          <Badge key={c.id} variant="accent">{c.user.nickname}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {myBooking ? (
                    <Button size="sm" variant="destructive" onClick={() => onRemoveClaim(myBooking.id)}>
                      Отменить
                    </Button>
                  ) : available > 0 ? (
                    <Button size="sm" variant="secondary" onClick={() => onClaim(item.id, "book_seat")}>
                      Сесть
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {response.mode === "self" && others.length > 0 && (
          <div className="mt-3">
            <p className="text-sm text-text-secondary mb-2">Другие варианты транспорта:</p>
            {others.map((item) => {
              const data = JSON.parse(item.data);
              const myBooking = item.claims.find(
                (c) => c.claimType === "book_seat" && c.user.id === userId
              );
              return (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-border-light">
                  <div>
                    <span className="text-sm font-medium">{item.name}</span>
                    {data.cost && (
                      <span className="text-text-secondary text-sm ml-2">Цена – {data.cost}</span>
                    )}
                    {data.notes && (
                      <p className="text-xs text-text-tertiary">{data.notes}</p>
                    )}
                    {item.claims.filter(c => c.claimType === "book_seat").length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {item.claims.filter(c => c.claimType === "book_seat").map((c) => (
                          <Badge key={c.id} variant="accent">{c.user.nickname}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {myBooking ? (
                    <Button size="sm" variant="destructive" onClick={() => onRemoveClaim(myBooking.id)}>
                      Отменить
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => onClaim(item.id, "book_seat")}>
                      Сесть
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    );
  }

  if (type === "tent") {
    return (
      <Card>
        <CardTitle>{block.title}</CardTitle>
        <CardDescription>Выберите палатку</CardDescription>
        <div className="mt-3 space-y-2">
          {block.items.map((item) => {
            const data = JSON.parse(item.data);
            const bookedSpots = item.claims.filter(
              (c) => c.claimType === "book_spot"
            ).length;
            const available = (data.totalSeats || 2) - bookedSpots;
            const myBooking = item.claims.find(
              (c) => c.claimType === "book_spot" && c.user.id === userId
            );

            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b border-border-light"
              >
                <div>
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-xs text-text-secondary ml-2">
                    {available > 0 ? `${available} свободных мест` : "Мест нет"}
                  </span>
                  <div className="flex gap-1 mt-1">
                    {item.claims
                      .filter((c) => c.claimType === "book_spot")
                      .map((c) => (
                        <Badge key={c.id} variant="accent">{c.user.nickname}</Badge>
                      ))}
                  </div>
                </div>
                {myBooking ? (
                  <Button size="sm" variant="destructive" onClick={() => onRemoveClaim(myBooking.id)}>
                    Отменить
                  </Button>
                ) : available > 0 ? (
                  <Button size="sm" variant="secondary" onClick={() => onClaim(item.id, "book_spot")}>
                    Занять
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  if (type === "equipment") {
    return (
      <Card>
        <CardTitle>{block.title}</CardTitle>
        <CardDescription>Отметьте что вы можете взять с собой</CardDescription>
        <div className="mt-3 space-y-2">
          {block.items.map((item) => {
            const data = JSON.parse(item.data);
            const myClaim = item.claims.find(
              (c) => c.claimType === "bring" && c.user.id === userId
            );

            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b border-border-light"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.name}</span>
                    {data.quantity && (
                      <span className="text-text-secondary text-xs">({data.quantity})</span>
                    )}
                    {data.forEveryone && (
                      <Badge variant="warning">Для всех</Badge>
                    )}
                    {data.itemMode === "buy" && (
                      <Badge variant="accent">Купить</Badge>
                    )}
                  </div>
                  {data.cost !== undefined && data.cost !== "" && (
                    <p className="text-xs text-text-secondary">
                      Цена – {data.cost}
                      {data.buyerName && ` (${data.buyerName})`}
                    </p>
                  )}
                  {item.claims.filter((c) => c.claimType === "bring").length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {item.claims
                        .filter((c) => c.claimType === "bring")
                        .map((c) => (
                          <Badge key={c.id} variant="success">{c.user.nickname} берёт</Badge>
                        ))}
                    </div>
                  )}
                </div>
                {data.itemMode !== "buy" && (
                  myClaim ? (
                    <Button size="sm" variant="destructive" onClick={() => onRemoveClaim(myClaim.id)}>
                      Не беру
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => onClaim(item.id, "bring")}>
                      Беру
                    </Button>
                  )
                )}
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  if (type === "pyrotechnics" || type === "film") {
    return (
      <Card>
        <CardTitle>{block.title}</CardTitle>
        <CardDescription>Хотите участвовать в складчине?</CardDescription>
        <div className="mt-3 space-y-2">
          {block.items.map((item) => {
            const data = JSON.parse(item.data);
            const myClaim = item.claims.find(
              (c) => c.claimType === "opt_in" && c.user.id === userId
            );

            return (
              <div key={item.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium">{item.name}</span>
                  {data.quantity && (
                    <span className="text-text-secondary text-xs ml-2">({data.quantity})</span>
                  )}
                  {data.cost !== undefined && (
                    <span className="text-accent text-xs ml-2">Цена – {data.cost}</span>
                  )}
                  {data.buyerName && (
                    <span className="text-text-tertiary text-xs ml-1">({data.buyerName})</span>
                  )}
                </div>
                {myClaim ? (
                  <Button size="sm" variant="destructive" onClick={() => onRemoveClaim(myClaim.id)}>
                    Отказаться
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => onClaim(item.id, "opt_in")}>
                    Участвую
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  if (type === "activities") {
    return (
      <Card>
        <CardTitle>{block.title}</CardTitle>
        <CardDescription>Запланированные мероприятия</CardDescription>
        <div className="mt-3 space-y-2">
          {block.items.map((item) => {
            const data = JSON.parse(item.data);
            const myClaim = item.claims.find(
              (c) => c.claimType === "opt_in" && c.user.id === userId
            );
            const participantCount = item.claims.filter(c => c.claimType === "opt_in").length;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b border-border-light"
              >
                <div>
                  <span className="text-sm font-medium">{item.name}</span>
                  {data.notes && (
                    <p className="text-xs text-text-tertiary">{data.notes}</p>
                  )}
                  {participantCount > 0 && (
                    <div className="flex gap-1 mt-1">
                      {item.claims.filter(c => c.claimType === "opt_in").map((c) => (
                        <Badge key={c.id} variant="accent">{c.user.nickname}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                {myClaim ? (
                  <Button size="sm" variant="destructive" onClick={() => onRemoveClaim(myClaim.id)}>
                    Не участвую
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => onClaim(item.id, "opt_in")}>
                    Участвую
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  // Default: food, day_food, custom
  return (
    <Card>
      <CardTitle>{block.title}</CardTitle>
      {block.items.length > 0 && (
        <div className="mt-3 space-y-1">
          {block.items.map((item) => {
            const data = JSON.parse(item.data);
            return (
              <div
                key={item.id}
                className="text-sm py-1 border-b border-border-light last:border-0"
              >
                <span className="font-medium">{item.name}</span>
                {data.quantity && (
                  <span className="text-text-secondary ml-2">— {data.quantity}</span>
                )}
                {data.cost !== undefined && data.cost !== "" && (
                  <span className="text-accent ml-2">
                    Цена – {data.cost}
                    {data.buyerName && (
                      <span className="text-text-secondary"> ({data.buyerName})</span>
                    )}
                  </span>
                )}
                {data.source && (
                  <span className="text-text-tertiary ml-2">({data.source})</span>
                )}
                {data.notes && (
                  <p className="text-xs text-text-tertiary">{data.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
