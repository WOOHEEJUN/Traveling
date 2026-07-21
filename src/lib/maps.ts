/**
 * 장소의 지도 링크 결정.
 *
 * 카카오맵 링크가 있으면 그걸 쓰고(리뷰·길찾기까지 되므로), 없으면 —
 * 주로 해외 장소나 카카오 검색에 안 걸린 곳 — 구글맵 검색 링크로 대신합니다.
 * 구글맵 검색 URL은 API 키 없이 동작하고, 폰에서는 구글맵 앱이 바로 열립니다.
 */

export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export interface PlaceMapLink {
  href: string;
  label: string;
}

export function placeMapLink(
  kakaoPlaceUrl: string | null,
  query: string,
): PlaceMapLink {
  if (kakaoPlaceUrl) return { href: kakaoPlaceUrl, label: "지도" };
  return { href: googleMapsSearchUrl(query), label: "구글맵" };
}
