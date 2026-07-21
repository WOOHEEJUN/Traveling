"use client";

import { useEffect, useRef, useState } from "react";
import { PLACE_TYPES } from "@/lib/types";
import { photoSrc } from "@/lib/photo";

export interface MapPlace {
  id: string;
  type: string;
  name: string;
  lat: number | null;
  lng: number | null;
  note?: string | null;
  photoUrl?: string | null;
  kakaoPlaceUrl?: string | null;
  priceLevel?: string | null;
}

/** 지도에 실제로 찍을 수 있는 (좌표가 있는) 장소 */
interface MappablePlace extends MapPlace {
  lat: number;
  lng: number;
}

// 카테고리별 마커 색 (globals.css 토큰과 맞춤)
const MARKER_COLORS: Record<string, string> = {
  stay: "#7b3ff2",
  food: "#dd5b00",
  dessert: "#d6336c",
  activity: "#2a9d99",
};

/** 카카오맵 SDK 중 이 컴포넌트에서 쓰는 부분만 최소한으로 타입 선언 */
interface KakaoLatLng {
  _brand?: never;
}
interface KakaoPoint {
  x: number;
  y: number;
}
interface KakaoProjection {
  containerPointFromCoords(latlng: KakaoLatLng): KakaoPoint;
  coordsFromContainerPoint(point: KakaoPoint): KakaoLatLng;
}
interface KakaoMarker {
  setMap(map: KakaoMapInstance | null): void;
}
interface KakaoMapInstance {
  setBounds(bounds: KakaoBounds, ...padding: number[]): void;
  panTo(latlng: KakaoLatLng): void;
  relayout(): void;
  getCenter(): KakaoLatLng;
  getProjection(): KakaoProjection;
}
interface KakaoCustomOverlay {
  setMap(map: KakaoMapInstance | null): void;
  setPosition(latlng: KakaoLatLng): void;
  setContent(content: HTMLElement | string): void;
}
interface KakaoBounds {
  extend(latlng: KakaoLatLng): void;
}
interface KakaoNamespace {
  maps: {
    load(cb: () => void): void;
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    LatLngBounds: new () => KakaoBounds;
    Point: new (x: number, y: number) => KakaoPoint;
    Map: new (
      container: HTMLElement,
      options: { center: KakaoLatLng; level: number },
    ) => KakaoMapInstance;
    Marker: new (options: {
      map: KakaoMapInstance;
      position: KakaoLatLng;
      title: string;
      image: object;
    }) => KakaoMarker;
    MarkerImage: new (
      src: string,
      size: object,
      options: { offset: object },
    ) => object;
    CustomOverlay: new (options: {
      position: KakaoLatLng;
      content: HTMLElement | string;
      yAnchor?: number;
      xAnchor?: number;
      zIndex?: number;
      clickable?: boolean;
    }) => KakaoCustomOverlay;
    Size: new (w: number, h: number) => object;
    event: {
      addListener(
        target: KakaoMarker | KakaoMapInstance,
        type: string,
        cb: () => void,
      ): void;
    };
  };
}

declare global {
  interface Window {
    kakao?: KakaoNamespace;
  }
}

let sdkPromise: Promise<KakaoNamespace> | null = null;

/** 카카오맵 JS SDK를 한 번만 로드 */
function loadKakaoSdk(appKey: string): Promise<KakaoNamespace> {
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    if (window.kakao?.maps) {
      resolve(window.kakao);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.async = true;
    script.onload = () => {
      const kakao = window.kakao;
      if (!kakao) {
        reject(new Error("카카오맵 SDK를 불러오지 못했어요."));
        return;
      }
      kakao.maps.load(() => resolve(kakao));
    };
    // SDK가 401을 주면 대개 카카오 개발자센터에 현재 도메인이 등록되지 않은 경우
    script.onerror = () => {
      sdkPromise = null; // 도메인 등록 후 재시도할 수 있도록 캐시 해제
      reject(
        new Error(
          `카카오맵을 불러오지 못했어요. 카카오 개발자센터 > 앱 설정 > 플랫폼 > Web에 ${window.location.origin} 이 등록되어 있는지 확인해주세요.`,
        ),
      );
    };
    document.head.appendChild(script);
  });

  return sdkPromise;
}

function markerSvg(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 26 34">
    <path d="M13 0C5.8 0 0 5.8 0 13c0 9.5 13 21 13 21s13-11.5 13-21C26 5.8 20.2 0 13 0z" fill="${color}"/>
    <circle cx="13" cy="13" r="4.8" fill="#fff"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

function isMappable(p: MapPlace): p is MappablePlace {
  return typeof p.lat === "number" && typeof p.lng === "number";
}

/** 마커/라벨을 눌렀을 때 항상 보이는 이름표. */
function buildLabel(place: MappablePlace, color: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "map-label";

  const dot = document.createElement("span");
  dot.className = "map-label-dot";
  dot.style.backgroundColor = color;
  el.appendChild(dot);

  const text = document.createElement("span");
  text.className = "map-label-text";
  text.textContent = place.name;
  el.appendChild(text);

  return el;
}

/** 마커를 눌렀을 때 뜨는 말풍선. DOM으로 만들어야 XSS 걱정 없이 안전합니다. */
function buildPopup(
  place: MappablePlace,
  typeLabel: string,
  color: string,
  onClose: () => void,
): HTMLElement {
  const el = document.createElement("div");
  el.className = "map-popup";

  const card = document.createElement("div");
  card.className = "map-popup-card";

  const photo = photoSrc(place.photoUrl);
  if (photo) {
    const img = document.createElement("img");
    img.src = photo;
    img.alt = "";
    img.className = "map-popup-thumb";
    // 사진이 깨지면 영역만 차지하지 않도록 제거
    img.onerror = () => img.remove();
    card.appendChild(img);
  }

  const body = document.createElement("div");
  body.className = "map-popup-body";

  const head = document.createElement("div");
  head.className = "map-popup-head";

  const badge = document.createElement("span");
  badge.className = "map-popup-badge";
  badge.style.backgroundColor = color;
  badge.textContent = typeLabel;
  head.appendChild(badge);

  if (place.priceLevel) {
    const price = document.createElement("span");
    price.className = "map-popup-price";
    price.textContent = place.priceLevel;
    head.appendChild(price);
  }
  body.appendChild(head);

  const name = document.createElement("p");
  name.className = "map-popup-name";
  name.textContent = place.name;
  body.appendChild(name);

  if (place.note) {
    const note = document.createElement("p");
    note.className = "map-popup-note";
    note.textContent = place.note;
    body.appendChild(note);
  }

  if (place.kakaoPlaceUrl) {
    const link = document.createElement("a");
    link.href = place.kakaoPlaceUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "map-popup-link";
    link.textContent = "카카오맵에서 보기";
    body.appendChild(link);
  }

  card.appendChild(body);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "map-popup-close";
  close.setAttribute("aria-label", "닫기");
  close.textContent = "×";
  close.onclick = (e) => {
    e.stopPropagation();
    onClose();
  };
  card.appendChild(close);

  el.appendChild(card);

  const tail = document.createElement("div");
  tail.className = "map-popup-tail";
  el.appendChild(tail);

  return el;
}

interface Props {
  places: MapPlace[];
  /** 선택된 장소 id — 지정되면 해당 마커로 이동 */
  focusedId?: string | null;
  onSelect?: (id: string) => void;
}

export default function KakaoMap({ places, focusedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const labelElsRef = useRef<Map<string, HTMLElement>>(new Map());
  const overlayRef = useRef<KakaoCustomOverlay | null>(null);
  // 지금 열려 있는 말풍선의 장소 id — 리스트 포커스와 마커 클릭이 서로 안 싸우게
  const popupIdRef = useRef<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  const mappable = places.filter(isMappable);
  // 장소 구성이 실제로 바뀔 때만 지도를 다시 그리기 위한 안정적인 키.
  // (부모가 리렌더될 때마다 places 배열은 새로 생기므로 배열 자체를 deps로 쓰면 안 됨)
  const placesKey = mappable.map((p) => p.id).join("|");

  useEffect(() => {
    if (!appKey || mappable.length === 0) return;

    let cancelled = false;
    const labelEls = labelElsRef.current;
    const cleanupRef: { current: null | (() => void) } = { current: null };

    loadKakaoSdk(appKey)
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;

        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(mappable[0].lat, mappable[0].lng),
          level: 7,
        });
        mapRef.current = map;

        const markers: KakaoMarker[] = [];
        const labelOverlays: KakaoCustomOverlay[] = [];
        const bounds = new kakao.maps.LatLngBounds();
        // 말풍선을 열 때 마커가 지도 어디쯤 오게 할지 (0=위, 1=아래)
        const posById = new Map<string, KakaoLatLng>();

        const closePopup = () => {
          overlayRef.current?.setMap(null);
          overlayRef.current = null;
          popupIdRef.current = null;
        };

        /** 마커를 지도 아래쪽(약 72% 높이)으로 옮겨서 위에 뜨는 말풍선이 안 잘리게 */
        const panWithRoom = (pos: KakaoLatLng) => {
          const el = containerRef.current;
          const proj = map.getProjection();
          if (!el || !proj) {
            map.panTo(pos);
            return;
          }
          const h = el.clientHeight;
          const m = proj.containerPointFromCoords(pos);
          const target = proj.coordsFromContainerPoint(
            new kakao.maps.Point(m.x, h / 2 + m.y - h * 0.72),
          );
          map.panTo(target);
        };

        const openPopup = (id: string) => {
          const place = mappable.find((p) => p.id === id);
          const pos = posById.get(id);
          if (!place || !pos) return;
          if (popupIdRef.current === id && overlayRef.current) return;

          closePopup();
          const color = MARKER_COLORS[place.type] ?? "#ff6b6b";
          const typeLabel =
            PLACE_TYPES.find((t) => t.key === place.type)?.label ?? "";
          const overlay = new kakao.maps.CustomOverlay({
            position: pos,
            content: buildPopup(place, typeLabel, color, closePopup),
            yAnchor: 1.32, // 마커 위쪽에 뜨도록
            zIndex: 20,
          });
          overlay.setMap(map);
          overlayRef.current = overlay;
          popupIdRef.current = id;
          panWithRoom(pos);
        };

        for (const place of mappable) {
          const pos = new kakao.maps.LatLng(place.lat, place.lng);
          bounds.extend(pos);
          posById.set(place.id, pos);

          const color = MARKER_COLORS[place.type] ?? "#ff6b6b";
          const marker = new kakao.maps.Marker({
            map,
            position: pos,
            title: place.name,
            image: new kakao.maps.MarkerImage(
              markerSvg(color),
              new kakao.maps.Size(26, 34),
              { offset: new kakao.maps.Point(13, 34) },
            ),
          });
          markers.push(marker);

          // 마커 아래에 항상 보이는 이름표 (모바일은 hover 툴팁이 없으므로 필수)
          const labelEl = buildLabel(place, color);
          labelEl.onclick = () => {
            openPopup(place.id);
            onSelect?.(place.id);
          };
          labelEls.set(place.id, labelEl);
          const labelOverlay = new kakao.maps.CustomOverlay({
            position: pos,
            content: labelEl,
            yAnchor: 0,
            zIndex: 5,
            clickable: true,
          });
          labelOverlay.setMap(map);
          labelOverlays.push(labelOverlay);

          kakao.maps.event.addListener(marker, "click", () => {
            openPopup(place.id);
            onSelect?.(place.id);
          });
        }

        // 빈 곳을 누르면 말풍선 닫기
        kakao.maps.event.addListener(map, "click", closePopup);

        if (mappable.length > 1) map.setBounds(bounds, 28, 28, 28, 28);

        // 아코디언이 펼쳐지며 만들어진 지도는 컨테이너 크기 계산이 늦어
        // 타일이 회색으로 남는 경우가 있어, 레이아웃을 다시 잡아줍니다.
        requestAnimationFrame(() => {
          if (cancelled) return;
          map.relayout();
          if (mappable.length > 1) map.setBounds(bounds, 28, 28, 28, 28);
          else
            map.panTo(new kakao.maps.LatLng(mappable[0].lat, mappable[0].lng));
        });

        // 정리용 참조 저장
        cleanupRef.current = () => {
          overlayRef.current?.setMap(null);
          overlayRef.current = null;
          popupIdRef.current = null;
          labelOverlays.forEach((o) => o.setMap(null));
          markers.forEach((m) => m.setMap(null));
          labelEls.clear();
          mapRef.current = null;
        };
      })
      .catch((e: Error) => {
        if (!cancelled) setLoadError(e.message);
      });

    return () => {
      cancelled = true;
      cleanupRef.current?.();
    };
    // placesKey 가 바뀔 때만 (장소 구성이 실제로 달라질 때만) 다시 그림
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesKey, appKey]);

  // 리스트에서 장소를 고르면 해당 마커로 이동 + 이름표 강조
  useEffect(() => {
    // 이름표 강조 갱신
    labelElsRef.current.forEach((el, id) => {
      el.classList.toggle("is-focused", id === focusedId);
    });

    const kakao = window.kakao;
    const map = mapRef.current;
    if (!focusedId || !map || !kakao) return;
    const place = mappable.find((p) => p.id === focusedId);
    if (!place) return;
    // 마커 클릭으로 이미 말풍선이 자리를 잡았으면 그대로 두고, 리스트 탭 등에서만 이동
    if (popupIdRef.current === focusedId) return;
    map.panTo(new kakao.maps.LatLng(place.lat, place.lng));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedId]);

  const message = !appKey
    ? "지도 키가 설정되지 않았어요."
    : mappable.length === 0
      ? "지도에 표시할 장소를 찾지 못했어요."
      : loadError;

  if (message) {
    return (
      <div className="flex h-full items-center justify-center bg-surface px-6 text-center">
        <p className="max-w-sm text-[13px] leading-relaxed text-stone">
          {message}
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {/* 마커 색 범례 */}
      <div className="pointer-events-none absolute left-3 top-3 z-[1] flex flex-wrap gap-x-3 gap-y-1 rounded-md bg-canvas/90 px-2.5 py-1.5 backdrop-blur">
        {PLACE_TYPES.map((t) => (
          <span key={t.key} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: MARKER_COLORS[t.key] }}
            />
            <span className="text-[11px] font-medium text-slate">{t.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
