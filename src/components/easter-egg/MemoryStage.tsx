"use client";

import { useMemo, useState } from "react";
import {
  BedIcon,
  CakeIcon,
  CalendarIcon,
  CarIcon,
  ClockIcon,
  CompassIcon,
  ForkKnifeIcon,
  HeartIcon,
  PinIcon,
  RouteIcon,
  SparkIcon,
  StarIcon,
} from "../icons";

const ICON_POOL = [
  CakeIcon,
  ForkKnifeIcon,
  BedIcon,
  CompassIcon,
  CarIcon,
  ClockIcon,
  HeartIcon,
  StarIcon,
  PinIcon,
  CalendarIcon,
  RouteIcon,
  SparkIcon,
];

interface Card {
  id: number;
  iconIndex: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(pairCount: number): Card[] {
  const pairIndexes = Array.from({ length: pairCount }, (_, i) => i);
  const iconIndexes = shuffle([...pairIndexes, ...pairIndexes]);
  return iconIndexes.map((iconIndex, id) => ({ id, iconIndex }));
}

export default function MemoryStage({
  pairCount,
  onClear,
}: {
  pairCount: number;
  onClear: () => void;
}) {
  const deck = useMemo(() => buildDeck(pairCount), [pairCount]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const cols = pairCount <= 8 ? 4 : 6;

  function handleClick(index: number) {
    if (busy || flipped.includes(index) || matched.has(index)) return;

    const next = [...flipped, index];
    setFlipped(next);

    if (next.length === 2) {
      setBusy(true);
      const [a, b] = next;
      if (deck[a].iconIndex === deck[b].iconIndex) {
        const nextMatched = new Set(matched);
        nextMatched.add(a);
        nextMatched.add(b);
        setMatched(nextMatched);
        setFlipped([]);
        setBusy(false);
        if (nextMatched.size === deck.length) setTimeout(onClear, 300);
      } else {
        setTimeout(() => {
          setFlipped([]);
          setBusy(false);
        }, 700);
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-[13px] text-steel">같은 아이콘 카드 두 장을 찾아 짝을 맞추세요</p>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${cols}, 48px)` }}
      >
        {deck.map((card, i) => {
          const isOpen = flipped.includes(i) || matched.has(i);
          const Icon = ICON_POOL[card.iconIndex];
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleClick(i)}
              className={`flex h-12 w-12 items-center justify-center rounded-md border transition-colors ${
                isOpen
                  ? "border-primary bg-primary-soft text-primary-deep"
                  : "border-hairline-strong bg-slate text-transparent"
              }`}
            >
              <Icon width={20} height={20} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
