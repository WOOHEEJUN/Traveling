import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function AppHeader({ userName }: { userName: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight text-ink"
        >
          우리 어디가지
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/history"
            className="rounded-md px-2.5 py-2 text-[13px] font-medium text-steel"
          >
            지난 추천
          </Link>
          <span aria-hidden className="mx-1 h-3.5 w-px bg-hairline" />
          <span className="hidden text-[13px] text-stone sm:inline">
            {userName}
          </span>
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
