// Directory: frontend/src/app/admin/login/page.tsx

import type { Metadata } from "next";
import LoginForm from "@/features/admin/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Admin Sign In | Mwangaza Agrovet",
  description: "Secure administration access for Mwangaza Agrovet.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -bottom-48 -right-32 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />

        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <LoginForm />

        <p className="mt-8 text-center text-xs leading-6 text-slate-500">
          Protected administration portal.
          <br />
          {/* © {new Date().getFullYear()} Mwangaza Agrovet. All rights reserved. */}
          © 2026 Mwangaza Agrovet. All rights reserved.
        </p>
      </div>
    </main>
  );
}