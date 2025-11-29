import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  IndianRupee,
  QrCode,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AmountDisplay } from "@/components/amount-display";
import { ThemeToggle } from "@/components/theme-toggle";
import type { PaymentRequest } from "@shared/schema";

interface PaymentLandingData extends PaymentRequest {
  branchName?: string;
  shopName?: string;
}

export default function PaymentLandingPage() {
  const [, params] = useRoute("/s/:token");

  const { data: payment, isLoading, error } = useQuery<PaymentLandingData>({
    queryKey: ["/api/pay", params?.token],
    enabled: !!params?.token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse space-y-4 text-center">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-xl bg-primary/10">
            <IndianRupee className="h-8 w-8 text-primary" />
          </div>
          <p className="text-muted-foreground">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="text-center space-y-4 max-w-md">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold">Payment Link Invalid</h1>
          <p className="text-muted-foreground">
            This payment link may have expired or is no longer valid. Please contact the merchant for a new payment link.
          </p>
        </div>
      </div>
    );
  }

  const isExpired = new Date(payment.shortTokenExpiresAt) < new Date();
  const isPaid = payment.status === "paid";

  if (isExpired && !isPaid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="text-center space-y-4 max-w-md">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-amber-500/10">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-xl font-semibold">Payment Link Expired</h1>
          <p className="text-muted-foreground">
            This payment link has expired. Please contact the merchant for a new payment link.
          </p>
        </div>
      </div>
    );
  }

  if (isPaid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="text-center space-y-4 max-w-md">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-xl font-semibold">Payment Complete</h1>
          <p className="text-muted-foreground">
            Thank you! This payment has already been received.
          </p>
          <Card className="text-left">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount Paid</span>
                <AmountDisplay amountCents={payment.amountCents} size="lg" />
              </div>
              <Separator className="my-4" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Invoice</span>
                <span className="font-mono font-medium">{payment.invoiceNo}</span>
              </div>
              {payment.paidAt && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Paid On</span>
                  <span>{format(new Date(payment.paidAt), "dd MMM yyyy, h:mm a")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handlePayNow = () => {
    if (payment.upiUri) {
      window.location.href = payment.upiUri;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-md mx-auto p-4 pt-8 pb-16 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <IndianRupee className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-semibold">{payment.shopName || "Payment Request"}</h1>
          {payment.branchName && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Building2 className="h-3 w-3" />
              {payment.branchName}
            </p>
          )}
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Amount Due</p>
              <AmountDisplay
                amountCents={payment.amountCents}
                size="xl"
                className="text-3xl text-foreground"
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Invoice Number</p>
                  <p className="font-mono font-medium">{payment.invoiceNo}</p>
                </div>
              </div>
              {payment.description && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-sm">{payment.description}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Valid Until</p>
                  <p className="text-sm">
                    {format(new Date(payment.shortTokenExpiresAt), "dd MMM yyyy, h:mm a")}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {payment.qrDataUri && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-white rounded-xl border shadow-sm">
                  <img
                    src={payment.qrDataUri}
                    alt="Payment QR Code"
                    className="w-56 h-56"
                    data-testid="img-qr-code"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <QrCode className="h-4 w-4" />
                  <span>Scan with any UPI app to pay</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full text-base h-12"
            onClick={handlePayNow}
            data-testid="button-pay-now"
          >
            <IndianRupee className="mr-2 h-5 w-5" />
            Pay Now
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Opens your UPI app for instant payment
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4">
          <Shield className="h-3 w-3" />
          <span>Secure payment powered by PayFlow</span>
        </div>
      </div>
    </div>
  );
}
