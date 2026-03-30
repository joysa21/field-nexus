import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/hooks/useNotifications";
import { markNotificationRead } from "@/services/impactService";

export function NotificationBell() {
  const { items, unreadCount, refresh } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-[10px] leading-none flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-2">
        <div className="px-2 py-1">
          <h4 className="font-semibold text-sm">Notifications</h4>
        </div>
        <div className="max-h-80 overflow-auto space-y-1">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2">No notifications yet.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={async () => {
                  if (!item.is_read) {
                    await markNotificationRead(item.id);
                    refresh();
                  }
                }}
                className={`w-full text-left rounded-md border px-3 py-2 transition-colors hover:bg-muted/50 ${
                  item.is_read ? "border-transparent" : "border-primary/30 bg-primary/5"
                }`}
              >
                <p className="text-sm font-medium">{item.title}</p>
                {item.body && <p className="text-xs text-muted-foreground mt-1">{item.body}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">{new Date(item.created_at).toLocaleString()}</p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
