import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import AppHeader from "@/components/AppHeader";
import TripConditionForm from "@/components/TripConditionForm";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <AppHeader userName={user.name} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <div className="mb-6 px-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">
            이번엔 어디 갈까
          </h1>
          <p className="mt-1.5 text-[14px] text-steel">
            조건만 정해주면 갈 만한 곳을 골라드릴게요.
          </p>
        </div>
        <TripConditionForm />
      </main>
    </>
  );
}
