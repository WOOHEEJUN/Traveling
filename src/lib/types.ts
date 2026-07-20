export const BUDGET_THEMES = [
  {
    key: "gaseongbi",
    label: "가성비 힐링",
    hint: "부담 없이, 알차게",
    description: "숙소는 깔끔한 가성비 위주, 맛집도 현지인 물가 기준",
  },
  {
    key: "date",
    label: "평범한 데이트",
    hint: "적당히 좋은 걸로",
    description: "무난한 중급 숙소와 분위기 좋은 식당",
  },
  {
    key: "anniversary",
    label: "기념일 플렉스",
    hint: "오늘은 좀 쓰자",
    description: "뷰 좋은 호텔·리조트, 특별한 다이닝",
  },
] as const;

export type BudgetTheme = (typeof BUDGET_THEMES)[number]["key"];

export function budgetThemeLabel(key: string): string {
  return BUDGET_THEMES.find((t) => t.key === key)?.label ?? key;
}

export const PLACE_TYPES = [
  { key: "stay", label: "숙소", tint: "lavender", color: "cat-stay" },
  { key: "food", label: "맛집", tint: "peach", color: "cat-food" },
  { key: "dessert", label: "디저트", tint: "rose", color: "cat-dessert" },
  { key: "activity", label: "놀거리", tint: "mint", color: "cat-activity" },
] as const;

export type PlaceType = (typeof PLACE_TYPES)[number]["key"];

export function placeTypeLabel(key: string): string {
  return PLACE_TYPES.find((t) => t.key === key)?.label ?? key;
}

/** 하루치 코스 (TripOption.itinerary 에 JSON 문자열로 저장) */
export interface ItineraryDay {
  day: number;
  title: string;
  detail: string;
}
