import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [userType, setUserType] = useState<"individual" | "ngo">("individual");
  const returnTo = (location.state as { from?: string } | null)?.from ?? "/";

  if (isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  const handleLoginSuccess = () => {
    navigate(returnTo);
  };

  const handleRegisterSuccess = () => {
    setActiveTab("login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">{t("app.brand")}</h1>
          <p className="text-muted-foreground">{t("auth.connectAid")}</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">{t("auth.title")}</CardTitle>
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
                  <p className="text-sm font-medium text-foreground">{t("auth.loginAs")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={userType === "individual" ? "default" : "outline"}
                      onClick={() => setUserType("individual")}
                      className="w-full"
                    >
                      {t("auth.individual")}
                    </Button>
                    <Button
                      variant={userType === "ngo" ? "default" : "outline"}
                      onClick={() => setUserType("ngo")}
                      className="w-full"
                    >
                      {t("auth.ngo")}
                    </Button>
                  </div>
                </div>
                <LoginForm userType={userType} onSuccess={handleLoginSuccess} />
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <div className="space-y-4 mb-6">
                  <p className="text-sm font-medium text-foreground">{t("auth.registerAs")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={userType === "individual" ? "default" : "outline"}
                      onClick={() => setUserType("individual")}
                      className="w-full"
                    >
                      {t("auth.individual")}
                    </Button>
                    <Button
                      variant={userType === "ngo" ? "default" : "outline"}
                      onClick={() => setUserType("ngo")}
                      className="w-full"
                    >
                      {t("auth.ngo")}
                    </Button>
                  </div>
                </div>
                <RegisterForm userType={userType} onSuccess={handleRegisterSuccess} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>{t("auth.together")}</p>
        </div>
      </div>
    </div>
  );
}
