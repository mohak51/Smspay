import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FileText,
  Smartphone,
  AlertCircle,
  History,
  Building2,
  Users,
  Settings,
  LogOut,
  IndianRupee,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

const mainMenuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Payment Requests",
    url: "/payments",
    icon: FileText,
  },
  {
    title: "Unidentified Queue",
    url: "/unidentified",
    icon: AlertCircle,
    badge: true,
  },
];

const adminMenuItems = [
  {
    title: "Branches",
    url: "/branches",
    icon: Building2,
  },
  {
    title: "Devices",
    url: "/devices",
    icon: Smartphone,
  },
  {
    title: "Users",
    url: "/users",
    icon: Users,
  },
  {
    title: "Audit Logs",
    url: "/audit-logs",
    icon: History,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const { data: stats } = useQuery<{ unidentifiedCount: number }>({
    queryKey: ["/api/stats/unidentified-count"],
  });

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  const isOwnerOrAccountant = user?.role === "owner" || user?.role === "accountant";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <IndianRupee className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold">PayFlow</span>
            <span className="text-xs text-muted-foreground">UPI Automation</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-active={isActive(item.url)}>
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.badge && stats?.unidentifiedCount ? (
                        <Badge variant="destructive" className="ml-auto text-xs">
                          {stats.unidentifiedCount}
                        </Badge>
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isOwnerOrAccountant && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminMenuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild data-active={isActive(item.url)}>
                        <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarSeparator className="mb-4" />
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.username}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace("_", " ")}</p>
          </div>
          <div className="flex gap-1">
            <SidebarMenuButton asChild size="sm" className="h-8 w-8">
              <Link href="/settings" data-testid="link-settings">
                <Settings className="h-4 w-4" />
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton
              size="sm"
              className="h-8 w-8"
              onClick={() => logout()}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </SidebarMenuButton>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
