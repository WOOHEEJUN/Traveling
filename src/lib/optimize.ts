import { estimateDriveMinutes, type Coord } from "./distance";

/**
 * 하루 동선 최적화.
 *
 * AI를 부르지 않고 좌표만으로 계산합니다. 하루 방문지가 10곳 이하라
 * 최근접이웃 + 2-opt로 충분히 좋은 순서가 나오고, 즉시 끝나며 비용이 0입니다.
 * 여기에 "숙소는 마지막", "끼니는 식사시간대" 같은 현실 규칙을 얹습니다.
 */

export interface OptimizableItem {
  id: string;
  type: string; // stay | food | dessert | activity
  name: string;
  lat: number | null;
  lng: number | null;
}

export interface OptimizedItem {
  id: string;
  sortOrder: number;
  visitTime: string | null;
}

export interface OptimizeResult {
  items: OptimizedItem[];
  /** 최적화 전후 이동시간(분) — 얼마나 줄었는지 보여주기 위함 */
  beforeMinutes: number;
  afterMinutes: number;
}

/** 하루 일과 기준 시간 */
const DAY_START_MIN = 10 * 60; // 10:00 출발
const LUNCH_MIN = 12 * 60 + 30;
const DINNER_MIN = 18 * 60 + 30;

/** 장소 타입별 기본 체류시간(분) */
const STAY_MINUTES: Record<string, number> = {
  stay: 0, // 체크인은 하루의 끝
  food: 70,
  dessert: 50,
  activity: 90,
};

function hasCoord(i: OptimizableItem): i is OptimizableItem & Coord {
  return typeof i.lat === "number" && typeof i.lng === "number";
}

function legMinutes(a: OptimizableItem, b: OptimizableItem): number {
  if (!hasCoord(a) || !hasCoord(b)) return 0;
  return estimateDriveMinutes(a, b);
}

/** 순서대로 돌 때 걸리는 총 이동시간 */
export function totalTravelMinutes(items: OptimizableItem[]): number {
  let sum = 0;
  for (let i = 0; i < items.length - 1; i++) {
    sum += legMinutes(items[i], items[i + 1]);
  }
  return sum;
}

/** 가까운 곳부터 이어붙이기 */
function nearestNeighbor(items: OptimizableItem[]): OptimizableItem[] {
  if (items.length <= 2) return [...items];

  const remaining = [...items];
  const route = [remaining.shift()!];

  while (remaining.length > 0) {
    const last = route[route.length - 1];
    let bestIndex = 0;
    let bestCost = Infinity;
    remaining.forEach((cand, i) => {
      const cost = legMinutes(last, cand);
      if (cost < bestCost) {
        bestCost = cost;
        bestIndex = i;
      }
    });
    route.push(remaining.splice(bestIndex, 1)[0]);
  }
  return route;
}

/** 경로가 꼬인 부분을 뒤집어가며 개선 */
function twoOpt(route: OptimizableItem[]): OptimizableItem[] {
  if (route.length < 4) return route;

  let best = [...route];
  let bestCost = totalTravelMinutes(best);
  let improved = true;
  let guard = 0;

  while (improved && guard < 40) {
    improved = false;
    guard++;
    for (let i = 1; i < best.length - 2; i++) {
      for (let k = i + 1; k < best.length - 1; k++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, k + 1).reverse(),
          ...best.slice(k + 1),
        ];
        const cost = totalTravelMinutes(candidate);
        if (cost < bestCost - 0.5) {
          best = candidate;
          bestCost = cost;
          improved = true;
        }
      }
    }
  }
  return best;
}

function toClock(totalMin: number): string {
  const h = Math.floor(totalMin / 60) % 24;
  const m = Math.round(totalMin % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 순서대로 돌 때 각 장소의 도착 시각(분) */
function arrivalTimes(route: OptimizableItem[]): number[] {
  const times: number[] = [];
  let clock = DAY_START_MIN;
  route.forEach((item, i) => {
    if (i > 0) clock += legMinutes(route[i - 1], item);
    times.push(clock);
    clock += STAY_MINUTES[item.type] ?? 60;
  });
  return times;
}

/** 끼니가 식사시간에서 얼마나 벗어났는지 (분) */
function mealPenalty(route: OptimizableItem[]): number {
  const times = arrivalTimes(route);
  let penalty = 0;
  let mealIndex = 0;
  route.forEach((item, i) => {
    if (item.type !== "food") return;
    const target = mealIndex === 0 ? LUNCH_MIN : DINNER_MIN;
    mealIndex++;
    penalty += Math.abs(times[i] - target);
  });
  return penalty;
}

/**
 * 끼니를 식사시간대에 맞춥니다.
 *
 * 거리만 보고 짜면 점심을 오후 4시에 먹는 순서가 나올 수 있습니다. 그렇다고
 * 순서를 통째로 다시 짜면 애써 줄인 이동시간이 도로 늘어나서, 자리 교환만
 * 시도하고 이동시간이 크게 늘지 않을 때만 받아들입니다.
 */
const MAX_DETOUR_FOR_MEAL = 15; // 끼니 시간 맞추려고 감수할 추가 이동(분)

function placeMealsAtMealTimes(route: OptimizableItem[]): OptimizableItem[] {
  if (route.filter((i) => i.type === "food").length === 0) return route;

  let best = [...route];
  let bestTravel = totalTravelMinutes(best);
  let bestPenalty = mealPenalty(best);

  let improved = true;
  let guard = 0;

  while (improved && guard < 20) {
    improved = false;
    guard++;
    for (let i = 0; i < best.length; i++) {
      for (let j = 0; j < best.length; j++) {
        if (i === j) continue;
        // 끼니가 걸린 교환만 시도
        if (best[i].type !== "food" && best[j].type !== "food") continue;

        const candidate = [...best];
        [candidate[i], candidate[j]] = [candidate[j], candidate[i]];

        const travel = totalTravelMinutes(candidate);
        const penalty = mealPenalty(candidate);

        // 식사시간은 가까워지고, 이동시간은 허용치 이상 늘지 않을 때만
        if (
          penalty < bestPenalty - 10 &&
          travel <= bestTravel + MAX_DETOUR_FOR_MEAL
        ) {
          best = candidate;
          bestTravel = travel;
          bestPenalty = penalty;
          improved = true;
        }
      }
    }
  }

  return best;
}

/**
 * 하루치 방문 순서를 다시 계산합니다.
 * 좌표가 없는 장소는 순서를 바꾸지 않고 뒤에 그대로 둡니다.
 */
export function optimizeDay(items: OptimizableItem[]): OptimizeResult {
  // 숙소를 뒤로 빼는 규칙은 비교 양쪽에 똑같이 적용해야 공정합니다.
  // 그래야 "몇 분 줄었다"가 순서 재배치의 효과만 나타냅니다.
  const beforeMinutes = totalTravelMinutes([
    ...items.filter((i) => i.type !== "stay"),
    ...items.filter((i) => i.type === "stay"),
  ]);

  const located = items.filter(hasCoord);
  const unlocated = items.filter((i) => !hasCoord(i));

  // 숙소는 체크인이라 하루의 끝으로 뺍니다
  const stays = located.filter((i) => i.type === "stay");
  const movable = located.filter((i) => i.type !== "stay");

  let route = movable.length > 1 ? twoOpt(nearestNeighbor(movable)) : movable;
  route = placeMealsAtMealTimes(route);

  // 재배치가 오히려 손해면 원래 순서를 씁니다.
  // 숙소를 맨 뒤로 빼는 것은 규칙이라 비교 대상에서 동일하게 적용합니다
  // (아침에 체크인하는 일정은 이동시간이 짧아도 현실에서 쓸 수 없으므로).
  // 끼니를 식사시간에 맞추느라 조금 돌아가는 건 의도된 것이므로,
  // 그 허용치를 넘어설 때만 원래 순서로 되돌립니다.
  const originalMovable = located.filter((i) => i.type !== "stay");
  if (
    totalTravelMinutes([...route, ...stays]) >
    totalTravelMinutes([...originalMovable, ...stays]) + MAX_DETOUR_FOR_MEAL
  ) {
    route = originalMovable;
  }

  const ordered = [...route, ...stays, ...unlocated];
  const afterMinutes = totalTravelMinutes(ordered);

  // 예상 방문 시각 계산
  let clock = DAY_START_MIN;
  const withTime: OptimizedItem[] = ordered.map((item, index) => {
    if (index > 0) clock += legMinutes(ordered[index - 1], item);
    const visitTime = hasCoord(item) ? toClock(clock) : null;
    clock += STAY_MINUTES[item.type] ?? 60;
    return { id: item.id, sortOrder: index, visitTime };
  });

  return { items: withTime, beforeMinutes, afterMinutes };
}
