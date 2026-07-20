/** 장소 사진은 서버 프록시를 거쳐서 불러옵니다 (핫링크 차단 회피 + 캐싱) */
export function photoSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  return `/api/photo?u=${encodeURIComponent(url)}`;
}
