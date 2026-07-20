"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarIcon,
  HeartIcon,
  ListIcon,
  SparkIcon,
} from "./icons";

const TABS = [
  { href: "/", label: "추천받기", Icon: SparkIcon, exact: true },
  { href: "/calendar", label: "캘린더", Icon: CalendarIcon, exact: false },
  { href: "/plans", label: "저장함", Icon: HeartIcon, exact: false },
  { href: "/history", label: "지난 추천", Icon: ListIcon, exact: false },
] as const;

/**
 * 하단 탭 바.
 * 메뉴가 4개라 상단 헤더에 다 넣으면 폰 화면(375px)에서 넘칩니다.
 */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-canvas/95 backdrop-blur-md">
      <ul
        className="mx-auto flex max-w-3xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {TABS.map(({ href, label, Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-stone"
                }`}
              >
                <Icon width={21} height={21} strokeWidth={active ? 2 : 1.5} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
