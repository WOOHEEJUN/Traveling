/**
 * 재귀 백트래킹으로 미로 생성.
 * size = 한 변의 방 개수. 배열은 (size*2+1) 칸이고, 짝수 인덱스는 항상 벽,
 * 홀수 인덱스가 방입니다. 방 사이 벽을 뚫으며 나갑니다.
 */
export function generateMaze(size: number): boolean[][] {
  const dim = size * 2 + 1;
  const walls: boolean[][] = Array.from({ length: dim }, () =>
    Array(dim).fill(true),
  );
  const visited: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false),
  );

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const DIRS = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];

  // 깊은 재귀로 스택이 넘치지 않도록 반복문 + 명시적 스택 사용
  const stack: [number, number][] = [[0, 0]];
  visited[0][0] = true;
  walls[1][1] = false;

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1];
    const neighbors = shuffle(DIRS)
      .map(([dr, dc]) => [r + dr, c + dc] as [number, number])
      .filter(
        ([nr, nc]) =>
          nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc],
      );

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const [nr, nc] = neighbors[0];
    walls[r + nr + 1][c + nc + 1] = false; // 두 방 사이 벽 제거
    walls[nr * 2 + 1][nc * 2 + 1] = false;
    visited[nr][nc] = true;
    stack.push([nr, nc]);
  }

  return walls;
}

/** 방 (r,c) → (r+dr,c+dc) 로 이동 가능한지 (dr,dc는 -1|0|1, 한쪽만 0이 아님) */
export function canMove(
  walls: boolean[][],
  r: number,
  c: number,
  dr: number,
  dc: number,
): boolean {
  return !walls[r * 2 + 1 + dr][c * 2 + 1 + dc];
}
