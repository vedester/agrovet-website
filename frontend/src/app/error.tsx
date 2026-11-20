"use client";

import Link from "next/link";
import { useEffect } from "react";

// This version of Next.js passes `retry` (older versions called it `reset`).
type ErrorPageProps = {
  error: unknown;
  retry: () => void;
};

export default function ErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
      <p className="text-sm font-bold tracking-[0.18em] text-brand-700 uppercase">
        Something went wrong
      </p>

      <h1 className="mt-3 font-display text-4xl font-semibold text-brand-900">
        We could not load this page.
      </h1>

      <p className="mt-4 max-w-md leading-7 text-ink-soft">
        This is usually temporary. Please try again in a moment. If it keeps happening, message us
        on WhatsApp and we will help you directly.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-pill bg-brand-800 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Try again
        </button>

        <Link href="/" className="font-semibold text-brand-800 hover:text-brand-600">
          Back to the homepage
        </Link>
      </div>
    </div>
  );
}
