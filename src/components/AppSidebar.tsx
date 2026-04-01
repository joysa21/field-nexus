import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Play,
  ListChecks,
  Users,
  Bell,
  Bookmark,
  MessageSquare,
  FileText,
  Terminal,
  Zap,
  LogOut,
  User,
} from "lucide-react";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Run Agents", url: "/run", icon: Play, accent: true },
  { title: "Issues", url: "/issues", icon: ListChecks },
  { title: "Volunteers", url: "/volunteers", icon: Users },
  { title: "Action Plan", url: "/action-plan", icon: FileText },
  { title: "Agent Logs", url: "/logs", icon: Terminal },
  { title: "Community Connections", url: "/community", icon: MessageSquare },
  { title: "Saved", url: "/saved", icon: Bookmark },
  { title: "Notifications", url: "/notifications", icon: Bell },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sidebar-primary font-bold text-base leading-tight">Sahayak</h1>
              <p className="text-sidebar-foreground/40 text-[10px] leading-tight">NGO coordination workspace</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.url === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                          item.accent && !isActive
                            ? "text-sidebar-primary hover:bg-sidebar-accent"
                            : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`}
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon
                          className={`w-4 h-4 flex-shrink-0 ${item.accent && !isActive ? "text-sidebar-primary" : ""}`}
                        />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="flex flex-col gap-2 px-4 py-3">
        {user && !collapsed && (
          <div className="flex items-center gap-2 px-2 py-2 rounded-md bg-sidebar-accent/50">
            <User className="w-4 h-4 text-sidebar-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-sidebar-primary truncate">{user.email}</p>
              <p className="text-[9px] text-sidebar-foreground/60 capitalize">{user.userType}</p>
            </div>
          </div>
        )}
        
        {!collapsed && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-xs"
          >
            <LogOut className="w-3 h-3 mr-2" />
            Logout
          </Button>
        )}
        
        {collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        )}
        
      </SidebarFooter>
    </Sidebar>
  );
}
