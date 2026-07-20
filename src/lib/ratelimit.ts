/**
 * 로그인 시도 제한.
 *
 * PIN이 4자리(1만 가지)라 서버 앞단 인증을 없애면 자동 대입이 가능해집니다.
 * 두 명만 쓰는 앱이라 외부 저장소 없이 메모리에만 기록합니다.
 * (서버를 재시작하면 초기화되지만, 재시작을 유발하려면 이미 서버에 접근할 수
 *  있어야 하므로 이 용도에는 충분합니다)
 */

const MAX_FAILURES = 5;
const WINDOW_MS = 10 * 60 * 1000; // 이 시간 안에 5회 실패하면
const BLOCK_MS = 15 * 60 * 1000; // 15분 차단

interface Attempt {
  failures: number;
  firstFailureAt: number;
  blockedUntil: number;
}

const attempts = new Map<string, Attempt>();

/** 오래된 기록 정리 (메모리가 계속 쌓이지 않도록) */
function sweep(now: number) {
  for (const [key, a] of attempts) {
    const expired =
      now > a.blockedUntil && now - a.firstFailureAt > WINDOW_MS;
    if (expired) attempts.delete(key);
  }
}

export interface RateLimitState {
  blocked: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

export function checkLoginAttempt(key: string): RateLimitState {
  const now = Date.now();
  sweep(now);

  const a = attempts.get(key);
  if (!a) return { blocked: false, retryAfterSeconds: 0, remaining: MAX_FAILURES };

  if (now < a.blockedUntil) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((a.blockedUntil - now) / 1000),
      remaining: 0,
    };
  }

  // 시간이 지났으면 카운터 초기화
  if (now - a.firstFailureAt > WINDOW_MS) {
    attempts.delete(key);
    return { blocked: false, retryAfterSeconds: 0, remaining: MAX_FAILURES };
  }

  return {
    blocked: false,
    retryAfterSeconds: 0,
    remaining: Math.max(0, MAX_FAILURES - a.failures),
  };
}

export function recordLoginFailure(key: string): RateLimitState {
  const now = Date.now();
  const a = attempts.get(key);

  if (!a || now - a.firstFailureAt > WINDOW_MS) {
    attempts.set(key, {
      failures: 1,
      firstFailureAt: now,
      blockedUntil: 0,
    });
    return {
      blocked: false,
      retryAfterSeconds: 0,
      remaining: MAX_FAILURES - 1,
    };
  }

  a.failures += 1;
  if (a.failures >= MAX_FAILURES) {
    a.blockedUntil = now + BLOCK_MS;
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil(BLOCK_MS / 1000),
      remaining: 0,
    };
  }

  return {
    blocked: false,
    retryAfterSeconds: 0,
    remaining: MAX_FAILURES - a.failures,
  };
}

export function clearLoginAttempts(key: string) {
  attempts.delete(key);
}

/** 리버스 프록시 뒤에 있으므로 X-Forwarded-For에서 실제 IP를 꺼냅니다 */
export function clientKey(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
