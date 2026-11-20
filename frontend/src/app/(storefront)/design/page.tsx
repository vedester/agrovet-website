import { notFound } from "next/navigation";

export const metadata = { title: "Design preview", robots: { index: false } };

const brand = [
  ["50", "bg-brand-50"],
  ["100", "bg-brand-100"],
  ["200", "bg-brand-200"],
  ["300", "bg-brand-300"],
  ["400", "bg-brand-400"],
  ["500", "bg-brand-500"],
  ["600", "bg-brand-600"],
  ["700", "bg-brand-700"],
  ["800", "bg-brand-800"],
  ["900", "bg-brand-900"],
  ["950", "bg-brand-950"],
] as const;

const accent = [
  ["50", "bg-accent-50"],
  ["100", "bg-accent-100"],
  ["200", "bg-accent-200"],
  ["300", "bg-accent-300"],
  ["400", "bg-accent-400"],
  ["500", "bg-accent-500"],
  ["600", "bg-accent-600"],
  ["700", "bg-accent-700"],
] as const;

const neutrals = [
  ["cream", "bg-cream"],
  ["sand", "bg-sand"],
  ["line", "bg-line"],
  ["ink-soft", "bg-ink-soft"],
  ["ink", "bg-ink"],
] as const;

function Swatches({
  title,
  items,
}: {
  title: string;
  items: readonly (readonly [string, string])[];
}) {
  return (
    <div>
      <h3 className="mb-3 font-sans text-sm font-semibold tracking-widest text-ink-soft uppercase">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.map(([name, className]) => (
          <div key={name} className="text-center">
            <div className={`${className} size-14 rounded-xl ring-1 ring-line`} />
            <p className="mt-1 text-xs text-ink-soft">{name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DesignPreview() {
  // Development-only page: judge the look here before building on it.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto max-w-5xl space-y-14 px-5 py-12">
      <header>
        <p className="text-sm font-semibold tracking-widest text-brand-600 uppercase">
          Design preview
        </p>
        <h1 className="mt-2 text-5xl font-semibold text-brand-900 sm:text-6xl">
          Fresh inputs, honest advice.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          Everything a farmer needs, from seed to animal health, with prices you can see and an
          order you can send in one tap on WhatsApp.
        </p>
      </header>

      <section className="space-y-6">
        <Swatches title="Forest green (primary)" items={brand} />
        <Swatches title="Sun amber (accent)" items={accent} />
        <Swatches title="Warm neutrals" items={neutrals} />
      </section>

      <section className="space-y-4">
        <h2 className="text-3xl font-semibold text-brand-900">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-pill bg-brand-700 px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-brand-800">
            Add to cart
          </button>
          <button className="rounded-pill bg-accent-400 px-6 py-3 font-semibold text-ink shadow-soft transition hover:bg-accent-300">
            Order on WhatsApp
          </button>
          <button className="rounded-pill border border-line bg-white px-6 py-3 font-semibold text-brand-800 transition hover:bg-sand">
            View all products
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-3xl font-semibold text-brand-900">Product card</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <article className="overflow-hidden rounded-card bg-white shadow-soft ring-1 ring-line transition hover:shadow-lift">
            <div className="aspect-[4/3] bg-brand-100" />
            <div className="space-y-2 p-5">
              <span className="inline-block rounded-pill bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
                In stock
              </span>
              <h3 className="font-sans text-xl font-semibold">DAP Fertilizer</h3>
              <p className="text-sm text-ink-soft">50 kg bag</p>
              <p className="font-display text-2xl font-semibold text-brand-800">KES 4,500</p>
            </div>
          </article>
          <article className="overflow-hidden rounded-card bg-white shadow-soft ring-1 ring-line">
            <div className="aspect-[4/3] bg-accent-100" />
            <div className="space-y-2 p-5">
              <span className="inline-block rounded-pill bg-danger-soft px-3 py-1 text-xs font-semibold text-danger">
                Out of stock
              </span>
              <h3 className="font-sans text-xl font-semibold">Oxytetracycline 20% LA</h3>
              <p className="text-sm text-ink-soft">100 ml</p>
              <p className="rounded-xl bg-accent-50 p-2 text-xs text-accent-700">
                Ask our team for advice before use.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-3xl font-semibold text-brand-900">Admin guide note</h2>
        <div className="max-w-xl rounded-card border border-brand-200 bg-brand-50 p-5">
          <h3 className="font-sans text-base font-semibold text-brand-900">How this page works</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-soft">
            <li>Tap a product to change its price or stock.</li>
            <li>Tap the switch to hide or show it on the website.</li>
            <li>Changes appear on the website within a minute.</li>
          </ol>
        </div>
      </section>
    </main>
  );
}
