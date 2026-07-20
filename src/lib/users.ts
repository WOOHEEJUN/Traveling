/** 앱을 쓰는 두 사람. role은 내부 고정키, name/emoji는 화면 표시용. */
export const APP_USERS = [
  { role: "me", name: "나", emoji: "🧑" },
  { role: "girlfriend", name: "여자친구", emoji: "👩" },
] as const;

export type AppUserRole = (typeof APP_USERS)[number]["role"];

export function findAppUser(role: string) {
  return APP_USERS.find((u) => u.role === role);
}
