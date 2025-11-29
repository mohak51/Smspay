import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircle,
  MessageSquare,
  Link as LinkIcon,
  Check,
  X,
  RefreshCw,
  Loader2,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TableSkeleton } from "@/components/loading-skeleton";
import { NoUnidentifiedState } from "@/components/empty-state";
import { AmountDisplay, formatAmountCents } from "@/components/amount-display";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SmsInbox, PaymentRequest } from "@shared/schema";

interface SmsInboxWithDetails extends SmsInbox {
  deviceName?: string;
}

interface CandidatePayment extends PaymentRequest {
  branchName?: string;
  matchScore?: number;
}

export default function UnidentifiedPage() {
  const { toast } = useToast();
  const [selectedSms, setSelectedSms] = useState<SmsInboxWithDetails | null>(null);
  const [candidates, setCandidates] = useState<CandidatePayment[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<string>("");
  const [matchNote, setMatchNote] = useState("");
  const [expandedSms, setExpandedSms] = useState<string | null>(null);

  const { data: unidentified, isLoading, refetch } = useQuery<SmsInboxWithDetails[]>({
    queryKey: ["/api/sms/unidentified"],
  });

  const candidatesMutation = useMutation({
    mutationFn: async (smsId: string) => {
      const response = await apiRequest("GET", `/api/sms/${smsId}/candidates`, {});
      return response.json();
    },
    onSuccess: (data) => {
      setCandidates(data);
    },
  });

  const matchMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/sms/${selectedSms?.id}/manual-match`, {
        paymentRequestId: selectedCandidate,
        note: matchNote || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/unidentified"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-requests"] });
      setSelectedSms(null);
      setCandidates([]);
      setSelectedCandidate("");
      setMatchNote("");
      toast({
        title: "Payment matched!",
        description: "The SMS has been matched to the payment request.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Match failed",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (smsId: string) => {
      await apiRequest("POST", `/api/sms/${smsId}/dismiss`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/unidentified"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "SMS dismissed",
        description: "The SMS has been removed from the queue.",
      });
    },
  });

  const openMatchDialog = (sms: SmsInboxWithDetails) => {
    setSelectedSms(sms);
    candidatesMutation.mutate(sms.id);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Unidentified Payments</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <TableSkeleton rows={5} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unidentified Payments</h1>
          <p className="text-muted-foreground">
            SMS that couldn't be automatically matched
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {unidentified && unidentified.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-base">
                  {unidentified.length} SMS{unidentified.length !== 1 ? "s" : ""} Need Review
                </CardTitle>
                <CardDescription>
                  These couldn't be automatically matched to payment requests
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SMS Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {unidentified && unidentified.length > 0 ? (
            <div className="space-y-3">
              {unidentified.map((sms) => (
                <Collapsible
                  key={sms.id}
                  open={expandedSms === sms.id}
                  onOpenChange={() =>
                    setExpandedSms(expandedSms === sms.id ? null : sms.id)
                  }
                >
                  <div
                    className="p-4 rounded-lg border"
                    data-testid={`sms-row-${sms.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                          <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {sms.sender || "Unknown sender"}
                            </span>
                            {sms.parsedAmountCents && (
                              <Badge variant="secondary" className="font-mono">
                                {formatAmountCents(sms.parsedAmountCents)}
                              </Badge>
                            )}
                            {sms.parseConfidence && (
                              <Badge
                                variant="outline"
                                className={
                                  sms.parseConfidence >= 80
                                    ? "border-emerald-500/50 text-emerald-600"
                                    : sms.parseConfidence >= 50
                                    ? "border-amber-500/50 text-amber-600"
                                    : "border-red-500/50 text-red-600"
                                }
                              >
                                {sms.parseConfidence}% confidence
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {sms.rawText.slice(0, 80)}...
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>
                              {format(new Date(sms.receivedAt), "dd MMM, h:mm a")}
                            </span>
                            {sms.parsedUtr && (
                              <span className="font-mono">UTR: {sms.parsedUtr}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon">
                            {expandedSms === sms.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openMatchDialog(sms)}
                          data-testid={`button-match-${sms.id}`}
                        >
                          <LinkIcon className="mr-2 h-4 w-4" />
                          Match
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => dismissMutation.mutate(sms.id)}
                          data-testid={`button-dismiss-${sms.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CollapsibleContent>
                      <Separator className="my-4" />
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Full SMS Text
                          </Label>
                          <pre className="mt-1 p-3 rounded bg-muted text-sm font-mono whitespace-pre-wrap break-words">
                            {sms.rawText}
                          </pre>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Parsed Amount
                            </Label>
                            <p className="font-mono font-medium">
                              {sms.parsedAmountCents
                                ? formatAmountCents(sms.parsedAmountCents)
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Parsed UTR
                            </Label>
                            <p className="font-mono font-medium">
                              {sms.parsedUtr || "—"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Parsed VPA
                            </Label>
                            <p className="font-mono font-medium">
                              {sms.parsedVpa || "—"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Device
                            </Label>
                            <p className="font-medium">
                              {sms.deviceName || "Unknown"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          ) : (
            <NoUnidentifiedState />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedSms} onOpenChange={() => setSelectedSms(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manual Match</DialogTitle>
            <DialogDescription>
              Match this SMS to a pending payment request
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <Label className="text-xs text-muted-foreground">SMS Content</Label>
              <pre className="mt-1 p-3 rounded bg-muted text-sm font-mono whitespace-pre-wrap break-words max-h-32 overflow-auto">
                {selectedSms?.rawText}
              </pre>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Amount</Label>
                <p className="font-mono font-medium">
                  {selectedSms?.parsedAmountCents
                    ? formatAmountCents(selectedSms.parsedAmountCents)
                    : "—"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">UTR</Label>
                <p className="font-mono font-medium">{selectedSms?.parsedUtr || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">VPA</Label>
                <p className="font-mono font-medium">{selectedSms?.parsedVpa || "—"}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Select Matching Payment Request</Label>
              {candidatesMutation.isPending ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading candidates...
                </div>
              ) : candidates.length > 0 ? (
                <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                  <SelectTrigger data-testid="select-candidate">
                    <SelectValue placeholder="Select a payment request" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        <div className="flex items-center gap-3">
                          <span className="font-mono">{candidate.invoiceNo}</span>
                          <span className="text-muted-foreground">•</span>
                          <span>{formatAmountCents(candidate.amountCents)}</span>
                          {candidate.matchScore && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <Badge variant="outline" className="text-xs">
                                {candidate.matchScore}% match
                              </Badge>
                            </>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No matching candidates found. Try adjusting the amount or check pending payments.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="matchNote">Note (optional)</Label>
              <Textarea
                id="matchNote"
                placeholder="Add a note about this match..."
                value={matchNote}
                onChange={(e) => setMatchNote(e.target.value)}
                data-testid="input-match-note"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSms(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => matchMutation.mutate()}
              disabled={!selectedCandidate || matchMutation.isPending}
              data-testid="button-confirm-match"
            >
              {matchMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Check className="mr-2 h-4 w-4" />
              Confirm Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
