import type { ItineraryDay } from "./types";

export const PLAN_STATUSES = ["saved", "upcoming", "completed"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export function planStatusLabel(status: string): string {
  switch (status) {
    case "saved":
      return "저장함";
    case "upcoming":
      return "예정";
    case "completed":
      return "다녀옴";
    default:
      return status;
  }
}

/** 캘린더/목록에서 쓰는 상태별 색 (파랑=예정, 회색=완료) */
export const PLAN_STATUS_STYLE: Record<
  string,
  { dot: string; chip: string; text: string }
> = {
  saved: {
    dot: "bg-primary",
    chip: "bg-primary-soft text-primary-deep",
    text: "text-primary-deep",
  },
  upcoming: {
    dot: "bg-plan-upcoming",
    chip: "bg-plan-upcoming-soft text-plan-upcoming",
    text: "text-plan-upcoming",
  },
  completed: {
    dot: "bg-stone",
    chip: "bg-surface text-steel",
    text: "text-steel",
  },
};

interface PlaceLike {
  type: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  kakaoPlaceUrl: string | null;
  photoUrl: string | null;
  note: string | null;
  priceLevel: string | null;
}

export interface DraftDay {
  dayNumber: number;
  title: string | null;
  memo: string | null;
  items: {
    sortOrder: number;
    type: string;
    name: string;
    address: string | null;
    lat: number | null;
    lng: number | null;
    kakaoPlaceUrl: string | null;
    photoUrl: string | null;
    note: string | null;
    priceLevel: string | null;
  }[];
}

function normalize(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

/**
 * 추천 결과를 일자별 일정으로 변환합니다.
 *
 * AI는 장소를 며칠차인지 구조적으로 알려주지 않지만, 코스 설명(detail) 안에
 * 상호명을 그대로 언급합니다. 그래서 설명 텍스트에 이름이 등장하는 날에
 * 배치하고, 못 찾은 장소는 1일차로 보냅니다. 어차피 사용자가 옮길 수 있으니
 * 완벽할 필요는 없고, 처음 열었을 때 그럴듯하기만 하면 됩니다.
 */
export function buildDraftDays(
  itinerary: ItineraryDay[],
  places: PlaceLike[],
  nights: number,
  regionName = "",
): DraftDay[] {
  const dayCount = Math.max(
    1,
    itinerary.length > 0 ? itinerary.length : nights + 1,
  );

  const days: DraftDay[] = Array.from({ length: dayCount }, (_, i) => {
    const source = itinerary.find((d) => d.day === i + 1);
    return {
      dayNumber: i + 1,
      title: source?.title ?? null,
      memo: source?.detail ?? null,
      items: [],
    };
  });

  const region = normalize(regionName);

  for (const place of places) {
    // 상호명이 "단양흑마늘빵"인데 본문엔 "흑마늘빵"으로만 나오는 경우가 흔해서
    // 지역명을 뗀 형태도 함께 찾아봅니다.
    const full = normalize(place.name);
    const candidates = [full];
    if (region && full.startsWith(region) && full.length > region.length + 1) {
      candidates.push(full.slice(region.length));
    }

    let dayIndex = -1;
    for (const key of candidates) {
      dayIndex = days.findIndex(
        (d) => d.memo && normalize(d.memo).includes(key),
      );
      if (dayIndex !== -1) break;
    }

    // 어디에도 안 걸리면 첫날에 둡니다 (사용자가 옮길 수 있음)
    if (dayIndex === -1) dayIndex = 0;

    days[dayIndex].items.push({
      sortOrder: days[dayIndex].items.length,
      type: place.type,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      kakaoPlaceUrl: place.kakaoPlaceUrl,
      photoUrl: place.photoUrl,
      note: place.note,
      priceLevel: place.priceLevel,
    });
  }

  return days;
}

/** "강릉" + 스타일 → "강릉 여행" 같은 기본 제목 */
export function defaultPlanTitle(regionName: string): string {
  return `${regionName} 여행`;
}
