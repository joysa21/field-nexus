import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getNotifications, markNotificationRead } from "@/services/impactService";
import type { NotificationItem } from "@/types/impact";

export default function Notifications() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationItem[]>([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setItems(data);
    } catch (error: any) {
      toast.error(error.message || "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const markRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      refresh();
    } catch (error: any) {
      toast.error(error.message || "Could not mark notification as read.");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">Updates on responses, comments, and status changes.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="border rounded-md p-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{item.title}</p>
                    {!item.is_read && <Badge>New</Badge>}
                  </div>
                  {item.body && <p className="text-sm text-muted-foreground mt-1">{item.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(item.created_at).toLocaleString()}</p>
                </div>
                {!item.is_read && (
                  <Button variant="outline" size="sm" onClick={() => markRead(item.id)}>
                    Mark read
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
