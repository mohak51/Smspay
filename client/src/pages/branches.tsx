import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Check,
  X,
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { TableSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Branch } from "@shared/schema";

const branchSchema = z.object({
  code: z.string().min(2).max(10),
  name: z.string().min(1),
  upiVpa: z.string().optional(),
  upiHint: z.string().optional(),
  bankAccountRef: z.string().optional(),
  isActive: z.boolean(),
});

type BranchForm = z.infer<typeof branchSchema>;

export default function BranchesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);

  const { data: branches, isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const form = useForm<BranchForm>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      code: "",
      name: "",
      upiVpa: "",
      upiHint: "",
      bankAccountRef: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: BranchForm) => {
      const response = await apiRequest("POST", "/api/branches", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Branch created!",
        description: "The new branch has been added.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to create branch",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: BranchForm) => {
      const response = await apiRequest("PATCH", `/api/branches/${editingBranch?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      setEditingBranch(null);
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Branch updated!",
        description: "The branch details have been saved.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update branch",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (branchId: string) => {
      await apiRequest("DELETE", `/api/branches/${branchId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      setDeletingBranch(null);
      toast({
        title: "Branch deleted",
        description: "The branch has been removed.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete branch",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    },
  });

  const openEditDialog = (branch: Branch) => {
    setEditingBranch(branch);
    form.reset({
      code: branch.code,
      name: branch.name,
      upiVpa: "",
      upiHint: branch.upiHint || "",
      bankAccountRef: branch.bankAccountRef || "",
      isActive: branch.isActive,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingBranch(null);
    form.reset({
      code: "",
      name: "",
      upiVpa: "",
      upiHint: "",
      bankAccountRef: "",
      isActive: true,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: BranchForm) => {
    if (editingBranch) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Branches</h1>
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
          <h1 className="text-2xl font-bold tracking-tight">Branches</h1>
          <p className="text-muted-foreground">
            Manage branch locations and UPI details
          </p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-branch">
          <Plus className="mr-2 h-4 w-4" />
          Add Branch
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBranch ? "Edit Branch" : "Add New Branch"}
            </DialogTitle>
            <DialogDescription>
              {editingBranch
                ? "Update the branch details below"
                : "Enter the details for the new branch"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., MAIN, BR01"
                          className="font-mono uppercase"
                          data-testid="input-branch-code"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Main Store"
                          data-testid="input-branch-name"
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
                name="upiVpa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UPI VPA</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="business@upi"
                        className="font-mono"
                        data-testid="input-upi-vpa"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The UPI ID for receiving payments (stored encrypted)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="upiHint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UPI Hint</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="For display purposes"
                        data-testid="input-upi-hint"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A masked version of the UPI ID for display
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankAccountRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Account Reference</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="For reconciliation"
                        data-testid="input-bank-ref"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Allow new payment requests for this branch
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-branch"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingBranch ? "Save Changes" : "Create Branch"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingBranch} onOpenChange={() => setDeletingBranch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingBranch?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingBranch && deleteMutation.mutate(deletingBranch.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Branches</CardTitle>
          <CardDescription>
            {branches?.length || 0} branch{branches?.length !== 1 ? "es" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {branches && branches.length > 0 ? (
            <div className="space-y-3">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                  data-testid={`branch-row-${branch.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{branch.name}</span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {branch.code}
                        </Badge>
                        {!branch.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">
                        {branch.upiHint || "No UPI configured"}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(branch)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeletingBranch(branch)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Building2}
              title="No branches yet"
              description="Add your first branch to start creating payment requests."
              actionLabel="Add Branch"
              onAction={openCreateDialog}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
