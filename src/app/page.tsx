import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import AppHeader from "@/components/AppHeader";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <AppHeader userName={user.name} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <p className="text-sm text-steel">{user.name}님, 안녕하세요.</p>
      </main>
    </>
  );
}
