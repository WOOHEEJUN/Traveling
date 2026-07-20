"use client";

import { useEffect, useRef, useState } from "react";
import { PLACE_TYPES } from "@/lib/types";

export interface MapPlace {
  id: string;
  type: string;
  name: string;
  lat: number | null;
  lng: number | null;
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
interface KakaoMarker {
  setMap(map: KakaoMapInstance | null): void;
}
interface KakaoMapInstance {
  setBounds(
    bounds: KakaoBounds,
    ...padding: number[]
  ): void;
  panTo(latlng: KakaoLatLng): void;
}
interface KakaoBounds {
  extend(latlng: KakaoLatLng): void;
}
interface KakaoNamespace {
  maps: {
    load(cb: () => void): void;
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    LatLngBounds: new () => KakaoBounds;
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
    Size: new (w: number, h: number) => object;
    Point: new (x: number, y: number) => object;
    event: {
      addListener(target: KakaoMarker, type: string, cb: () => void): void;
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

interface Props {
  places: MapPlace[];
  /** 선택된 장소 id — 지정되면 해당 마커로 이동 */
  focusedId?: string | null;
  onSelect?: (id: string) => void;
}

export default function KakaoMap({ places, focusedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const markersRef = useRef<Map<string, KakaoMarker>>(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);

  const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  const mappable = places.filter(isMappable);

  useEffect(() => {
    if (!appKey || mappable.length === 0) return;

    let cancelled = false;
    const markers = markersRef.current;

    loadKakaoSdk(appKey)
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;

        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(mappable[0].lat, mappable[0].lng),
          level: 7,
        });
        mapRef.current = map;

        const bounds = new kakao.maps.LatLngBounds();

        for (const place of mappable) {
          const pos = new kakao.maps.LatLng(place.lat, place.lng);
          bounds.extend(pos);

          const marker = new kakao.maps.Marker({
            map,
            position: pos,
            title: place.name,
            image: new kakao.maps.MarkerImage(
              markerSvg(MARKER_COLORS[place.type] ?? "#ff6b6b"),
              new kakao.maps.Size(26, 34),
              { offset: new kakao.maps.Point(13, 34) },
            ),
          });

          if (onSelect) {
            kakao.maps.event.addListener(marker, "click", () =>
              onSelect(place.id),
            );
          }
          markers.set(place.id, marker);
        }

        if (mappable.length > 1) map.setBounds(bounds, 24, 24, 24, 24);
      })
      .catch((e: Error) => {
        if (!cancelled) setLoadError(e.message);
      });

    return () => {
      cancelled = true;
      markers.forEach((m) => m.setMap(null));
      markers.clear();
    };
    // 장소 목록이 바뀔 때만 지도를 다시 그림
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, appKey]);

  // 리스트에서 장소를 고르면 해당 마커로 이동
  useEffect(() => {
    const kakao = window.kakao;
    if (!focusedId || !mapRef.current || !kakao) return;
    const place = mappable.find((p) => p.id === focusedId);
    if (!place) return;
    mapRef.current.panTo(new kakao.maps.LatLng(place.lat, place.lng));
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
      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-x-3 gap-y-1 rounded-md bg-canvas/90 px-2.5 py-1.5 backdrop-blur">
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
