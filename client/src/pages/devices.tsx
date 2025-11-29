import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Smartphone,
  Plus,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { TableSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Device } from "@shared/schema";

interface DeviceWithUser extends Device {
  userName?: string;
}

interface NewDeviceResponse {
  device: Device;
  webhookToken: string;
}

export default function DevicesPage() {
  const { toast } = useToast();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [newDeviceData, setNewDeviceData] = useState<NewDeviceResponse | null>(null);
  const [revokeDevice, setRevokeDevice] = useState<Device | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const { data: devices, isLoading, refetch } = useQuery<DeviceWithUser[]>({
    queryKey: ["/api/devices"],
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/devices/register", {
        deviceName,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setNewDeviceData(data);
      setDeviceName("");
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({
        title: "Device registered!",
        description: "Copy the webhook token to configure the SMS forwarder.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to register device",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      await apiRequest("POST", `/api/devices/${deviceId}/revoke`, {});
    },
    onSuccess: () => {
      setRevokeDevice(null);
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({
        title: "Device revoked",
        description: "The device can no longer forward SMS.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to revoke device",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    },
  });

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const isRecent = (date: string | null) => {
    if (!date) return false;
    const lastSeen = new Date(date);
    const now = new Date();
    return now.getTime() - lastSeen.getTime() < 5 * 60 * 1000; // 5 minutes
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Devices</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <TableSkeleton rows={4} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
          <p className="text-muted-foreground">
            Manage SMS forwarder devices
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-register-device">
                <Plus className="mr-2 h-4 w-4" />
                Register Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register New Device</DialogTitle>
                <DialogDescription>
                  Add a new Android device to forward bank SMS
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="deviceName">Device Name</Label>
                  <Input
                    id="deviceName"
                    placeholder="e.g., Store Phone, Manager's Device"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    data-testid="input-device-name"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRegisterOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => registerMutation.mutate()}
                  disabled={!deviceName || registerMutation.isPending}
                  data-testid="button-confirm-register"
                >
                  {registerMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Register
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={!!newDeviceData} onOpenChange={() => setNewDeviceData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-500" />
              Device Registered
            </DialogTitle>
            <DialogDescription>
              Copy the webhook token below to configure the SMS forwarder app
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-600 dark:text-amber-400">
                    Save this token now!
                  </p>
                  <p className="text-muted-foreground">
                    This token will only be shown once. You'll need it to configure the SMS forwarder app.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Device UUID</Label>
              <div className="flex gap-2">
                <Input
                  value={newDeviceData?.device.deviceUuid || ""}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToken(newDeviceData?.device.deviceUuid || "")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Webhook Token</Label>
              <div className="flex gap-2">
                <Input
                  value={newDeviceData?.webhookToken || ""}
                  readOnly
                  className="font-mono text-xs"
                  data-testid="input-webhook-token"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToken(newDeviceData?.webhookToken || "")}
                  data-testid="button-copy-token"
                >
                  {tokenCopied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewDeviceData(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeDevice} onOpenChange={() => setRevokeDevice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Device Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke "{revokeDevice?.deviceName}"? This device will no longer be able to forward SMS.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeDevice && revokeMutation.mutate(revokeDevice.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered Devices</CardTitle>
          <CardDescription>
            Devices authorized to forward bank SMS
          </CardDescription>
        </CardHeader>
        <CardContent>
          {devices && devices.length > 0 ? (
            <div className="space-y-3">
              {devices.map((device) => {
                const isOnline = isRecent(device.lastSeenAt);
                const isRevoked = !!device.revokedAt;

                return (
                  <div
                    key={device.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isRevoked ? "opacity-60" : ""
                    }`}
                    data-testid={`device-row-${device.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          isRevoked
                            ? "bg-muted"
                            : isOnline
                            ? "bg-emerald-500/10"
                            : "bg-muted"
                        }`}
                      >
                        <Smartphone
                          className={`h-5 w-5 ${
                            isRevoked
                              ? "text-muted-foreground"
                              : isOnline
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{device.deviceName}</p>
                          {isRevoked ? (
                            <Badge variant="destructive" className="text-xs">
                              Revoked
                            </Badge>
                          ) : isOnline ? (
                            <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">
                              <Wifi className="h-3 w-3 mr-1" />
                              Online
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <WifiOff className="h-3 w-3 mr-1" />
                              Offline
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          {device.deviceUuid.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">Last seen</p>
                        <p>
                          {device.lastSeenAt
                            ? format(new Date(device.lastSeenAt), "dd MMM, h:mm a")
                            : "Never"}
                        </p>
                      </div>
                      {!isRevoked && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => copyToken(device.deviceUuid)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Device UUID
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setRevokeDevice(device)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Revoke Access
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Smartphone}
              title="No devices registered"
              description="Register an Android device to start forwarding bank SMS for automatic payment matching."
              actionLabel="Register Device"
              onAction={() => setRegisterOpen(true)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
