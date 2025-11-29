import { cn } from "@/lib/utils";

interface AmountDisplayProps {
  amountCents: number;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showCurrency?: boolean;
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl",
};

export function AmountDisplay({
  amountCents,
  className,
  size = "md",
  showCurrency = true,
}: AmountDisplayProps) {
  const amount = (amountCents / 100).toFixed(2);
  const [whole, decimal] = amount.split(".");

  return (
    <span
      className={cn(
        "font-mono font-semibold tabular-nums",
        sizeClasses[size],
        className
      )}
      data-testid="text-amount"
    >
      {showCurrency && <span className="text-muted-foreground mr-0.5">₹</span>}
      {parseInt(whole).toLocaleString("en-IN")}
      <span className="text-muted-foreground">.{decimal}</span>
    </span>
  );
}

export function formatAmountCents(amountCents: number): string {
  return `₹${(amountCents / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function parseAmountToCents(amount: string): number {
  const cleaned = amount.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}
