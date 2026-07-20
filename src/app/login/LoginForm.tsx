"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { APP_USERS } from "@/lib/users";
import { CheckIcon } from "@/components/icons";

export default function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<string>("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "로그인에 실패했어요.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset>
        <legend className="mb-2.5 text-[13px] font-medium text-charcoal">
          누구세요
        </legend>
        <div className="grid grid-cols-2 gap-2.5">
          {APP_USERS.map((u) => {
            const selected = role === u.role;
            return (
              <button
                key={u.role}
                type="button"
                onClick={() => setRole(u.role)}
                aria-pressed={selected}
                className={`relative flex min-h-[56px] items-center justify-center rounded-lg border text-[15px] font-medium transition-all ${
                  selected
                    ? "border-primary bg-canvas text-ink shadow-[0_0_0_1px_var(--color-primary)]"
                    : "border-hairline bg-canvas text-steel"
                }`}
              >
                {u.name}
                {selected && (
                  <CheckIcon
                    width={15}
                    height={15}
                    strokeWidth={2.5}
                    className="absolute right-3 text-primary"
                  />
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="pin"
          className="mb-2.5 block text-[13px] font-medium text-charcoal"
        >
          PIN
        </label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••"
          className="input tracking-[0.3em]"
        />
      </div>

      {error && (
        <p role="alert" className="text-[13px] text-error">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!role || !pin || loading}
        className="btn btn-primary w-full"
      >
        {loading ? "확인 중" : "들어가기"}
      </button>
    </form>
  );
}
