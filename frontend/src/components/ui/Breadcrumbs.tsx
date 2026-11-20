import Link from "next/link";

export type Crumb = { label: string; href?: string };

/** "Home / Products / Fertilizers / DAP". The last item is the current page. */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="font-medium text-brand-700 transition-colors hover:text-brand-900"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "max-w-[60vw] truncate font-semibold text-brand-900" : ""}
                >
                  {item.label}
                </span>
              )}
              {!isLast && <span aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
