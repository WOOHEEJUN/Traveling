/**
 * 카카오 REST API 래퍼 (로컬 검색 + 이미지 검색).
 *
 * Claude가 지목한 장소명으로 키워드 검색을 돌려서 좌표·주소·카카오맵 링크를
 * 붙입니다. 카카오는 REST로 평점을 주지 않기 때문에, place_url을 그대로
 * 노출해서 사용자가 카카오맵에서 직접 리뷰를 확인할 수 있게 합니다.
 */

const KAKAO_API_BASE = "https://dapi.kakao.com/v2";

export interface KakaoPlace {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  placeUrl: string | null;
  category: string | null;
}

interface KakaoKeywordDoc {
  place_name: string;
  road_address_name: string;
  address_name: string;
  x: string; // 경도
  y: string; // 위도
  place_url: string;
  category_group_name: string;
}

function restKey(): string | null {
  return process.env.KAKAO_REST_API_KEY || null;
}

export function isKakaoConfigured(): boolean {
  return restKey() !== null;
}

async function kakaoFetch(path: string, params: Record<string, string>) {
  const key = restKey();
  if (!key) return null;

  const url = new URL(`${KAKAO_API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
    // 장소 정보는 자주 바뀌지 않으니 하루 캐싱
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!res.ok) {
    console.error(`카카오 API 오류 ${res.status}: ${await res.text()}`);
    return null;
  }
  return res.json();
}

/** 키워드로 장소 1건 검색. 못 찾으면 null. */
export async function searchPlace(keyword: string): Promise<KakaoPlace | null> {
  const data = await kakaoFetch("/local/search/keyword.json", {
    query: keyword,
    size: "1",
  });

  const doc: KakaoKeywordDoc | undefined = data?.documents?.[0];
  if (!doc) return null;

  return {
    name: doc.place_name,
    address: doc.road_address_name || doc.address_name || null,
    lat: Number(doc.y),
    lng: Number(doc.x),
    placeUrl: doc.place_url || null,
    category: doc.category_group_name || null,
  };
}

/**
 * 키워드로 장소 여러 건 검색.
 * 사용자가 "성심당"을 검색하면 본점/DCC점/롯데점 중에 고를 수 있어야 해서
 * 단건 검색과 별도로 둡니다.
 */
export async function searchPlaceList(
  keyword: string,
  size = 10,
): Promise<KakaoPlace[]> {
  const data = await kakaoFetch("/local/search/keyword.json", {
    query: keyword,
    size: String(Math.min(Math.max(size, 1), 15)),
  });

  const docs: KakaoKeywordDoc[] = data?.documents ?? [];
  return docs.map((doc) => ({
    name: doc.place_name,
    address: doc.road_address_name || doc.address_name || null,
    lat: Number(doc.y),
    lng: Number(doc.x),
    placeUrl: doc.place_url || null,
    category: doc.category_group_name || null,
  }));
}

/** 여러 키워드를 한 번에 검색 (실패한 건 null) */
export async function searchPlaces(
  keywords: string[],
): Promise<(KakaoPlace | null)[]> {
  return Promise.all(
    keywords.map((k) =>
      searchPlace(k).catch((e) => {
        console.error(`장소 검색 실패: ${k}`, e);
        return null;
      }),
    ),
  );
}

interface KakaoImageDoc {
  thumbnail_url: string;
  image_url: string;
  doc_url: string;
}

/**
 * 장소 사진 1장 찾기.
 *
 * 카카오 로컬 API는 장소 사진을 주지 않아서 이미지 검색으로 대신합니다.
 * 원본(image_url)은 네이버·티스토리 등이라 핫링크가 막히는 경우가 있어,
 * 카카오 CDN에 있는 thumbnail_url을 씁니다.
 */
export async function searchPhoto(keyword: string): Promise<string | null> {
  const data = await kakaoFetch("/search/image", {
    query: keyword,
    size: "1",
    sort: "accuracy",
  });

  const doc: KakaoImageDoc | undefined = data?.documents?.[0];
  return doc?.thumbnail_url ?? null;
}

/** 여러 장소 사진을 한 번에 (실패한 건 null) */
export async function searchPhotos(
  keywords: string[],
): Promise<(string | null)[]> {
  return Promise.all(
    keywords.map((k) =>
      searchPhoto(k).catch((e) => {
        console.error(`사진 검색 실패: ${k}`, e);
        return null;
      }),
    ),
  );
}
