import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/services/impactService";
import type { BaseProfile } from "@/types/impact";
import { getMockSession, isMockAuthEnabled } from "@/lib/mockAuth";

export function useAuthProfile() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<BaseProfile | null>(null);

  const refresh = async () => {
    setLoading(true);

    if (isMockAuthEnabled()) {
      const session = getMockSession();
      if (!session) {
        setUserId(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUserId(session.id);
      setProfile({
        id: session.id,
        role: session.role,
        display_name: session.displayName,
        location: null,
        contact_info: session.email,
        verification_status: "unverified",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserId(user?.id || null);

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const myProfile = await getMyProfile();
      setProfile(myProfile);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();

    if (isMockAuthEnabled()) {
      const handler = () => refresh();
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    }

    const { data } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  return {
    loading,
    userId,
    profile,
    refresh,
    isAuthenticated: Boolean(userId),
  };
}
