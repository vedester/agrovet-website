// Directory: frontend/src/components/catalog/StockBadge.tsx

type StockBadgeProps = {
  inStock: boolean;
  className?: string;
};

export default function StockBadge({ inStock, className = "" }: StockBadgeProps) {
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-xs font-bold ${
        inStock ? "bg-brand-50 text-brand-800" : "bg-accent-50 text-accent-700"
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${inStock ? "bg-brand-600" : "bg-accent-500"}`}
      />
      {inStock ? "In stock" : "Check availability"}
    </span>
  );
}
