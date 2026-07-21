/**
 * 여행 스타일. 가격대가 아니라 "이번 여행에서 뭘 중심에 둘지"를 고릅니다.
 * Claude 프롬프트에서 코스 구성 비중을 정하는 데 쓰입니다.
 */
export const TRIP_STYLES = [
  {
    key: "hotel",
    label: "호캉스",
    hint: "숙소에서 푹 쉬기",
    description:
      "좋은 숙소가 여행의 중심. 이동을 최소화하고 숙소 시설(수영장·스파·뷰·조식)에서 보내는 시간을 길게 잡습니다. 밖에 나가는 일정은 숙소 근처로 가볍게만.",
  },
  {
    key: "sightseeing",
    label: "관광위주",
    hint: "많이 보고 많이 걷기",
    description:
      "볼거리와 체험이 중심. 명소·전망대·산책로·액티비티를 촘촘히 넣고, 숙소는 동선상 편한 곳이면 충분합니다.",
  },
  {
    key: "food",
    label: "맛집탐방",
    hint: "먹으러 가는 여행",
    description:
      "먹는 게 중심. 그 지역에서만 먹을 수 있는 음식과 유명한 집을 끼니마다 배치하고, 사이사이 소화시킬 겸 가벼운 코스를 넣습니다. 숙소는 먹자골목 접근성 우선.",
  },
] as const;

export type TripStyle = (typeof TRIP_STYLES)[number]["key"];

export function tripStyleLabel(key: string): string {
  return TRIP_STYLES.find((t) => t.key === key)?.label ?? key;
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

/** 여행 모드: 후보 3개 추천받기 vs 가고싶은 곳을 직접 정하기 */
export const TRIP_MODES = [
  { key: "recommend", label: "추천받기", hint: "조건만 주면 골라드려요" },
  { key: "destination", label: "직접 정하기", hint: "가고싶은 곳이 있어요" },
] as const;

export type TripMode = (typeof TRIP_MODES)[number]["key"];

/** 목적지 직접 선택 시 자주 가는 곳 프리셋 */
export const DOMESTIC_DEST_PRESETS = [
  "부산",
  "제주",
  "강릉",
  "여수",
  "경주",
  "전주",
  "속초",
] as const;

export const OVERSEAS_DEST_PRESETS = [
  "오사카",
  "도쿄",
  "후쿠오카",
  "다낭",
  "방콕",
  "타이베이",
  "세부",
] as const;

/** 해외 물가 수준 표시 */
export type OverseasPriceLevel = "저렴한편" | "보통" | "비싼편";

/** 해외 여행 정보 (TripOption.overseasInfo 에 JSON 문자열로 저장) */
export interface OverseasInfo {
  flightNote: string; // 비행시간·직항 여부
  flightPriceLevel: OverseasPriceLevel;
  flightPriceNote: string; // 왕복 항공권 대략 가격대와 싸게 사는 팁
  stayPriceLevel: OverseasPriceLevel;
  stayPriceNote: string; // 숙소 물가 감각 (1박 기준 대략)
  gettingThere: string; // 인천공항 출발 기준 현지 도착까지
  localTransport: string; // 현지에서 다니는 법
  currencyNote: string; // 통화·환전·결제 팁
  timeDiffNote: string; // 시차
  tips: string[]; // 그 나라 여행 꿀팁
}
