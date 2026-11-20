

 // Directory: frontend/src/features/admin/auth/components/LoginForm.tsx

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { adminLoginSchema } from "@/features/admin/auth/schemas";

type FieldErrors = {
  email?: string;
  password?: string;
};

function getResponseError(payload: unknown): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return "Unable to sign in. Please check your details and try again.";
}

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setFieldErrors({});

    const validation = adminLoginSchema.safeParse({
      email,
      password,
    });

    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;

      setFieldErrors({
        email: errors.email?.[0],
        password: errors.password?.[0],
      });

      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validation.data),
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setError(getResponseError(payload));
        return;
      }

      if (
        typeof payload !== "object" ||
        payload === null ||
        !("user" in payload) ||
        typeof payload.user !== "object" ||
        payload.user === null ||
        !("is_staff" in payload.user) ||
        payload.user.is_staff !== true
      ) {
        setError("The server returned an invalid authentication response.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Unable to connect. Check your internet connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-950/30">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="size-7"
            aria-hidden="true"
          >
            <path
              d="M12 21V11m0 5c-5 0-8-3-8-8 5 0 8 3 8 8Zm0-3c0-5 3-8 8-8 0 5-3 8-8 8Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <p className="text-sm font-semibold tracking-[0.2em] text-emerald-400">
          AGROVET MANAGEMENT
        </p>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Welcome back
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Sign in to access your business dashboard.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-7 shadow-2xl shadow-black/20 sm:p-8">
        <div className="mb-7">
          <h2 className="text-lg font-semibold text-white">
            Administrator sign in
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Enter your registered staff credentials.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label
              htmlFor="admin-email"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Email address
            </label>

            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setFieldErrors((current) => ({ ...current, email: undefined }));
                setError("");
              }}
              placeholder="name@yourbusiness.com"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
            />

            {fieldErrors.email && (
              <p id="email-error" className="mt-2 text-xs text-red-400">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFieldErrors((current) => ({
                    ...current,
                    password: undefined,
                  }));
                  setError("");
                }}
                placeholder="Enter your password"
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password ? "password-error" : undefined
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 pr-16 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-3 text-xs font-medium text-slate-400 transition hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {fieldErrors.password && (
              <p id="password-error" className="mt-2 text-xs text-red-400">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-300"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Signing in...
              </>
            ) : (
              <>
                Sign in securely
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-7 border-t border-white/10 pt-5">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-4"
              aria-hidden="true"
            >
              <rect
                x="5"
                y="10"
                width="14"
                height="11"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M8 10V7a4 4 0 1 1 8 0v3"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            Protected administrator access
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        Authorized personnel only.
      </p>
    </div>
  );
}
