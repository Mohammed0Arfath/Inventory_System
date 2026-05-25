import { cn } from "@/lib/utils";

interface StockBadgeProps {
  available: number;
  className?: string;
  showLabel?: boolean;
}

export function StockBadge({ available, className, showLabel = true }: StockBadgeProps) {
  const isOutOfStock = available === 0;
  const isLow = available > 0 && available <= 5;
  const isOk = available > 5;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        isOutOfStock && "bg-red-500/10 text-red-400 border border-red-500/20",
        isLow && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
        isOk && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isOutOfStock && "bg-red-500",
          isLow && "bg-amber-500 animate-pulse",
          isOk && "bg-emerald-500"
        )}
      />
      {isOutOfStock ? (
        "Out of stock"
      ) : (
        <>
          {available}{showLabel && ` unit${available === 1 ? "" : "s"} available`}
        </>
      )}
    </span>
  );
}
