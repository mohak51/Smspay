import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PaymentStatus = "pending" | "paid" | "unidentified" | "partial" | "expired";

interface StatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

const statusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  pending: {
    label: "PENDING",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  paid: {
    label: "PAID",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  unidentified: {
    label: "UNIDENTIFIED",
    className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  partial: {
    label: "PARTIAL",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  expired: {
    label: "EXPIRED",
    className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium text-xs uppercase tracking-wider border",
        config.className,
        className
      )}
      data-testid={`badge-status-${status}`}
    >
      {config.label}
    </Badge>
  );
}
