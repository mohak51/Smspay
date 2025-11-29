import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Check,
  QrCode,
  Clock,
  User,
  Building2,
  FileText,
  Send,
  Loader2,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CardSkeleton } from "@/components/loading-skeleton";
import { StatusBadge } from "@/components/status-badge";
import { AmountDisplay } from "@/components/amount-display";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PaymentRequest, Payment, MatchHistory } from "@shared/schema";

interface PaymentDetailData extends PaymentRequest {
  branchName?: string;
  branchCode?: string;
  payments?: Payment[];
  matchHistory?: MatchHistory[];
  shortLink: string;
}

export default function PaymentDetailPage() {
  const [, params] = useRoute("/payments/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [linkCopied, setLinkCopied] = useState(false);
  const [utrDialogOpen, setUtrDialogOpen] = useState(false);
  const [utrInput, setUtrInput] = useState("");
  const [utrNotes, setUtrNotes] = useState("");

  const { data: payment, isLoading } = useQuery<PaymentDetailData>({
    queryKey: ["/api/payment-requests", params?.id],
    enabled: !!params?.id,
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/payments/verify", {
        paymentRequestId: params?.id,
        transactionId: utrInput,
        amountCents: payment?.amountCents,
        notes: utrNotes || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-requests", params?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setUtrDialogOpen(false);
      setUtrInput("");
      setUtrNotes("");
      toast({
        title: "Payment verified!",
        description: "The payment has been marked as paid.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Could not verify payment",
      });
    },
  });

  const copyLink = () => {
    if (payment?.shortLink) {
      navigator.clipboard.writeText(payment.shortLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast({
        title: "Link copied!",
        description: "Payment link copied to clipboard",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/payments")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Payment request not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => setLocation("/payments")}
        >
          Back to Payments
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/payments")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{payment.invoiceNo}</h1>
              <StatusBadge status={payment.status as any} />
            </div>
            <p className="text-muted-foreground">
              Created {format(new Date(payment.createdAt), "dd MMM yyyy, h:mm a")}
            </p>
          </div>
        </div>
        {payment.status === "pending" && (
          <Dialog open={utrDialogOpen} onOpenChange={setUtrDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-verify-payment">
                <Receipt className="mr-2 h-4 w-4" />
                Verify Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Verify Payment</DialogTitle>
                <DialogDescription>
                  Enter the UTR/Transaction ID to mark this payment as received
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="utr">UTR / Transaction ID</Label>
                  <Input
                    id="utr"
                    placeholder="Enter UTR number"
                    className="font-mono"
                    value={utrInput}
                    onChange={(e) => setUtrInput(e.target.value)}
                    data-testid="input-utr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any notes..."
                    value={utrNotes}
                    onChange={(e) => setUtrNotes(e.target.value)}
                    data-testid="input-utr-notes"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setUtrDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => verifyMutation.mutate()}
                  disabled={!utrInput || verifyMutation.isPending}
                  data-testid="button-confirm-verify"
                >
                  {verifyMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Verify Payment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <AmountDisplay
                amountCents={payment.amountCents}
                size="lg"
                className="text-foreground"
              />
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Invoice</p>
                  <p className="font-mono font-medium">{payment.invoiceNo}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Branch</p>
                  <p className="font-medium">
                    {payment.branchName || "—"}
                    {payment.branchCode && (
                      <span className="text-muted-foreground ml-1">
                        ({payment.branchCode})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {(payment.custName || payment.custMobile) && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-medium">
                      {payment.custName || "—"}
                      {payment.custMobile && (
                        <span className="text-muted-foreground ml-2 font-mono text-sm">
                          {payment.custMobile}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expires</p>
                  <p className="font-medium">
                    {format(new Date(payment.shortTokenExpiresAt), "dd MMM yyyy, h:mm a")}
                  </p>
                </div>
              </div>
            </div>
            {payment.description && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{payment.description}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Link & QR</CardTitle>
            <CardDescription>Share with customer to receive payment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {payment.qrDataUri && (
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg border">
                  <img
                    src={payment.qrDataUri}
                    alt="Payment QR Code"
                    className="w-40 h-40"
                    data-testid="img-qr-code"
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
              <QrCode className="h-3 w-3" />
              Scan to pay with any UPI app
            </p>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Payment Link</Label>
              <div className="flex gap-2">
                <Input
                  value={payment.shortLink}
                  readOnly
                  className="font-mono text-xs"
                  data-testid="input-short-link"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyLink}
                  data-testid="button-copy-link"
                >
                  {linkCopied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(payment.shortLink, "_blank")}
                  data-testid="button-open-link"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {payment.sentAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Send className="h-3 w-3" />
                Sent via {payment.sentChannel} on{" "}
                {format(new Date(payment.sentAt), "dd MMM, h:mm a")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {payment.payments && payment.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payment.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                      <Check className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium">
                        {p.transactionId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(p.verifiedAt), "dd MMM yyyy, h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <AmountDisplay amountCents={p.amountCents} size="sm" />
                    <Badge variant="secondary" className="text-xs mt-1">
                      {p.paymentMethod.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {payment.matchHistory && payment.matchHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Match History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payment.matchHistory.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">{match.matchType}</p>
                    {match.note && (
                      <p className="text-xs text-muted-foreground">{match.note}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {match.matchScore && (
                      <Badge variant="outline" className="font-mono">
                        Score: {match.matchScore}
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(match.matchedAt), "dd MMM, h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
