import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationBell } from "@/components/community/NotificationBell";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import { toast } from "sonner";
import { clearMockSession, isMockAuthEnabled } from "@/lib/mockAuth";

export default function Layout() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthProfile();

  const signOut = async () => {
    if (isMockAuthEnabled()) {
      clearMockSession();
    } else {
      await supabase.auth.signOut();
    }
    toast.success("Signed out.");
    navigate("/auth");
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b bg-background px-4 no-print">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex items-center gap-2">
              {isAuthenticated && <NotificationBell />}
              {isAuthenticated && (
                <Button size="sm" variant="outline" onClick={signOut}>Sign out</Button>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
