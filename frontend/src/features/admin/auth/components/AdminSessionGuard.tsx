
// Directory: frontend/src/features/admin/auth/components/AdminSessionGuard.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type GuardStatus = "checking" | "authenticated" | "unavailable";

type SessionPayload = {
  authenticated?: boolean;
  user?: {
    is_staff?: boolean;
  };
};

export default function AdminSessionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<GuardStatus>("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    async function verifySession() {
      setStatus("checking");

      try {
        const response = await fetch("/api/admin/auth/session", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (response.status === 401 || response.status === 403) {
          router.replace("/admin/login");
          return;
        }

        if (!response.ok) {
          throw new Error("The authentication service is temporarily unavailable.");
        }

        const payload: unknown = await response.json();

        if (
          typeof payload !== "object" ||
          payload === null ||
          !("authenticated" in payload) ||
          !("user" in payload)
        ) {
          throw new Error("The session response was invalid.");
        }

        const session = payload as SessionPayload;

        if (session.authenticated !== true || session.user?.is_staff !== true) {
          router.replace("/admin/login");
          return;
        }

        if (active) {
          setStatus("authenticated");
        }
      } catch {
        if (active) {
          setStatus("unavailable");
        }
      }
    }

    void verifySession();

    return () => {
      active = false;
    };
  }, [attempt, router]);

  if (status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="text-center">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
          <p className="text-sm font-medium text-slate-200">
            Verifying your administrator session
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Securing your access to the dashboard
          </p>
        </div>
      </main>
    );
  }

  if (status === "unavailable") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/10 text-amber-400">
            <span className="text-xl">!</span>
          </div>

          <h1 className="text-lg font-semibold text-white">
            Unable to verify your session
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            The authentication service could not be reached or returned an
            unexpected response. Your session has not been confirmed.
          </p>

          <button
            type="button"
            onClick={() => setAttempt((current) => current + 1)}
            className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Retry verification
          </button>

          <button
            type="button"
            onClick={() => router.replace("/admin/login")}
            className="mt-3 w-full rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
          >
            Return to sign in
          </button>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
