import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "./components/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import RunAgents from "./pages/RunAgents";
import Issues from "./pages/Issues";
import Volunteers from "./pages/Volunteers";
import ActionPlan from "./pages/ActionPlan";
import AgentLogs from "./pages/AgentLogs";
import Community from "./pages/Community";
import Saved from "./pages/Saved";
import PostDetail from "./pages/PostDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/community" element={<Community />} />
              <Route path="/community/:type/:id" element={<PostDetail />} />
              <Route path="/saved" element={<Saved />} />
              <Route path="/run" element={<RunAgents />} />
              <Route path="/issues" element={<Issues />} />
              <Route path="/volunteers" element={<Volunteers />} />
              <Route path="/action-plan" element={<ActionPlan />} />
              <Route path="/logs" element={<AgentLogs />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
