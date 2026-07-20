import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  userName?: string;
}

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_PASSWORD ??
    "traveling_dev_only_fallback_session_password_32",
  cookieName: "traveling_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // 자주 쓰는 앱이라 로그인 상태를 오래 유지 (30일)
    maxAge: 60 * 60 * 24 * 30,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/** 로그인 여부만 확인 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId || !session.userName) return null;
  return { id: session.userId, name: session.userName };
}
