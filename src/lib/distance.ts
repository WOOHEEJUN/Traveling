/**
 * 출발지 기준 이동 가능 거리 계산.
 *
 * 카카오모빌리티 길찾기 API는 별도 사업자 심사가 필요해서, 우선 직선거리에
 * 도로 굴곡 보정계수를 곱해 운전시간을 추정합니다. 나중에 실제 길찾기 API로
 * 교체하려면 estimateDriveMinutes만 갈아끼우면 됩니다.
 */

export interface Coord {
  lat: number;
  lng: number;
}

/** 자주 쓰는 출발지 프리셋 (기본값은 원주) */
export const ORIGIN_PRESETS = [
  { name: "원주", lat: 37.3422, lng: 127.9202 },
  { name: "인천", lat: 37.4563, lng: 126.7052 },
  { name: "정선", lat: 37.3807, lng: 128.6608 },
  { name: "서울", lat: 37.5665, lng: 126.978 },
] as const;

export const DEFAULT_ORIGIN = ORIGIN_PRESETS[0];

/** 실제 도로는 직선보다 길어서 보정 (국내 실측 대비 약 1.2배) */
const ROAD_DETOUR_FACTOR = 1.2;

/**
 * 거리대별 평균 주행속도(km/h).
 * 짧은 거리는 국도·시내 비중이 높아 느리고, 먼 거리는 대부분 고속도로라 빠릅니다.
 * 단일 속도를 쓰면 장거리를 과하게 멀게 계산해서 갈 수 있는 곳까지 걸러집니다.
 */
function averageSpeedKmh(roadKm: number): number {
  if (roadKm < 100) return 60;
  if (roadKm < 250) return 80;
  return 90;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

/** 두 좌표 사이 직선거리(km) */
export function haversineKm(a: Coord, b: Coord): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** 편도 예상 운전시간(분) */
export function estimateDriveMinutes(from: Coord, to: Coord): number {
  const km = haversineKm(from, to) * ROAD_DETOUR_FACTOR;
  return Math.round((km / averageSpeedKmh(km)) * 60);
}

/**
 * 숙박일수별 편도 이동 허용시간(분).
 *
 * 1박2일에 부산(편도 4시간)을 가면 왕복 8시간이라 실제로 노는 시간이 거의
 * 없어지기 때문에, 기간에 따라 갈 수 있는 반경을 제한합니다.
 */
export function maxOneWayMinutes(nights: number): number {
  if (nights <= 0) return 90; // 당일치기
  if (nights === 1) return 150; // 1박2일 — 편도 2시간 30분
  if (nights === 2) return 240; // 2박3일 — 편도 4시간
  return 330; // 3박 이상
}

export function formatDriveTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export function nightsLabel(nights: number): string {
  if (nights <= 0) return "당일치기";
  return `${nights}박 ${nights + 1}일`;
}
