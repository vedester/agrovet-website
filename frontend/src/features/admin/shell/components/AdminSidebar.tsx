// Directory: frontend/src/features/admin/shell/components/AdminSidebar.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ADMIN_NAVIGATION } from "@/features/admin/shell/navigation";
import type { AdminNavigationIcon } from "@/features/admin/shell/navigation";

type AdminSidebarProps = {
  businessName?: string;
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onCollapsedChange: () => void;
};

function NavigationIcon({ name }: { name: AdminNavigationIcon }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="11" width="7" height="10" rx="1.5" />
          <rect x="3" y="14" width="8" height="7" rx="1.5" />
        </svg>
      );

    case "products":
      return (
        <svg {...common}>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 12 9 5 9-5" />
          <path d="m3 16 9 5 9-5" />
        </svg>
      );

    case "categories":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="8" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" />
        </svg>
      );

    case "enquiries":
      return (
        <svg {...common}>
          <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
          <path d="M8 12h.01M12 12h.01M16 12h.01" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V4a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" />
        </svg>
      );
  }
}

export default function AdminSidebar({
  businessName = "Agrovet",
  mobileOpen,
  onMobileClose,
  collapsed,
  onCollapsedChange,
}: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        aria-label="Admin navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/8 bg-[#101c2b] text-slate-300 shadow-2xl shadow-slate-950/20 transition-all duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-20" : "lg:w-72"}`}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/8 px-5">
          <Link
            href="/admin"
            onClick={onMobileClose}
            className="flex min-w-0 items-center gap-3"
            aria-label={`${businessName} admin dashboard`}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-lg font-bold text-white shadow-lg shadow-emerald-950/30">
              A
            </span>

            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold tracking-wide text-white">
                  {businessName}
                </span>
                <span className="mt-0.5 block text-[10px] font-semibold tracking-[0.18em] text-emerald-400 uppercase">
                  Management
                </span>
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/8 hover:text-white lg:hidden"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="m18 6-12 12M6 6l12 12" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onCollapsedChange}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="hidden rounded-lg p-2 text-slate-400 transition hover:bg-white/8 hover:text-white lg:inline-flex"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M4 5h16M4 12h16M4 19h16" />
            </svg>
          </button>
        </div>

        <div className="border-b border-white/8 px-5 py-5">
          {!collapsed && (
            <>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
                Workspace
              </p>
              <p className="mt-2 text-sm font-medium text-slate-200">Store administration</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-slate-400">Management portal</span>
              </div>
            </>
          )}
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
          {ADMIN_NAVIGATION.map((group) => (
            <section key={group.label}>
              {!collapsed && (
                <h2 className="mb-3 px-3 text-[10px] font-bold tracking-[0.16em] text-slate-500 uppercase">
                  {group.label}
                </h2>
              )}

              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onMobileClose}
                        title={collapsed ? item.label : undefined}
                        aria-current={isActive ? "page" : undefined}
                        className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-emerald-500/12 text-emerald-300"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        } ${collapsed ? "justify-center" : ""}`}
                      >
                        {isActive && (
                          <span className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-emerald-400" />
                        )}

                        <span className="shrink-0">
                          <NavigationIcon name={item.icon} />
                        </span>

                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/8 p-4">
          <Link
            href="/"
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6M9 12h12" />
              <path d="M3 4v16" />
            </svg>
            {!collapsed && <span>View storefront</span>}
          </Link>
        </div>
      </aside>
    </>
  );
}
