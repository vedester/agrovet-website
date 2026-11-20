/** Shown wherever a product has no photo yet. Pure CSS and SVG, so it costs no image download. */
export default function PhotoPlaceholder({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex size-full items-center justify-center bg-linear-to-br from-brand-50 to-brand-100 text-brand-300 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14Z" />
        <path d="M5 19c3-5 6-8 10-10" />
      </svg>
    </div>
  );
}
