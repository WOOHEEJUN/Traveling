"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Calendar from "./Calendar";
import {
  DOMESTIC_DEST_PRESETS,
  OVERSEAS_DEST_PRESETS,
  TRIP_MODES,
  TRIP_STYLES,
  type TripMode,
} from "@/lib/types";
import { ORIGIN_PRESETS, nightsLabel } from "@/lib/distance";
import { CakeIcon, CheckIcon } from "./icons";

function nightsBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function formatRange(start: string, end: string | null): string {
  const s = new Date(start);
  const label = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
  if (!end) return `${label(s)}부터`;
  const e = new Date(end);
  return `${label(s)} – ${label(e)} · ${nightsLabel(nightsBetween(start, end))}`;
}

export default function TripConditionForm() {
  const router = useRouter();
  const [mode, setMode] = useState<TripMode>("recommend");
  const [isOverseas, setIsOverseas] = useState(false);
  const [destination, setDestination] = useState<string>("");
  const [customDestination, setCustomDestination] = useState("");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>(ORIGIN_PRESETS[0].name);
  const [customOrigin, setCustomOrigin] = useState("");
  const [style, setStyle] = useState<string>("");
  const [wantsDessert, setWantsDessert] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const usingCustomOrigin = origin === "__custom";
  const resolvedOrigin = usingCustomOrigin ? customOrigin.trim() : origin;

  const destinationMode = mode === "destination";
  const usingCustomDestination = destination === "__custom";
  const resolvedDestination = usingCustomDestination
    ? customDestination.trim()
    : destination;
  // 해외는 인천공항 출발이 정해져 있어 출발지 선택이 필요 없음
  const needsOrigin = !destinationMode || !isOverseas;

  const ready =
    Boolean(
      startDate &&
        endDate &&
        style &&
        (!needsOrigin || resolvedOrigin) &&
        (!destinationMode || resolvedDestination),
    ) && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          startDate,
          endDate,
          origin: resolvedOrigin,
          style,
          wantsDessert,
          ...(destinationMode && {
            destination: resolvedDestination,
            isOverseas,
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "추천을 만드는 데 실패했어요.");
        return;
      }
      router.push(`/result/${data.tripId}`);
    } catch {
      setError("네트워크 오류가 발생했어요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <PlanningState destinationMode={destinationMode} />;

  const destPresets = isOverseas ? OVERSEAS_DEST_PRESETS : DOMESTIC_DEST_PRESETS;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 모드: 추천받기 vs 직접 정하기 */}
      <div className="grid grid-cols-2 gap-2">
        {TRIP_MODES.map((m) => {
          const selected = mode === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              aria-pressed={selected}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                selected
                  ? "border-primary bg-canvas shadow-[0_0_0_1px_var(--color-primary)]"
                  : "border-hairline bg-canvas"
              }`}
            >
              <span
                className={`block text-[14px] font-medium ${
                  selected ? "text-ink" : "text-charcoal"
                }`}
              >
                {m.label}
              </span>
              <span className="mt-0.5 block text-[12px] text-stone">
                {m.hint}
              </span>
            </button>
          );
        })}
      </div>

      {/* 목적지 선택 (직접 정하기 모드) */}
      {destinationMode && (
        <section className="card">
          <h2 className="mb-1 text-[15px] font-semibold text-ink">
            어디로 갈까
          </h2>
          <p className="mb-3 text-[13px] text-steel">
            가기로 정한 곳의 일정을 짜드려요
          </p>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {(
              [
                [false, "국내"],
                [true, "해외"],
              ] as const
            ).map(([overseas, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setIsOverseas(overseas);
                  setDestination("");
                  setCustomDestination("");
                }}
                aria-pressed={isOverseas === overseas}
                className={`min-h-[44px] rounded-md border text-[14px] font-medium transition-colors ${
                  isOverseas === overseas
                    ? "border-primary bg-canvas text-ink shadow-[0_0_0_1px_var(--color-primary)]"
                    : "border-hairline bg-canvas text-steel"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {destPresets.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setDestination(name)}
                aria-pressed={destination === name}
                className={`min-h-[44px] rounded-md border text-[14px] font-medium transition-colors ${
                  destination === name
                    ? "border-primary bg-canvas text-ink shadow-[0_0_0_1px_var(--color-primary)]"
                    : "border-hairline bg-canvas text-steel"
                }`}
              >
                {name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDestination("__custom")}
              aria-pressed={usingCustomDestination}
              className={`min-h-[44px] rounded-md border text-[14px] font-medium transition-colors ${
                usingCustomDestination
                  ? "border-primary bg-canvas text-ink shadow-[0_0_0_1px_var(--color-primary)]"
                  : "border-hairline bg-canvas text-steel"
              }`}
            >
              직접 입력
            </button>
          </div>
          {usingCustomDestination && (
            <input
              type="text"
              value={customDestination}
              onChange={(e) => setCustomDestination(e.target.value)}
              placeholder={isOverseas ? "예: 삿포로, 나트랑" : "예: 통영, 남해"}
              className="input mt-2"
            />
          )}
        </section>
      )}
      {/* 날짜 */}
      <section className="card">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold text-ink">언제 갈까</h2>
          {startDate && (
            <p className="text-[13px] text-primary-deep">
              {formatRange(startDate, endDate)}
            </p>
          )}
        </div>
        <Calendar
          startDate={startDate}
          endDate={endDate}
          onChange={(s, e) => {
            setStartDate(s);
            setEndDate(e);
          }}
        />
        {startDate && !endDate && (
          <p className="mt-3 text-[13px] text-steel">돌아올 날짜도 골라주세요.</p>
        )}
      </section>

      {/* 출발지 (해외는 인천공항 출발로 고정) */}
      {needsOrigin && (
      <section className="card">
        <h2 className="mb-1 text-[15px] font-semibold text-ink">어디서 출발할까</h2>
        <p className="mb-3 text-[13px] text-steel">
          둘이 만나서 차로 함께 출발하는 곳
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ORIGIN_PRESETS.map((o) => (
            <button
              key={o.name}
              type="button"
              onClick={() => setOrigin(o.name)}
              aria-pressed={origin === o.name}
              className={`min-h-[44px] rounded-md border text-[14px] font-medium transition-colors ${
                origin === o.name
                  ? "border-primary bg-canvas text-ink shadow-[0_0_0_1px_var(--color-primary)]"
                  : "border-hairline bg-canvas text-steel"
              }`}
            >
              {o.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOrigin("__custom")}
            aria-pressed={usingCustomOrigin}
            className={`min-h-[44px] rounded-md border text-[14px] font-medium transition-colors ${
              usingCustomOrigin
                ? "border-primary bg-canvas text-ink shadow-[0_0_0_1px_var(--color-primary)]"
                : "border-hairline bg-canvas text-steel"
            }`}
          >
            직접 입력
          </button>
        </div>
        {usingCustomOrigin && (
          <input
            type="text"
            value={customOrigin}
            onChange={(e) => setCustomOrigin(e.target.value)}
            placeholder="예: 제천역, 여주휴게소"
            className="input mt-2"
          />
        )}
      </section>
      )}

      {/* 여행 스타일 */}
      <section className="card">
        <h2 className="mb-1 text-[15px] font-semibold text-ink">이번엔 어떤 느낌으로</h2>
        <p className="mb-3 text-[13px] text-steel">
          고른 스타일에 따라 코스의 무게중심이 달라집니다
        </p>
        <div className="space-y-2">
          {TRIP_STYLES.map((t) => {
            const selected = style === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setStyle(t.key)}
                aria-pressed={selected}
                className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors ${
                  selected
                    ? "border-primary bg-canvas shadow-[0_0_0_1px_var(--color-primary)]"
                    : "border-hairline bg-canvas"
                }`}
              >
                <span>
                  <span
                    className={`block text-[14px] font-medium ${
                      selected ? "text-ink" : "text-charcoal"
                    }`}
                  >
                    {t.label}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-stone">
                    {t.hint}
                  </span>
                </span>
                {selected && (
                  <CheckIcon
                    width={16}
                    height={16}
                    strokeWidth={2.5}
                    className="shrink-0 text-primary"
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 디저트 */}
      <section className="card">
        <button
          type="button"
          onClick={() => setWantsDessert((v) => !v)}
          aria-pressed={wantsDessert}
          className="flex w-full items-center gap-3 text-left"
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors ${
              wantsDessert
                ? "bg-tint-rose text-cat-dessert"
                : "bg-surface text-stone"
            }`}
          >
            <CakeIcon width={20} height={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium text-ink">
              빵집·디저트 꼭 넣기
            </span>
            <span className="mt-0.5 block text-[12px] text-stone">
              후보마다 빵집이나 디저트 카페를 한 곳씩 포함합니다
            </span>
          </span>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              wantsDessert ? "bg-primary" : "bg-hairline-strong"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-canvas transition-all ${
                wantsDessert ? "left-[22px]" : "left-0.5"
              }`}
            />
          </span>
        </button>
      </section>

      {error && (
        <p role="alert" className="px-1 text-[13px] text-error">
          {error}
        </p>
      )}

      <button type="submit" disabled={!ready} className="btn btn-primary w-full">
        {destinationMode ? "일정 짜기" : "코스 추천받기"}
      </button>
      <p className="pb-2 text-center text-[12px] text-stone">
        {destinationMode
          ? "일정을 만드는 데 1~2분 정도 걸려요"
          : "추천을 만드는 데 1~2분 정도 걸려요"}
      </p>
    </form>
  );
}

function PlanningState({ destinationMode }: { destinationMode: boolean }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-pulse rounded-full bg-primary"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "1.2s" }}
          />
        ))}
      </div>
      <p className="text-[15px] font-medium text-ink">
        {destinationMode ? "일정을 짜고 있어요" : "코스를 짜고 있어요"}
      </p>
      <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-steel">
        {destinationMode
          ? "동선을 따져보고, 관광지와 맛집을 고르고, 여행 정보를 정리하는 중입니다. 1~2분 정도 걸려요."
          : "이동시간을 따져보고, 조건에 맞는 지역을 고르고, 숙소와 맛집을 찾는 중입니다. 1~2분 정도 걸려요."}
      </p>
    </div>
  );
}
