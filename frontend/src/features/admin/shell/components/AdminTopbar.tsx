// Directory: frontend/src/features/admin/shell/components/AdminTopbar.tsx

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type AdminTopbarProps = {
  onMenuClick: () => void;
};

const PAGE_TITLES: Record<string, { title: string; description: string }> = {
  "/admin": {
    title: "Dashboard",
    description: "Your store at a glance.",
  },
  "/admin/products": {
    title: "Products",
    description: "Manage your product catalogue.",
  },
  "/admin/categories": {
    title: "Categories",
    description: "Organise your store catalogue.",
  },
  "/admin/enquiries": {
    title: "Customer enquiries",
    description: "Manage customer conversations.",
  },
  "/admin/settings": {
    title: "Website settings",
    description: "Manage your storefront information.",
  },
};

export default function AdminTopbar({ onMenuClick }: AdminTopbarProps) {
  const pathname = usePathname();

  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutError(null);

    try {
      const response = await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to log out. Please try again.");
      }

      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "Unable to log out. Please try again.",
      );
      setIsLoggingOut(false);
    }
  }

  const page = PAGE_TITLES[pathname] ??
    Object.entries(PAGE_TITLES)
      .filter(([path]) => path !== "/admin" && pathname.startsWith(`${path}/`))
      .sort(([a], [b]) => b.length - a.length)
      .map(([, value]) => value)[0] ?? {
      title: "Administration",
      description: "Manage your store.",
    };

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur-xl sm:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 lg:hidden"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span>Workspace</span>
            <span>/</span>
            <span className="truncate text-slate-600">{page.title}</span>
          </div>

          <h1 className="mt-1 truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            {page.title}
          </h1>
        </div>
      </div>

      <div className="ml-4 flex shrink-0 items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-xs font-semibold text-slate-800">Admin workspace</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Store management</p>
        </div>

        <div
          aria-label="Administrator account"
          className="flex size-10 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-sm font-bold text-emerald-700"
        >
          A
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>

        {logoutError && (
          <p role="alert" className="sr-only">
            {logoutError}
          </p>
        )}
      </div>
    </header>
  );
}
