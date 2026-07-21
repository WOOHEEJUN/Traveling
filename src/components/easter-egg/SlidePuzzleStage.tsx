"use client";

import { useState } from "react";

const CELL_PX = 64;

/** 뒤섞인 배열이 항상 풀 수 있는 상태가 되도록, 정답에서 유효한 이동만 반복해서 섞습니다 */
function shuffledTiles(n: number): number[] {
  const total = n * n;
  const tiles = Array.from({ length: total }, (_, i) => (i + 1) % total); // 마지막 칸이 0(빈칸)
  let blank = total - 1;
  const shuffleMoves = n === 3 ? 80 : 160;

  for (let i = 0; i < shuffleMoves; i++) {
    const r = Math.floor(blank / n);
    const c = blank % n;
    const candidates: number[] = [];
    if (r > 0) candidates.push(blank - n);
    if (r < n - 1) candidates.push(blank + n);
    if (c > 0) candidates.push(blank - 1);
    if (c < n - 1) candidates.push(blank + 1);

    const target = candidates[Math.floor(Math.random() * candidates.length)];
    [tiles[blank], tiles[target]] = [tiles[target], tiles[blank]];
    blank = target;
  }

  return tiles;
}

function isSolved(tiles: number[]): boolean {
  const total = tiles.length;
  return tiles.every((v, i) => v === (i + 1) % total);
}

export default function SlidePuzzleStage({
  n,
  onClear,
}: {
  n: number;
  onClear: () => void;
}) {
  const [tiles, setTiles] = useState<number[]>(() => shuffledTiles(n));

  function handleTileClick(index: number) {
    const blank = tiles.indexOf(0);
    const r1 = Math.floor(index / n);
    const c1 = index % n;
    const r2 = Math.floor(blank / n);
    const c2 = blank % n;
    const adjacent = Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
    if (!adjacent) return;

    const next = [...tiles];
    [next[index], next[blank]] = [next[blank], next[index]];
    setTiles(next);

    if (isSolved(next)) setTimeout(onClear, 300);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-[13px] text-steel">
        숫자를 순서대로 맞춰보세요 (빈칸 옆 숫자를 눌러 이동)
      </p>
      <div
        className="grid gap-1 rounded-md border border-hairline-strong bg-surface p-1.5"
        style={{ gridTemplateColumns: `repeat(${n}, ${CELL_PX}px)` }}
      >
        {tiles.map((value, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleTileClick(i)}
            disabled={value === 0}
            className={`flex items-center justify-center rounded-md text-[20px] font-semibold transition-colors ${
              value === 0
                ? "bg-transparent"
                : "bg-canvas text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)] active:bg-primary-soft"
            }`}
            style={{ width: CELL_PX, height: CELL_PX }}
          >
            {value !== 0 && value}
          </button>
        ))}
      </div>
    </div>
  );
}
