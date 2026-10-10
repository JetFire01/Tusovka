// Финансовый расчёт мероприятия

export interface ParticipantFinance {
  userId: string;
  nickname: string;
  purchases: number;
  foodAndGear: number;
  alcohol: number;
  optInCosts: number;
  fuel: number;
  total: number;
  debts: { to: string; amount: number }[];
}

export interface FinanceResult {
  participants: ParticipantFinance[];
  totalSpent: number;
  // Зачисленные покупателям, но никому не начисленные деньги
  // (алкоголь без пьющих, опт-ин без claims, машина без пассажиров).
  // Отрицательное значение — обратная утечка: начислено, но покупатель не найден.
  unallocated: number;
}

interface BlockItemData {
  cost?: number;
  buyerUserId?: string;
  buyerName?: string;
  fuelCost?: number;
  fuelBuyerUserId?: string;
  fuelBuyerName?: string;
  itemMode?: string;
  transportType?: string;
  sharedFuel?: boolean;
  driverPays?: boolean;
  forEveryone?: boolean;
  [key: string]: unknown;
}

interface ClaimInfo {
  id: string;
  claimType: string;
  user: { id: string; nickname: string };
}

interface ItemInfo {
  id: string;
  name: string;
  data: string;
  claims: ClaimInfo[];
}

interface BlockInfo {
  id: string;
  type: string;
  title: string;
  config: string;
  items: ItemInfo[];
}

interface ParticipantInfo {
  id: string;
  userId: string;
  attending: string;
  user: { id: string; nickname: string };
  surveyResponses: { blockId: string; response: string }[];
}

interface EventInfo {
  blocks: BlockInfo[];
  participants: ParticipantInfo[];
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.abs(e.getTime() - s.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Поиск участника-покупателя: по userId (надёжно при переименовании),
// для старых данных без userId — по нику. Если userId задан, но участник
// не найден, по нику не ищем, чтобы не приписать расход тёзке.
function findBuyer(
  attendees: ParticipantInfo[],
  userId?: string,
  nickname?: string
): ParticipantInfo | undefined {
  if (userId) {
    return attendees.find((a) => a.user.id === userId);
  }
  if (nickname) {
    return attendees.find((a) => a.user.nickname === nickname);
  }
  return undefined;
}

function parseData(dataStr: string): BlockItemData {
  try {
    return JSON.parse(dataStr);
  } catch {
    return {};
  }
}

export function calculateFinances(event: EventInfo): FinanceResult {
  const attendees = event.participants.filter((p) => p.attending === "yes");
  if (attendees.length === 0) {
    return { participants: [], totalSpent: 0, unallocated: 0 };
  }

  // Init finance map
  const finMap = new Map<string, ParticipantFinance>();
  for (const a of attendees) {
    finMap.set(a.user.id, {
      userId: a.user.id,
      nickname: a.user.nickname,
      purchases: 0,
      foodAndGear: 0,
      alcohol: 0,
      optInCosts: 0,
      fuel: 0,
      total: 0,
      debts: [],
    });
  }

  // 1. Event dates & day coefficients
  const datePlaceBlock = event.blocks.find((b) => b.type === "date_place");
  let totalDays = 1;
  let eventStart = "";
  let eventEnd = "";

  if (datePlaceBlock) {
    const cfg = parseData(datePlaceBlock.config);
    eventStart = (cfg.startDate as string) || "";
    eventEnd = (cfg.endDate as string) || "";
    if (eventStart && eventEnd) {
      totalDays = daysBetween(eventStart, eventEnd) + 1;
    }
  }

  // Day coefficient for each attendee
  const dayCoeffs = new Map<string, number>();
  for (const a of attendees) {
    let coeff = 1;
    if (datePlaceBlock && eventStart && eventEnd && totalDays > 1) {
      const resp = a.surveyResponses.find((r) => r.blockId === datePlaceBlock.id);
      if (resp) {
        const rData = parseData(resp.response);
        const pStart = (rData.startDate as string) || eventStart;
        const pEnd = (rData.endDate as string) || eventEnd;
        const personDays = daysBetween(pStart, pEnd) + 1;
        coeff = Math.min(personDays, totalDays) / totalDays;
      }
    }
    dayCoeffs.set(a.user.id, coeff);
  }

  // 2. Calculate food total. Custom-блоки (splitDefault: "all") делятся
  // так же, как еда, — иначе их стоимость зачисляется покупателю (шаг 8),
  // но никому не начисляется.
  let foodTotal = 0;
  const foodBlocks = event.blocks.filter(
    (b) => b.type === "food" || b.type === "day_food" || b.type === "custom"
  );
  for (const block of foodBlocks) {
    for (const item of block.items) {
      const d = parseData(item.data);
      if (d.cost && typeof d.cost === "number") {
        foodTotal += d.cost;
      }
    }
  }

  // 3. Calculate equipment (buy) total
  let equipBuyTotal = 0;
  const equipBlocks = event.blocks.filter((b) => b.type === "equipment");
  for (const block of equipBlocks) {
    for (const item of block.items) {
      const d = parseData(item.data);
      if (d.itemMode === "buy" && d.cost && typeof d.cost === "number") {
        equipBuyTotal += d.cost;
      }
    }
  }

  // 4. Food share with day coefficients
  const totalFoodShares = Array.from(dayCoeffs.values()).reduce(
    (s, c) => s + c,
    0
  );
  for (const a of attendees) {
    const f = finMap.get(a.user.id)!;
    const coeff = dayCoeffs.get(a.user.id) || 1;
    const foodShare =
      totalFoodShares > 0
        ? foodTotal * (coeff / totalFoodShares)
        : foodTotal / attendees.length;
    const equipShare =
      attendees.length > 0 ? equipBuyTotal / attendees.length : 0;
    f.foodAndGear = foodShare + equipShare;
  }

  // 5. Alcohol — per item, split among drinkers of that type
  const alcoholBlocks = event.blocks.filter((b) => b.type === "alcohol");
  for (const block of alcoholBlocks) {
    // Get alcohol preferences from survey responses
    const alcoholResponses = new Map<string, { preference: string; types: string[] }>();
    for (const a of attendees) {
      const resp = a.surveyResponses.find((r) => r.blockId === block.id);
      if (resp) {
        const rData = parseData(resp.response);
        alcoholResponses.set(a.user.id, {
          preference: (rData.preference as string) || "",
          types: (rData.types as string[]) || [],
        });
      }
    }

    for (const item of block.items) {
      const d = parseData(item.data);
      if (!d.cost || typeof d.cost !== "number") continue;

      // Find who drinks this
      const drinkers = attendees.filter((a) => {
        const pref = alcoholResponses.get(a.user.id);
        if (!pref) return false;
        if (pref.preference === "all" || pref.preference === "Всё") return true;
        if (pref.preference === "none" || pref.preference === "Не пью") return false;
        if (pref.preference === "only" || pref.preference === "Пью только...") {
          return pref.types.includes(item.name);
        }
        return false;
      });

      if (drinkers.length === 0) continue;
      const perPerson = d.cost / drinkers.length;
      for (const dr of drinkers) {
        finMap.get(dr.user.id)!.alcohol += perPerson;
      }
    }
  }

  // 6. Opt-in costs (pyrotechnics, film)
  const optInBlocks = event.blocks.filter(
    (b) => b.type === "pyrotechnics" || b.type === "film"
  );
  for (const block of optInBlocks) {
    for (const item of block.items) {
      const d = parseData(item.data);
      if (!d.cost || typeof d.cost !== "number") continue;

      const optedIn = item.claims.filter((c) => c.claimType === "opt_in");
      if (optedIn.length === 0) continue;

      const perPerson = d.cost / optedIn.length;
      for (const claim of optedIn) {
        const f = finMap.get(claim.user.id);
        if (f) f.optInCosts += perPerson;
      }
    }
  }

  // 7. Fuel calculation
  const transportBlocks = event.blocks.filter((b) => b.type === "transport");
  const cars: {
    item: ItemInfo;
    data: BlockItemData;
  }[] = [];

  for (const block of transportBlocks) {
    for (const item of block.items) {
      const d = parseData(item.data);
      if (d.transportType === "car" && d.fuelCost && typeof d.fuelCost === "number") {
        cars.push({ item, data: d });
      }
    }
  }

  // Shared fuel cars
  const sharedFuelCars = cars.filter((c) => c.data.sharedFuel);
  if (sharedFuelCars.length > 0) {
    const totalSharedFuel = sharedFuelCars.reduce(
      (s, c) => s + (c.data.fuelCost || 0),
      0
    );

    // Collect all passengers + drivers for shared cars
    const sharedPassengerIds = new Set<string>();
    for (const car of sharedFuelCars) {
      // Passengers
      for (const claim of car.item.claims) {
        if (claim.claimType === "book_seat") {
          sharedPassengerIds.add(claim.user.id);
        }
      }
      // Driver (car name might be owner — we need to find who added it)
      // Driver is identified by fuelBuyerUserId (legacy: fuelBuyerName)
      if (car.data.driverPays) {
        const driver = findBuyer(
          attendees,
          car.data.fuelBuyerUserId,
          car.data.fuelBuyerName
        );
        if (driver) sharedPassengerIds.add(driver.user.id);
      }
    }

    if (sharedPassengerIds.size > 0) {
      const perPerson = totalSharedFuel / sharedPassengerIds.size;
      for (const pid of sharedPassengerIds) {
        const f = finMap.get(pid);
        if (f) f.fuel += perPerson;
      }
    }
  }

  // Per-car fuel (not shared)
  const perCarFuelCars = cars.filter((c) => !c.data.sharedFuel);
  for (const car of perCarFuelCars) {
    const passengerIds = new Set<string>();

    for (const claim of car.item.claims) {
      if (claim.claimType === "book_seat") {
        passengerIds.add(claim.user.id);
      }
    }

    // Add driver if driverPays
    if (car.data.driverPays) {
      const driver = findBuyer(
        attendees,
        car.data.fuelBuyerUserId,
        car.data.fuelBuyerName
      );
      if (driver) passengerIds.add(driver.user.id);
    }

    if (passengerIds.size > 0) {
      const perPerson = (car.data.fuelCost || 0) / passengerIds.size;
      for (const pid of passengerIds) {
        const f = finMap.get(pid);
        if (f) f.fuel += perPerson;
      }
    }
  }

  // 8. Calculate purchases (how much each person spent)
  const allBlocks = event.blocks;
  for (const block of allBlocks) {
    for (const item of block.items) {
      const d = parseData(item.data);

      // buyerUserId / buyerName → purchases
      if (d.cost && typeof d.cost === "number") {
        const buyer = findBuyer(attendees, d.buyerUserId, d.buyerName);
        if (buyer) {
          finMap.get(buyer.user.id)!.purchases += d.cost;
        }
      }

      // fuelBuyerUserId / fuelBuyerName → purchases
      if (d.fuelCost && typeof d.fuelCost === "number") {
        const buyer = findBuyer(attendees, d.fuelBuyerUserId, d.fuelBuyerName);
        if (buyer) {
          finMap.get(buyer.user.id)!.purchases += d.fuelCost;
        }
      }
    }
  }

  // 9. Calculate total
  let totalSpent = 0;
  for (const f of finMap.values()) {
    f.total =
      f.purchases - (f.foodAndGear + f.alcohol + f.optInCosts + f.fuel);
    f.total = Math.round(f.total * 100) / 100;
    f.foodAndGear = Math.round(f.foodAndGear * 100) / 100;
    f.alcohol = Math.round(f.alcohol * 100) / 100;
    f.optInCosts = Math.round(f.optInCosts * 100) / 100;
    f.fuel = Math.round(f.fuel * 100) / 100;
    f.purchases = Math.round(f.purchases * 100) / 100;
    totalSpent += f.purchases;
  }

  // 10. "Кому торчишь?" — distribute debts proportionally
  const participants = Array.from(finMap.values());
  const creditors = participants.filter((p) => p.total > 0);
  const totalCredit = creditors.reduce((s, c) => s + c.total, 0);

  if (totalCredit > 0) {
    for (const p of participants) {
      if (p.total >= 0) continue; // only debtors
      const debt = Math.abs(p.total);
      for (const cr of creditors) {
        const amount = Math.round((debt * (cr.total / totalCredit)) * 100) / 100;
        if (amount > 0) {
          p.debts.push({ to: cr.nickname, amount });
        }
      }
    }
  }

  // 11. Сверка баланса: сумма плюсов должна равняться сумме модулей минусов.
  // Расхождение — деньги, зачисленные покупателям, но никому не начисленные
  // (или наоборот); UI показывает предупреждение, если |unallocated| > 0.
  const sumPositive = participants
    .filter((p) => p.total > 0)
    .reduce((s, p) => s + p.total, 0);
  const sumNegative = participants
    .filter((p) => p.total < 0)
    .reduce((s, p) => s + Math.abs(p.total), 0);
  const unallocated = Math.round((sumPositive - sumNegative) * 100) / 100;

  return { participants, totalSpent, unallocated };
}
