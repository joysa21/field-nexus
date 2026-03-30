import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getConnectionsForMe, updateConnectionStatus } from "@/services/impactService";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import type { ConnectionResponse } from "@/types/impact";

const STATUS_OPTIONS: ConnectionResponse["status"][] = ["pending", "accepted", "rejected", "completed", "closed"];

export default function Connections() {
  const { userId } = useAuthProfile();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ConnectionResponse[]>([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getConnectionsForMe();
      setItems(data);
    } catch (error: any) {
      toast.error(error.message || "Could not load connections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const updateStatus = async (id: string, status: ConnectionResponse["status"]) => {
    try {
      await updateConnectionStatus(id, status);
      toast.success("Connection status updated.");
      refresh();
    } catch (error: any) {
      toast.error(error.message || "Could not update status.");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Connections</h1>
        <p className="text-sm text-muted-foreground mt-1">Track responses, approvals, and completed collaborations.</p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading connections...</CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">No responses yet.</CardContent>
        </Card>
      ) : (
        items.map((item) => {
          const isReceiver = item.receiver_id === userId;
          return (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{item.request_id ? "Request response" : "Offer response"}</CardTitle>
                  <Badge variant={item.status === "accepted" ? "default" : "outline"}>{item.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{item.message || "No message"}</p>
                <p className="text-xs text-muted-foreground">Updated: {new Date(item.updated_at).toLocaleString()}</p>
                {isReceiver && (
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((status) => (
                      <Button
                        key={status}
                        variant={status === item.status ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateStatus(item.id, status)}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
