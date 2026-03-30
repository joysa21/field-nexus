import { useEffect, useState } from "react";
import { getNotifications } from "@/services/impactService";
import type { NotificationItem } from "@/types/impact";

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return {
    items,
    loading,
    unreadCount: items.filter((item) => !item.is_read).length,
    refresh,
  };
}
