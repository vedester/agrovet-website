
// Directory: frontend/src/app/admin/(protected)/page.tsx

import Link from "next/link";

// Authentication must complete before protected content is displayed.
// This route therefore opts out of instant-navigation validation.
export const instant = false;

const dashboardModules = [
  {
    number: "01",
    title: "Products",
    description: "Create, edit and organise your agrovet products.",
    href: "/admin/products",
    status: "Catalogue management",
    icon: "products",
  },
  {
    number: "02",
    title: "Categories",
    description: "Manage product categories and catalogue structure.",
    href: "/admin/categories",
    status: "Catalogue organisation",
    icon: "categories",
  },
  {
    number: "03",
    title: "Customer enquiries",
    description: "Manage customer communication and enquiries.",
    href: "/admin/enquiries",
    status: "Customer management",
    icon: "enquiries",
  },
  {
    number: "04",
    title: "Website settings",
    description: "Manage business information and storefront content.",
    href: "/admin/settings",
    status: "Website configuration",
    icon: "settings",
  },
];

function ModuleIcon({ name }: { name: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "products":
      return (
        <svg {...common}>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
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
          <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z" />
          <path d="M8 12h.01M12 12h.01M16 12h.01" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.4 2.4-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.4-2.4.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4v-3.4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.4-2.4.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V4h3.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.4 2.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v3.4h-.2a1.7 1.7 0 0 0-1.2.9Z" />
        </svg>
      );
  }
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase">
            Management workspace
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Dashboard
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
            Manage your products, catalogue, customer enquiries and online
            storefront from one central workspace.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700"
        >
          View storefront
          <span aria-hidden="true">↗</span>
        </Link>
      </section>

      <section>
        <div className="mb-5">
          <h3 className="text-lg font-bold text-slate-900">Your workspace</h3>
          <p className="mt-1 text-sm text-slate-500">
            Select an area to manage your business.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {dashboardModules.map((module) => (
            <Link
              key={module.number}
              href={module.href}
              className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg hover:shadow-slate-200/60"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white">
                  <ModuleIcon name={module.icon} />
                </span>

                <span className="text-xs font-semibold tracking-wider text-slate-300">
                  {module.number}
                </span>
              </div>

              <h4 className="mt-6 text-base font-bold text-slate-900">
                {module.title}
              </h4>

              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                {module.description}
              </p>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-xs font-medium text-slate-400">
                  {module.status}
                </span>

                <span className="text-lg text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-600">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase">
              Getting started
            </p>

            <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
              Your business, managed in one place.
            </h3>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              Your administration workspace brings together catalogue
              management, website configuration and customer communication.
              Each module will connect to your Django backend so that the
              information you manage stays synchronised with your storefront.
            </p>
          </div>

          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
              <path d="M9 9v.01M9 13v.01M9 17v.01M16 13v.01M16 17v.01" />
            </svg>
          </div>
        </div>
      </section>
    </div>
  );
}
