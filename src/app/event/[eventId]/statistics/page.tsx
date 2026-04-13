"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateRu } from "@/lib/blocks";
import { calculateFinances, FinanceResult } from "@/lib/money";

interface EventData {
  id: string;
  title: string;
  description: string | null;
  participants: {
    id: string;
    attending: string;
    arrivalDay: number | null;
    userId: string;
    user: { id: string; nickname: string };
    surveyResponses: { blockId: string; response: string }[];
  }[];
  blocks: {
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
  }[];
  purchases: {
    id: string;
    category: string;
    item: string;
    amount: number;
    splitRule: string;
    buyer: { id: string; nickname: string };
  }[];
}

export default function StatisticsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<EventData | null>(null);
  const [finances, setFinances] = useState<FinanceResult | null>(null);

  const fetchEvent = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}`);
    if (res.ok) {
      const data = await res.json();
      setEvent(data);
      setFinances(calculateFinances(data));
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  if (!event) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const attendees = event.participants.filter((p) => p.attending === "yes");

  // Equipment warnings
  const equipmentBlock = event.blocks.find((b) => b.type === "equipment");
  const unclaimedItems =
    equipmentBlock?.items.filter((item) => {
      const data = JSON.parse(item.data);
      return (
        data.itemMode !== "buy" &&
        !item.claims.some((c) => c.claimType === "bring")
      );
    }) || [];

  // Date & place
  const datePlaceBlock = event.blocks.find((b) => b.type === "date_place");
  const datePlaceConfig = datePlaceBlock
    ? JSON.parse(datePlaceBlock.config)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{event.title}</h1>
        {event.description && (
          <p className="text-text-secondary mt-1">{event.description}</p>
        )}
      </div>

      {/* Date & Place */}
      {datePlaceConfig && datePlaceConfig.startDate && (
        <Card>
          <CardTitle>Дата и место</CardTitle>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              {formatDateRu(datePlaceConfig.startDate)}
              {datePlaceConfig.startTime && `, ${datePlaceConfig.startTime}`}
              {datePlaceConfig.endDate &&
                ` — ${formatDateRu(datePlaceConfig.endDate)}`}
              {datePlaceConfig.endTime && `, ${datePlaceConfig.endTime}`}
            </p>
            {datePlaceConfig.place && (
              <p className="text-sm text-text-secondary">
                {datePlaceConfig.place}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Finance Table */}
      {finances && finances.participants.length > 0 && (
        <Card padding="none">
          <div className="p-4 sm:p-5 border-b border-border-light">
            <CardTitle>
              Участники ({attendees.length}) — Финансы
            </CardTitle>
            {finances.totalSpent > 0 && (
              <p className="text-sm text-text-secondary mt-1">
                Общие затраты: {finances.totalSpent.toFixed(2)}
              </p>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light bg-surface/50">
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">
                    Имя
                  </th>
                  <th className="text-right px-3 py-3 font-medium text-text-secondary">
                    Покупки
                  </th>
                  <th className="text-right px-3 py-3 font-medium text-text-secondary">
                    Должок
                  </th>
                  <th className="text-right px-3 py-3 font-medium text-text-secondary">
                    Алкоголь
                  </th>
                  <th className="text-right px-3 py-3 font-medium text-text-secondary">
                    Пиро/Плёнка
                  </th>
                  <th className="text-right px-3 py-3 font-medium text-text-secondary">
                    Бензин
                  </th>
                  <th className="text-right px-3 py-3 font-medium text-text-secondary">
                    Итого
                  </th>
                  <th className="text-left px-3 py-3 font-medium text-text-secondary">
                    Кому торчишь?
                  </th>
                </tr>
              </thead>
              <tbody>
                {finances.participants.map((p) => (
                  <tr
                    key={p.userId}
                    className="border-b border-border-light last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{p.nickname}</td>
                    <td className="text-right px-3 py-3 text-success">
                      {p.purchases > 0 ? `+${p.purchases.toFixed(2)}` : "—"}
                    </td>
                    <td className="text-right px-3 py-3">
                      {p.foodAndGear > 0 ? p.foodAndGear.toFixed(2) : "—"}
                    </td>
                    <td className="text-right px-3 py-3">
                      {p.alcohol > 0 ? p.alcohol.toFixed(2) : "—"}
                    </td>
                    <td className="text-right px-3 py-3">
                      {p.optInCosts > 0 ? p.optInCosts.toFixed(2) : "—"}
                    </td>
                    <td className="text-right px-3 py-3">
                      {p.fuel > 0 ? p.fuel.toFixed(2) : "—"}
                    </td>
                    <td
                      className={`text-right px-3 py-3 font-semibold ${
                        p.total > 0
                          ? "text-success"
                          : p.total < 0
                          ? "text-destructive"
                          : ""
                      }`}
                    >
                      {p.total > 0
                        ? `+${p.total.toFixed(2)}`
                        : p.total < 0
                        ? p.total.toFixed(2)
                        : "0"}
                    </td>
                    <td className="px-3 py-3 text-xs text-text-secondary">
                      {p.debts.length > 0
                        ? p.debts
                            .map((d) => `${d.amount.toFixed(2)} → ${d.to}`)
                            .join(", ")
                        : p.total > 0
                        ? "Ему должны"
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden divide-y divide-border-light">
            {finances.participants.map((p) => (
              <div key={p.userId} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{p.nickname}</span>
                  <span
                    className={`font-bold text-lg ${
                      p.total > 0
                        ? "text-success"
                        : p.total < 0
                        ? "text-destructive"
                        : ""
                    }`}
                  >
                    {p.total > 0
                      ? `+${p.total.toFixed(2)}`
                      : p.total.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {p.purchases > 0 && (
                    <>
                      <span className="text-text-secondary">Покупки</span>
                      <span className="text-right text-success">
                        +{p.purchases.toFixed(2)}
                      </span>
                    </>
                  )}
                  {p.foodAndGear > 0 && (
                    <>
                      <span className="text-text-secondary">Должок</span>
                      <span className="text-right">
                        {p.foodAndGear.toFixed(2)}
                      </span>
                    </>
                  )}
                  {p.alcohol > 0 && (
                    <>
                      <span className="text-text-secondary">Алкоголь</span>
                      <span className="text-right">
                        {p.alcohol.toFixed(2)}
                      </span>
                    </>
                  )}
                  {p.optInCosts > 0 && (
                    <>
                      <span className="text-text-secondary">Пиро/Плёнка</span>
                      <span className="text-right">
                        {p.optInCosts.toFixed(2)}
                      </span>
                    </>
                  )}
                  {p.fuel > 0 && (
                    <>
                      <span className="text-text-secondary">Бензин</span>
                      <span className="text-right">{p.fuel.toFixed(2)}</span>
                    </>
                  )}
                </div>
                {p.debts.length > 0 && (
                  <div className="text-xs text-text-secondary pt-1 border-t border-border-light">
                    Кому торчишь:{" "}
                    {p.debts
                      .map((d) => `${d.amount.toFixed(2)} → ${d.to}`)
                      .join(", ")}
                  </div>
                )}
                {p.total > 0 && (
                  <div className="text-xs text-success pt-1 border-t border-border-light">
                    Ему должны вернуть {p.total.toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Non-attending participants */}
      {event.participants.filter((p) => p.attending !== "yes").length > 0 && (
        <div className="flex flex-wrap gap-2">
          {event.participants
            .filter((p) => p.attending !== "yes")
            .map((p) => (
              <Badge
                key={p.id}
                variant={p.attending === "no" ? "destructive" : "default"}
              >
                {p.user.nickname}
                {p.attending === "no" ? " (не идёт)" : " (?)"}
              </Badge>
            ))}
        </div>
      )}

      {/* Blocks overview — render each, with "unclaimed" right after equipment */}
      {event.blocks
        .filter((b) => b.type !== "date_place")
        .map((block) => (
          <div key={block.id}>
            <Card>
              <CardTitle>{block.title}</CardTitle>
              {block.items.length === 0 ? (
                <p className="text-sm text-text-tertiary mt-2">
                  Нет элементов
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {block.items.map((item) => {
                    const data = JSON.parse(item.data);
                    const claims = item.claims;
                    return (
                      <div
                        key={item.id}
                        className="flex items-start justify-between text-sm border-b border-border-light pb-2 last:border-0"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            {data.quantity && (
                              <span className="text-text-secondary">
                                ({data.quantity})
                              </span>
                            )}
                            {data.forEveryone && (
                              <Badge variant="warning">Для всех</Badge>
                            )}
                            {data.itemMode === "buy" && (
                              <Badge variant="accent">Купить</Badge>
                            )}
                            {data.transportType === "car" && (
                              <Badge variant="accent">Машина</Badge>
                            )}
                          </div>
                          {data.cost !== undefined && data.cost !== "" && (
                            <p className="text-xs text-text-secondary">
                              Цена – {data.cost}
                              {data.buyerName && ` (${data.buyerName})`}
                            </p>
                          )}
                          {data.fuelCost !== undefined &&
                            data.fuelCost !== "" && (
                              <p className="text-xs text-text-secondary">
                                Бензин – {data.fuelCost}
                                {data.fuelBuyerName &&
                                  ` (${data.fuelBuyerName})`}
                              </p>
                            )}
                          {data.departureDate && (
                            <p className="text-xs text-text-tertiary">
                              Выезд: {formatDateRu(data.departureDate)}
                            </p>
                          )}
                          {data.notes && (
                            <p className="text-xs text-text-tertiary">
                              {data.notes}
                            </p>
                          )}
                          {claims.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {claims.map((c) => (
                                <Badge key={c.id} variant="accent">
                                  {c.user.nickname}
                                  {c.claimType === "bring" && " берёт"}
                                  {c.claimType === "book_spot" && " бронь"}
                                  {c.claimType === "book_seat" && " едет"}
                                  {c.claimType === "opt_in" && " участвует"}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        {data.source && (
                          <span className="text-text-tertiary text-xs">
                            {data.source}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* "Никто не берёт" right after equipment block */}
            {block.type === "equipment" && unclaimedItems.length > 0 && (
              <Card className="border-2 border-warning/30 mt-4">
                <CardTitle>Никто не берёт!</CardTitle>
                <div className="mt-2 space-y-1">
                  {unclaimedItems.map((item) => {
                    const data = JSON.parse(item.data);
                    return (
                      <p key={item.id} className="text-sm text-warning">
                        {item.name}
                        {data.quantity && ` — ${data.quantity}`}
                        {data.forEveryone && " (для всех!)"}
                      </p>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        ))}

      {/* Refresh */}
      <div className="text-center pb-4">
        <button
          onClick={fetchEvent}
          className="text-sm text-accent hover:underline"
        >
          Обновить данные
        </button>
      </div>
    </div>
  );
}
