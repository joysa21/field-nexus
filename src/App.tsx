import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import RunAgents from "./pages/RunAgents";
import Issues from "./pages/Issues";
import Volunteers from "./pages/Volunteers";
import ActionPlan from "./pages/ActionPlan";
import AgentLogs from "./pages/AgentLogs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/run" element={<RunAgents />} />
            <Route path="/issues" element={<Issues />} />
            <Route path="/volunteers" element={<Volunteers />} />
            <Route path="/action-plan" element={<ActionPlan />} />
            <Route path="/logs" element={<AgentLogs />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
