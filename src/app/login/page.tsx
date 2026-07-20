import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="relative flex flex-1 flex-col justify-center px-6 py-12">
      {/* 배경: 은은한 그라디언트 한 겹 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, #fff2f0 0%, #fafaf9 55%, #fafaf9 100%)",
        }}
      />

      <div className="mx-auto w-full max-w-sm">
        <div className="mb-10">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone">
            Travel Planner
          </p>
          <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-ink">
            우리 어디가지
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-steel">
            원주에서 출발하는
            <br />
            우리 둘만의 여행 코스를 짜드려요.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
