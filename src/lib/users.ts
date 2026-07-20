/** 앱을 쓰는 두 사람. role은 내부 고정키(ASCII), name은 화면 표시용. */
export const APP_USERS = [
  { role: "me", name: "우희주니" },
  { role: "girlfriend", name: "유지마니" },
] as const;

export type AppUserRole = (typeof APP_USERS)[number]["role"];

export function findAppUser(role: string) {
  return APP_USERS.find((u) => u.role === role);
}

/**
 * 사람마다 PIN이 다릅니다. 값은 환경변수에만 두고 코드에는 남기지 않습니다.
 * (서버에서만 호출되어야 합니다)
 */
export function expectedPin(role: string): string | null {
  switch (role) {
    case "me":
      return process.env.PIN_ME ?? null;
    case "girlfriend":
      return process.env.PIN_GIRLFRIEND ?? null;
    default:
      return null;
  }
}
