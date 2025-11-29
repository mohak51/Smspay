import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  ArrowLeft,
  Loader2,
  IndianRupee,
  Copy,
  ExternalLink,
  Check,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AmountDisplay } from "@/components/amount-display";
import type { Branch, PaymentRequest } from "@shared/schema";

const createPaymentSchema = z.object({
  branchId: z.string().min(1, "Please select a branch"),
  invoiceNo: z.string().min(1, "Invoice number is required").max(50),
  amount: z.string().min(1, "Amount is required"),
  custMobile: z
    .string()
    .regex(/^(\+91)?[0-9]{10}$/, "Enter a valid 10-digit mobile number")
    .optional()
    .or(z.literal("")),
  custName: z.string().optional(),
  description: z.string().optional(),
});

type CreatePaymentForm = z.infer<typeof createPaymentSchema>;

interface CreatedPayment extends PaymentRequest {
  shortLink: string;
}

export default function CreatePaymentPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [createdPayment, setCreatedPayment] = useState<CreatedPayment | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const { data: branches, isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const form = useForm<CreatePaymentForm>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      branchId: "",
      invoiceNo: "",
      amount: "",
      custMobile: "",
      custName: "",
      description: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreatePaymentForm) => {
      const amountCents = Math.round(parseFloat(data.amount) * 100);
      const response = await apiRequest("POST", "/api/payment-requests", {
        branchId: data.branchId,
        invoiceNo: data.invoiceNo,
        amountCents,
        custMobile: data.custMobile || undefined,
        custName: data.custName || undefined,
        description: data.description || undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCreatedPayment(data);
      queryClient.invalidateQueries({ queryKey: ["/api/payment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Payment request created!",
        description: "Share the payment link with your customer.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to create payment request",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    },
  });

  const onSubmit = (data: CreatePaymentForm) => {
    createMutation.mutate(data);
  };

  const copyLink = () => {
    if (createdPayment?.shortLink) {
      navigator.clipboard.writeText(createdPayment.shortLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast({
        title: "Link copied!",
        description: "Payment link copied to clipboard",
      });
    }
  };

  const closeSuccessDialog = () => {
    setCreatedPayment(null);
    form.reset();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
          <h1 className="text-2xl font-bold tracking-tight">New Payment Request</h1>
          <p className="text-muted-foreground">
            Create a payment request and share the link
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>
            Enter the invoice and customer information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={branchesLoading}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-branch">
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches?.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name} ({branch.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoiceNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="INV-001"
                          className="font-mono"
                          data-testid="input-invoice"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          min="1"
                          placeholder="0.00"
                          className="pl-9 font-mono text-lg"
                          data-testid="input-amount"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Enter the total amount in rupees
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="custMobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Mobile</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+91 98765 43210"
                          className="font-mono"
                          data-testid="input-mobile"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        For sending payment link via WhatsApp
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="custName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Customer name"
                          data-testid="input-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add notes or description for this payment..."
                        className="resize-none"
                        rows={3}
                        data-testid="input-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/payments")}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-create"
                >
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Payment Request
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={!!createdPayment} onOpenChange={closeSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                <Check className="h-4 w-4 text-emerald-500" />
              </div>
              Payment Request Created
            </DialogTitle>
            <DialogDescription>
              Share this link with your customer to receive payment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <AmountDisplay
                  amountCents={createdPayment?.amountCents || 0}
                  size="xl"
                  className="text-foreground"
                />
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Invoice</p>
                <p className="font-mono font-medium">
                  {createdPayment?.invoiceNo}
                </p>
              </div>
            </div>

            {createdPayment?.qrDataUri && (
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-white rounded-lg border">
                  <img
                    src={createdPayment.qrDataUri}
                    alt="Payment QR Code"
                    className="w-48 h-48"
                    data-testid="img-qr-code"
                  />
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <QrCode className="h-3 w-3" />
                  Scan to pay with any UPI app
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={createdPayment?.shortLink || ""}
                readOnly
                className="font-mono text-sm"
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
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={copyLink}
                data-testid="button-copy-link-main"
              >
                <Copy className="mr-2 h-4 w-4" />
                {linkCopied ? "Copied!" : "Copy Link"}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(createdPayment?.shortLink, "_blank")}
                data-testid="button-open-link"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={closeSuccessDialog}
              data-testid="button-create-another"
            >
              Create Another Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
