import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  FileText,
  IndianRupee,
  TrendingUp,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardSkeleton } from "@/components/loading-skeleton";
import { StatusBadge } from "@/components/status-badge";
import { AmountDisplay, formatAmountCents } from "@/components/amount-display";
import type { PaymentRequest } from "@shared/schema";
import { format } from "date-fns";

interface DashboardStats {
  totalRequests: number;
  pendingCount: number;
  paidCount: number;
  unidentifiedCount: number;
  totalAmountCents: number;
  paidAmountCents: number;
  autoMatchRate: number;
  avgTimeToMatch: number;
}

interface RecentPayment extends PaymentRequest {
  branchName?: string;
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard"],
  });

  const { data: recentPayments, isLoading: recentLoading } = useQuery<RecentPayment[]>({
    queryKey: ["/api/payment-requests", { limit: 5 }],
  });

  if (statsLoading || recentLoading) {
    return <DashboardSkeleton />;
  }

  const statCards = [
    {
      title: "Total Requests",
      value: stats?.totalRequests?.toLocaleString() || "0",
      description: "All time payment requests",
      icon: FileText,
      trend: null,
    },
    {
      title: "Pending Payments",
      value: stats?.pendingCount?.toLocaleString() || "0",
      description: `${formatAmountCents(stats?.totalAmountCents || 0)} pending`,
      icon: Clock,
      trend: null,
      highlight: (stats?.pendingCount || 0) > 0,
    },
    {
      title: "Collected Today",
      value: formatAmountCents(stats?.paidAmountCents || 0),
      description: `${stats?.paidCount || 0} payments received`,
      icon: IndianRupee,
      trend: stats?.paidCount ? "+12%" : null,
    },
    {
      title: "Auto-Match Rate",
      value: `${stats?.autoMatchRate?.toFixed(1) || 0}%`,
      description: "Automatically reconciled",
      icon: TrendingUp,
      trend: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your payment activity
          </p>
        </div>
        <Link href="/payments/new">
          <Button data-testid="button-create-payment">
            <Plus className="mr-2 h-4 w-4" />
            New Payment Request
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className={stat.highlight ? "border-amber-500/50" : ""}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                {stat.value}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                {stat.trend && (
                  <Badge variant="secondary" className="text-xs">
                    <ArrowUpRight className="h-3 w-3 mr-0.5" />
                    {stat.trend}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(stats?.unidentifiedCount || 0) > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-base">Action Required</CardTitle>
                <CardDescription>
                  {stats?.unidentifiedCount} unidentified payment{stats?.unidentifiedCount !== 1 ? "s" : ""} need manual review
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Link href="/unidentified">
              <Button variant="outline" size="sm" data-testid="button-view-unidentified">
                Review Now
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Recent Payment Requests</CardTitle>
            <CardDescription>Latest payment activity</CardDescription>
          </div>
          <Link href="/payments">
            <Button variant="outline" size="sm" data-testid="button-view-all-payments">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentPayments && recentPayments.length > 0 ? (
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <Link
                  key={payment.id}
                  href={`/payments/${payment.id}`}
                  className="block"
                >
                  <div
                    className="flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer"
                    data-testid={`payment-row-${payment.id}`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium font-mono text-sm">
                          {payment.invoiceNo}
                        </span>
                        <StatusBadge status={payment.status as any} />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {payment.custName || payment.custMobile || "No customer info"}
                        {payment.branchName && (
                          <span className="ml-2 text-xs">
                            • {payment.branchName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <AmountDisplay
                        amountCents={payment.amountCents}
                        size="md"
                        className="text-foreground"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(payment.createdAt), "dd MMM, h:mm a")}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No payment requests yet
              </p>
              <Link href="/payments/new">
                <Button data-testid="button-create-first-payment">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Request
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
