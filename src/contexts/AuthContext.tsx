import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  username: string;
  email: string;
  userType: "individual" | "ngo";
  loginTime?: string;
  registrationTime?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  register: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncFromSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const metadata = session.user.user_metadata || {};
      setUser({
        id: session.user.id,
        username: metadata.displayName || metadata.full_name || session.user.email?.split("@")[0] || "User",
        email: session.user.email || "",
        userType: (metadata.userType || metadata.role || "individual") as "individual" | "ngo",
        loginTime: session.user.last_sign_in_at || new Date().toISOString(),
      });
      setIsLoading(false);
    };

    syncFromSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        return;
      }

      const metadata = session.user.user_metadata || {};
      setUser({
        id: session.user.id,
        username: metadata.displayName || metadata.full_name || session.user.email?.split("@")[0] || "User",
        email: session.user.email || "",
        userType: (metadata.userType || metadata.role || "individual") as "individual" | "ngo",
        loginTime: session.user.last_sign_in_at || new Date().toISOString(),
      });
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const login = (newUser: User) => {
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
    supabase.auth.signOut();
  };

  const register = (newUser: User) => {
    setUser(newUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
