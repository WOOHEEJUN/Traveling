"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { budgetThemeLabel } from "@/lib/types";
import { formatDriveTime, nightsLabel } from "@/lib/distance";
import { CarIcon, ChevronRightIcon } from "./icons";

export interface HistoryTrip {
  id: string;
  startDate: string;
  endDate: string;
  nights: number;
  origin: string;
  budgetTheme: string;
  status: string;
  createdByName: string;
  options: {
    id: string;
    regionName: string;
    summary: string;
    estDriveMinutes: number;
    isChosen: boolean;
  }[];
}

type Tab = "date" | "region";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function HistoryView({ trips }: { trips: HistoryTrip[] }) {
  const [tab, setTab] = useState<Tab>("date");

  /** 지역별 탭: 지역 → 그 지역이 등장한 여행들 */
  const byRegion = useMemo(() => {
    const map = new Map<
      string,
      { trip: HistoryTrip; chosen: boolean; driveMinutes: number }[]
    >();
    for (const trip of trips) {
      for (const option of trip.options) {
        const list = map.get(option.regionName) ?? [];
        list.push({
          trip,
          chosen: option.isChosen,
          driveMinutes: option.estDriveMinutes,
        });
        map.set(option.regionName, list);
      }
    }
    // 확정된 적 있는 지역 우선, 그다음 등장 횟수 순
    return [...map.entries()].sort((a, b) => {
      const aChosen = a[1].some((x) => x.chosen) ? 1 : 0;
      const bChosen = b[1].some((x) => x.chosen) ? 1 : 0;
      if (aChosen !== bChosen) return bChosen - aChosen;
      return b[1].length - a[1].length;
    });
  }, [trips]);

  if (trips.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-[14px] text-steel">아직 받은 추천이 없어요.</p>
        <Link href="/" className="btn btn-primary mt-4 inline-flex">
          첫 코스 추천받기
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* 탭 */}
      <div className="mb-4 flex gap-1 border-b border-hairline">
        {(
          [
            ["date", "날짜별"],
            ["region", "지역별"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`-mb-px border-b-2 px-3 py-2.5 text-[14px] font-medium transition-colors ${
              tab === key
                ? "border-ink text-ink"
                : "border-transparent text-steel"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "date" ? (
        <ul className="space-y-2.5">
          {trips.map((trip) => {
            const chosen = trip.options.find((o) => o.isChosen);
            return (
              <li key={trip.id}>
                <Link
                  href={`/result/${trip.id}`}
                  className="flex items-center gap-3 rounded-lg border border-hairline bg-canvas p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[15px] font-semibold text-ink">
                        {chosen
                          ? chosen.regionName
                          : trip.options.map((o) => o.regionName).join(" · ")}
                      </span>
                      {chosen && (
                        <span className="badge bg-primary text-on-primary">
                          확정
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12px] text-stone">
                      {formatDate(trip.startDate)} – {shortDate(trip.endDate)} ·{" "}
                      {nightsLabel(trip.nights)} · {trip.origin} 출발
                    </p>
                    <p className="mt-0.5 text-[12px] text-stone">
                      {budgetThemeLabel(trip.budgetTheme)} · 만든 사람:{" "}
                      {trip.createdByName}
                    </p>
                  </div>
                  <ChevronRightIcon
                    width={16}
                    height={16}
                    className="shrink-0 text-hairline-strong"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="space-y-2.5">
          {byRegion.map(([region, entries]) => {
            const everChosen = entries.some((e) => e.chosen);
            return (
              <li
                key={region}
                className="rounded-lg border border-hairline bg-canvas p-4"
              >
                <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[15px] font-semibold text-ink">
                    {region}
                  </span>
                  {everChosen && (
                    <span className="badge bg-primary text-on-primary">
                      다녀옴
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[12px] text-stone">
                    <CarIcon width={13} height={13} />
                    편도 약 {formatDriveTime(entries[0].driveMinutes)}
                  </span>
                </div>
                <ul className="space-y-1">
                  {entries.map(({ trip, chosen }) => (
                    <li key={`${region}-${trip.id}`}>
                      <Link
                        href={`/result/${trip.id}`}
                        className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-[13px] text-slate"
                      >
                        <span>
                          {formatDate(trip.startDate)} ·{" "}
                          {nightsLabel(trip.nights)}
                          {chosen && (
                            <span className="ml-1.5 text-primary-deep">
                              (이걸로 감)
                            </span>
                          )}
                        </span>
                        <ChevronRightIcon
                          width={14}
                          height={14}
                          className="shrink-0 text-hairline-strong"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
