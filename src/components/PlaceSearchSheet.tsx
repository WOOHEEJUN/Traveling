"use client";

import { useEffect, useRef, useState } from "react";
import { PLACE_TYPES } from "@/lib/types";
import { photoSrc } from "@/lib/photo";
import { BedIcon, CakeIcon, CompassIcon, ForkKnifeIcon } from "./icons";

export interface SearchedPlace {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  placeUrl: string | null;
  category: string | null;
  photoUrl: string | null;
}

const TYPE_ICON: Record<string, typeof BedIcon> = {
  stay: BedIcon,
  food: ForkKnifeIcon,
  dessert: CakeIcon,
  activity: CompassIcon,
};

/** 카카오 카테고리로 분류를 미리 찍어줍니다 (사용자가 바꿀 수 있음) */
function guessType(category: string | null): string {
  if (!category) return "activity";
  if (category.includes("숙박")) return "stay";
  if (category.includes("카페")) return "dessert";
  if (category.includes("음식")) return "food";
  return "activity";
}

interface Props {
  onClose: () => void;
  onAdd: (place: SearchedPlace, type: string) => Promise<void>;
}

export default function PlaceSearchSheet({ onClose, onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchedPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [picked, setPicked] = useState<SearchedPlace | null>(null);
  const [type, setType] = useState("activity");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(res.ok ? (data.results ?? []) : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!picked) return;
    setAdding(true);
    try {
      await onAdd(picked, type);
      onClose();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />

      <div className="relative flex max-h-[85vh] flex-col rounded-t-2xl bg-canvas">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-ink">장소 추가</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-[13px] font-medium text-steel"
          >
            닫기
          </button>
        </div>

        {picked ? (
          /* 2단계: 분류 고르고 추가 */
          <div className="flex-1 overflow-y-auto p-5">
            <div className="mb-4 flex items-start gap-3 rounded-md border border-hairline bg-surface-soft p-3">
              {picked.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoSrc(picked.photoUrl)!}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-md bg-surface object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-ink">{picked.name}</p>
                {picked.address && (
                  <p className="mt-0.5 text-[12px] text-stone">
                    {picked.address}
                  </p>
                )}
              </div>
            </div>

            <p className="mb-2 text-[13px] font-medium text-charcoal">분류</p>
            <div className="mb-5 grid grid-cols-4 gap-2">
              {PLACE_TYPES.map((t) => {
                const Icon = TYPE_ICON[t.key];
                const on = type === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setType(t.key)}
                    aria-pressed={on}
                    className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-md border text-[12px] font-medium transition-colors ${
                      on
                        ? "border-primary bg-canvas text-ink shadow-[0_0_0_1px_var(--color-primary)]"
                        : "border-hairline bg-canvas text-steel"
                    }`}
                  >
                    <Icon width={18} height={18} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPicked(null)}
                className="btn btn-secondary flex-1"
              >
                다시 고르기
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={adding}
                className="btn btn-primary flex-1"
              >
                {adding ? "추가 중" : "일정에 추가"}
              </button>
            </div>
          </div>
        ) : (
          /* 1단계: 검색 */
          <>
            <form onSubmit={handleSearch} className="border-b border-hairline p-4">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="예: 성심당, 안목해변"
                  className="input flex-1"
                />
                <button
                  type="submit"
                  disabled={!query.trim() || loading}
                  className="btn btn-primary px-5"
                >
                  검색
                </button>
              </div>
              <p className="mt-2 text-[12px] text-stone">
                실제 있는 장소만 추가할 수 있어요.
              </p>
            </form>

            <div className="flex-1 overflow-y-auto p-4">
              {loading && (
                <p className="py-8 text-center text-[13px] text-stone">
                  찾는 중...
                </p>
              )}
              {!loading && searched && results.length === 0 && (
                <p className="py-8 text-center text-[13px] text-stone">
                  검색 결과가 없어요. 다른 이름으로 찾아보세요.
                </p>
              )}
              <ul className="space-y-2">
                {results.map((r, i) => (
                  <li key={`${r.name}-${i}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicked(r);
                        setType(guessType(r.category));
                      }}
                      className="flex w-full items-start gap-3 rounded-md border border-hairline bg-canvas p-3 text-left"
                    >
                      {r.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photoSrc(r.photoUrl)!}
                          alt=""
                          loading="lazy"
                          className="h-12 w-12 shrink-0 rounded-md bg-surface object-cover"
                        />
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-surface text-stone">
                          <CompassIcon width={18} height={18} />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium text-ink">
                          {r.name}
                        </span>
                        {r.address && (
                          <span className="mt-0.5 block text-[12px] text-stone">
                            {r.address}
                          </span>
                        )}
                        {r.category && (
                          <span className="mt-1 inline-block text-[11px] text-stone">
                            {r.category}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
