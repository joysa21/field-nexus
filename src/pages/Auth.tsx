import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";

export default function Auth() {
  const navigate = useNavigate();
  const { isAuthenticated, register, login } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [userType, setUserType] = useState<"individual" | "ngo">("individual");

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleLoginSuccess = (user: any) => {
    login(user);
    navigate("/");
  };

  const handleRegisterSuccess = (user: any) => {
    register(user);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">FieldNexus</h1>
          <p className="text-muted-foreground">Connecting aid with those who need it most</p>
        </div>

        {/* Main Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <CardDescription>
              {activeTab === "login" && "Sign in to your account"}
              {activeTab === "register" && "Create a new account"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login" className="space-y-4">
                <div className="space-y-4 mb-6">
                  <p className="text-sm font-medium text-foreground">Login as</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={userType === "individual" ? "default" : "outline"}
                      onClick={() => setUserType("individual")}
                      className="w-full"
                    >
                      Individual
                    </Button>
                    <Button
                      variant={userType === "ngo" ? "default" : "outline"}
                      onClick={() => setUserType("ngo")}
                      className="w-full"
                    >
                      NGO
                    </Button>
                  </div>
                </div>
                <LoginForm userType={userType} onSuccess={handleLoginSuccess} />
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register" className="space-y-4">
                <div className="space-y-4 mb-6">
                  <p className="text-sm font-medium text-foreground">Register as</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={userType === "individual" ? "default" : "outline"}
                      onClick={() => setUserType("individual")}
                      className="w-full"
                    >
                      Individual
                    </Button>
                    <Button
                      variant={userType === "ngo" ? "default" : "outline"}
                      onClick={() => setUserType("ngo")}
                      className="w-full"
                    >
                      NGO
                    </Button>
                  </div>
                </div>
                <RegisterForm userType={userType} onSuccess={handleRegisterSuccess} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Together we can make a difference</p>
        </div>
      </div>
    </div>
  );
}
