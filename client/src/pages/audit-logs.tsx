import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  History,
  Search,
  Filter,
  RefreshCw,
  User,
  FileText,
  Shield,
  Smartphone,
  CreditCard,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { TableSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import type { AuditLog } from "@shared/schema";

interface AuditLogWithUser extends AuditLog {
  userName?: string;
}

const actionIcons: Record<string, typeof History> = {
  payment_request: FileText,
  payment: CreditCard,
  device: Smartphone,
  auth: Shield,
  user: User,
};

const actionColors: Record<string, string> = {
  create: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  update: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  delete: "bg-red-500/10 text-red-600 border-red-500/20",
  login: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  logout: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  match: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  verify: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  revoke: "bg-red-500/10 text-red-600 border-red-500/20",
};

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const { data: logs, isLoading, refetch } = useQuery<AuditLogWithUser[]>({
    queryKey: ["/api/audit-logs", { entity: entityFilter }],
  });

  const filteredLogs = logs?.filter((log) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(query) ||
      log.entityType.toLowerCase().includes(query) ||
      log.userName?.toLowerCase().includes(query)
    );
  });

  const getActionBadgeClass = (action: string) => {
    const actionType = action.split("_")[0];
    return actionColors[actionType] || "bg-muted text-muted-foreground";
  };

  const getEntityIcon = (entityType: string) => {
    const Icon = actionIcons[entityType] || History;
    return Icon;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Audit Logs</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <TableSkeleton rows={10} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Complete history of all system actions
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search actions, entities, users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-entity-filter">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="payment_request">Payment Requests</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="device">Devices</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="branch">Branches</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs && filteredLogs.length > 0 ? (
            <div className="space-y-2">
              {filteredLogs.map((log) => {
                const EntityIcon = getEntityIcon(log.entityType);
                return (
                  <Collapsible
                    key={log.id}
                    open={expandedLog === log.id}
                    onOpenChange={() =>
                      setExpandedLog(expandedLog === log.id ? null : log.id)
                    }
                  >
                    <div
                      className="p-4 rounded-lg border hover-elevate"
                      data-testid={`log-row-${log.id}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
                            <EntityIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`text-xs font-medium ${getActionBadgeClass(log.action)}`}
                              >
                                {log.action.replace(/_/g, " ").toUpperCase()}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                on
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {log.entityType}
                              </Badge>
                              {log.entityId && (
                                <span className="text-xs text-muted-foreground font-mono truncate">
                                  #{log.entityId.slice(0, 8)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              {log.userName && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {log.userName}
                                </span>
                              )}
                              <span className="text-xs">
                                {format(new Date(log.createdAt), "dd MMM yyyy, h:mm:ss a")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon">
                            {expandedLog === log.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent>
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                IP Address
                              </Label>
                              <p className="font-mono">{log.ipAddress || "—"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                User Agent
                              </Label>
                              <p className="truncate text-muted-foreground text-xs">
                                {log.userAgent || "—"}
                              </p>
                            </div>
                          </div>
                          {log.meta && Object.keys(log.meta as object).length > 0 && (
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Additional Data
                              </Label>
                              <pre className="mt-1 p-3 rounded bg-muted text-xs font-mono overflow-auto max-h-32">
                                {JSON.stringify(log.meta, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={History}
              title="No audit logs"
              description="System actions will appear here once activity begins."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
