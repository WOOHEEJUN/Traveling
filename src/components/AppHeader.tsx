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
        {/* 메뉴 이동은 하단 탭 바가 담당하고, 여기는 계정만 */}
        <div className="flex items-center gap-1">
          <span className="text-[13px] text-stone">{userName}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
