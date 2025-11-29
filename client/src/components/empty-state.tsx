import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileText, Inbox, Search, AlertCircle, type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
      data-testid="empty-state"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} data-testid="button-empty-action">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function NoResultsState({ query }: { query?: string }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={
        query
          ? `No items match "${query}". Try adjusting your search.`
          : "No items match your current filters."
      }
    />
  );
}

export function NoPaymentsState({ onCreateNew }: { onCreateNew?: () => void }) {
  return (
    <EmptyState
      icon={FileText}
      title="No payment requests yet"
      description="Create your first payment request to start accepting UPI payments."
      actionLabel="Create Payment Request"
      onAction={onCreateNew}
    />
  );
}

export function NoUnidentifiedState() {
  return (
    <EmptyState
      icon={AlertCircle}
      title="All caught up!"
      description="There are no unidentified payments requiring your attention."
    />
  );
}
