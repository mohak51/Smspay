import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2 } from "lucide-react";

import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import PaymentRequestsPage from "@/pages/payment-requests";
import CreatePaymentPage from "@/pages/create-payment";
import PaymentDetailPage from "@/pages/payment-detail";
import PaymentLandingPage from "@/pages/payment-landing";
import DevicesPage from "@/pages/devices";
import UnidentifiedPage from "@/pages/unidentified";
import BranchesPage from "@/pages/branches";
import UsersPage from "@/pages/users";
import AuditLogsPage from "@/pages/audit-logs";
import SettingsPage from "@/pages/settings";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  return <>{children}</>;
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function AppRouter() {
  const [location] = useLocation();

  if (location.startsWith("/s/")) {
    return <PaymentLandingPage />;
  }

  if (location === "/login") {
    return <LoginPage />;
  }

  if (location === "/register") {
    return <RegisterPage />;
  }

  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/payments" component={PaymentRequestsPage} />
          <Route path="/payments/new" component={CreatePaymentPage} />
          <Route path="/payments/:id" component={PaymentDetailPage} />
          <Route path="/unidentified" component={UnidentifiedPage} />
          <Route path="/devices" component={DevicesPage} />
          <Route path="/branches" component={BranchesPage} />
          <Route path="/users" component={UsersPage} />
          <Route path="/audit-logs" component={AuditLogsPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Switch>
            <Route path="/s/:token" component={PaymentLandingPage} />
            <Route>
              <AppRouter />
            </Route>
          </Switch>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
