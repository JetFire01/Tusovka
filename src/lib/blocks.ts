export type BlockType =
  | "date_place"
  | "food"
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
