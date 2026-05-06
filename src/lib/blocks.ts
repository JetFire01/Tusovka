export type BlockType =
  | "date_place"
  | "food"
  | "menu"
  | "alcohol"
  | "tent"
  | "equipment"
  | "transport"
  | "pyrotechnics"
  | "film"
  | "day_food"
  | "activities"
  | "custom";

export interface BlockTypeConfig {
  key: BlockType;
  label: string;
  icon: string;
  defaultTitle: string;
  hasCostSplitting: boolean;
  splitDefault: string;
  allowMultiple: boolean;
}

export const BLOCK_TYPES: Record<BlockType, BlockTypeConfig> = {
  date_place: {
    key: "date_place",
    label: "Дата и место",
    icon: "map-pin",
    defaultTitle: "Дата и место",
    hasCostSplitting: false,
    splitDefault: "none",
    allowMultiple: false,
  },
  food: {
    key: "food",
    label: "Еда",
    icon: "utensils",
    defaultTitle: "Еда и продукты",
    hasCostSplitting: true,
    splitDefault: "all",
    allowMultiple: false,
  },
  menu: {
    key: "menu",
    label: "Меню",
    icon: "chef-hat",
    defaultTitle: "Меню",
    hasCostSplitting: false,
    splitDefault: "none",
    allowMultiple: false,
  },
  alcohol: {
    key: "alcohol",
    label: "Алкоголь",
    icon: "wine",
    defaultTitle: "Алкоголь",
    hasCostSplitting: true,
    splitDefault: "drinkers",
    allowMultiple: false,
  },
  tent: {
    key: "tent",
    label: "Палатки",
    icon: "tent",
    defaultTitle: "Палатки и ночлег",
    hasCostSplitting: false,
    splitDefault: "none",
    allowMultiple: false,
  },
  equipment: {
    key: "equipment",
    label: "Оснастка",
    icon: "wrench",
    defaultTitle: "Материалы и оснастка",
    hasCostSplitting: true,
    splitDefault: "all",
    allowMultiple: false,
  },
  transport: {
    key: "transport",
    label: "Транспорт",
    icon: "car",
    defaultTitle: "Транспорт",
    hasCostSplitting: true,
    splitDefault: "car",
    allowMultiple: false,
  },
  pyrotechnics: {
    key: "pyrotechnics",
    label: "Пиротехника",
    icon: "sparkles",
    defaultTitle: "Пиротехника",
    hasCostSplitting: true,
    splitDefault: "opt_in",
    allowMultiple: false,
  },
  film: {
    key: "film",
    label: "Фотоплёнка",
    icon: "camera",
    defaultTitle: "Фотоплёнка",
    hasCostSplitting: true,
    splitDefault: "opt_in",
    allowMultiple: false,
  },
  day_food: {
    key: "day_food",
    label: "Паёк",
    icon: "package",
    defaultTitle: "Паёк на день",
    hasCostSplitting: true,
    splitDefault: "day_attendees",
    allowMultiple: true,
  },
  activities: {
    key: "activities",
    label: "Мероприятия",
    icon: "calendar",
    defaultTitle: "События и мероприятия",
    hasCostSplitting: false,
    splitDefault: "none",
    allowMultiple: false,
  },
  custom: {
    key: "custom",
    label: "Пользовательский",
    icon: "plus",
    defaultTitle: "Новый блок",
    hasCostSplitting: true,
    splitDefault: "all",
    allowMultiple: true,
  },
};

export function getBlockConfig(type: string): BlockTypeConfig | undefined {
  return BLOCK_TYPES[type as BlockType];
}

export type Meal = "breakfast" | "lunch" | "dinner";

const ALL_MEALS: Meal[] = ["breakfast", "lunch", "dinner"];

function timeBucket(time: string): "morning" | "afternoon" | "evening" {
  const [h] = time.split(":").map(Number);
  if (Number.isNaN(h)) return "morning";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const FIRST_DAY_MEALS: Record<"morning" | "afternoon" | "evening", Meal[]> = {
  morning: ["breakfast", "lunch", "dinner"],
  afternoon: ["lunch", "dinner"],
  evening: ["dinner"],
};

const LAST_DAY_MEALS: Record<"morning" | "afternoon" | "evening", Meal[]> = {
  morning: ["breakfast"],
  afternoon: ["breakfast", "lunch"],
  evening: ["breakfast", "lunch", "dinner"],
};

export function getAvailableMeals(
  startTime: string | undefined,
  endTime: string | undefined,
  dayIndex: number,
  totalDays: number
): Meal[] {
  if (totalDays <= 0) return [];
  const isFirst = dayIndex === 0;
  const isLast = dayIndex === totalDays - 1;
  if (totalDays === 1) {
    if (!startTime || !endTime) return [...ALL_MEALS];
    const startMeals = new Set(FIRST_DAY_MEALS[timeBucket(startTime)]);
    const endMeals = new Set(LAST_DAY_MEALS[timeBucket(endTime)]);
    return ALL_MEALS.filter((m) => startMeals.has(m) && endMeals.has(m));
  }
  if (isFirst) return startTime ? FIRST_DAY_MEALS[timeBucket(startTime)] : [...ALL_MEALS];
  if (isLast) return endTime ? LAST_DAY_MEALS[timeBucket(endTime)] : [...ALL_MEALS];
  return [...ALL_MEALS];
}

export function getEventDayDates(
  startDate: string | undefined,
  totalDays: number
): string[] {
  if (!startDate || totalDays <= 0) return [];
  const result: string[] = [];
  const base = new Date(startDate);
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

export function formatDateRu(dateStr: string): string {
  const date = new Date(dateStr);
  const months = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ];
  const weekdays = [
    "воскресенье", "понедельник", "вторник", "среда",
    "четверг", "пятница", "суббота",
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const weekday = weekdays[date.getDay()];
  return `${day} ${month} ${year}г., ${weekday}`;
}
