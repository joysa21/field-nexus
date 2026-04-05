import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { Building2, Heart, Users } from "lucide-react";

const roleOptions = [
  { value: "individual", labelKey: "auth.individual", icon: Users },
  { value: "ngo", labelKey: "auth.ngo", icon: Building2 },
  { value: "sponsor", labelKey: "auth.sponsor", icon: Heart },
] as const;

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [userType, setUserType] = useState<"individual" | "ngo" | "sponsor">("individual");
  const fallbackRoute = userType === "sponsor" ? "/sponsor-portal" : "/dashboard";
  const returnTo = (location.state as { from?: string } | null)?.from
    ?? (user?.userType === "sponsor" ? "/sponsor-portal" : fallbackRoute);

  const handleLoginSuccess = () => {
    navigate(returnTo);
  };

  const handleRegisterSuccess = () => {
    setActiveTab("login");
  };

  useEffect(() => {
    const role = searchParams.get("role");
    if (!role) return;

    setActiveTab("register");
    setUserType(role === "ngo" || role === "sponsor" ? role : "individual");
  }, [searchParams]);

  if (isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background p-4 sm:p-6">
      <div className="absolute inset-0">
        <img
          src="/login.png"
          alt="Sahayak background"
          className="h-full w-full object-cover object-center blur-2xl scale-110 opacity-35"
        />
        <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-2rem)] items-center justify-center sm:min-h-[calc(100vh-3rem)]">
        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-semantic-primary">{t("app.brand")}</h1>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </div>

          <Card className="border border-border bg-card shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-semantic-primary">{t("auth.title")}</CardTitle>
            <CardDescription>
              {activeTab === "login" && t("auth.signInSubtitle")}
              {activeTab === "register" && t("auth.registerSubtitle")}
            </CardDescription>
            </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">{t("auth.login")}</TabsTrigger>
                <TabsTrigger value="register">{t("auth.register")}</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <div className="space-y-4 mb-6">
                  <p className="text-sm font-medium text-semantic-primary">{t("auth.loginAs")}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {roleOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <Button
                          key={option.value}
                          variant={userType === option.value ? "default" : "outline"}
                          onClick={() => setUserType(option.value)}
                          className="w-full gap-2"
                        >
                          <Icon className="h-4 w-4" />
                          {t(option.labelKey)}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <LoginForm userType={userType} onSuccess={handleLoginSuccess} />
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <div className="space-y-4 mb-6">
                  <p className="text-sm font-medium text-semantic-primary">{t("auth.registerAs")}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {roleOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <Button
                          key={option.value}
                          variant={userType === option.value ? "default" : "outline"}
                          onClick={() => setUserType(option.value)}
                          className="w-full gap-2"
                        >
                          <Icon className="h-4 w-4" />
                          {t(option.labelKey)}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <RegisterForm userType={userType} onSuccess={handleRegisterSuccess} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-2 text-center text-sm text-semantic-muted">
          <p>{t("auth.together")}</p>
        </div>
      </div>
      </div>
    </div>
  );
}
