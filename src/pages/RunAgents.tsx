import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { runOrchestrator, AgentState } from "@/agents/orchestrator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle, Circle, Loader2, SkipForward, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatTime } from "@/lib/i18n";

const STEPS = [
  { key: "ingestion", labelKey: "runAgents.ingestion", descriptionKey: "runAgents.detectingInput" },
  { key: "extraction", labelKey: "runAgents.extraction", descriptionKey: "runAgents.parsingIssues" },
  { key: "scoring", labelKey: "runAgents.scoring", descriptionKey: "runAgents.computingScores" },
  { key: "gap_detection", labelKey: "runAgents.gapDetection", descriptionKey: "runAgents.checkingCoverage" },
  { key: "matching", labelKey: "runAgents.matching", descriptionKey: "runAgents.assigningVolunteers" },
  { key: "reallocation", labelKey: "runAgents.reallocation", descriptionKey: "runAgents.rebalancing" },
  { key: "complete", labelKey: "runAgents.report", descriptionKey: "runAgents.generatingPlan" },
];

const STEP_ORDER = STEPS.map((s) => s.key);

type StepStatus = "waiting" | "active" | "done" | "skipped";

function getStepStatus(stepKey: string, currentStep: string, isComplete: boolean, hasOverload: boolean): StepStatus {
  if (currentStep === "starting") return "waiting";
  const currentIdx = STEP_ORDER.indexOf(currentStep === "complete" ? "complete" : currentStep);
  const stepIdx = STEP_ORDER.indexOf(stepKey);

  if (stepKey === "reallocation" && !hasOverload) return "skipped";
  if (isComplete && stepKey === "complete") return "done";
  if (currentStep === stepKey) return "active";
  if (stepIdx < currentIdx) return "done";
  return "waiting";
}

export default function RunAgents() {
  const [rawInput, setRawInput] = useState("");
  const [running, setRunning] = useState(false);
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [agentState?.agentLogs]);

  const handleRun = async () => {
    if (!rawInput.trim()) {
      toast.error(t("runAgents.pasteReportFirst"));
      return;
    }
    setRunning(true);
    setAgentState(null);

    try {
      const { data: volunteers } = await supabase.from("volunteers").select("*").eq("is_active", true);

      const finalState = await runOrchestrator(
        rawInput,
        volunteers || [],
        (state) => setAgentState({ ...state })
      );

      // Save to Supabase
      const { error: runErr } = await supabase.from("agent_runs").insert({
        total_issues: finalState.issues.length,
        total_assigned: finalState.assignments.length,
        alerts: finalState.alerts as any,
        agent_logs: finalState.agentLogs as any,
      });
      if (runErr) throw runErr;

      if (finalState.issues.length > 0) {
        const { error: issuesErr } = await supabase.from("issues").insert(finalState.issues);
        if (issuesErr) throw issuesErr;
      }

      toast.success(t("runAgents.pipelineComplete", { count: finalState.issues.length }));
    } catch (e: any) {
      toast.error(t("runAgents.pipelineError", { message: e.message }));
    } finally {
      setRunning(false);
    }
  };

  const currentStep = agentState?.currentStep || "starting";
  const isComplete = agentState?.isComplete || false;
  const hasOverload = agentState?.alerts.some((a) => a.type === "overload") || false;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
          <h1 className="text-2xl font-bold text-foreground">{t("nav.runAgents")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("runAgents.subtitle")}</p>
      </div>

      {/* Input */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">{t("runAgents.pasteReport")}</label>
            <Textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={t("runAgents.placeholder")}
              className="min-h-[140px] resize-none font-mono text-sm"
              disabled={running}
            />
          </div>
          <Button onClick={handleRun} disabled={running || !rawInput.trim()} className="gap-2">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {running ? t("runAgents.running") : t("runAgents.runAll")}
          </Button>
        </CardContent>
      </Card>

      {/* Stepper + Console — only show once started */}
      {agentState && (
        <div className="grid grid-cols-5 gap-6">
          {/* Stepper */}
          <div className="col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t("runAgents.pipelineSteps")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {STEPS.map((step) => {
                  const status = getStepStatus(step.key, currentStep, isComplete, hasOverload);
                  const log = agentState.agentLogs.find((l) =>
                    l.agent.toLowerCase().includes(step.key === "complete" ? "report" : step.key.replace("_", " "))
                  );
                  return (
                    <div key={step.key} className="flex gap-3 items-start">
                      <div className="mt-0.5 flex-shrink-0">
                        {status === "done" && <CheckCircle className="w-5 h-5 text-primary" />}
                        {status === "active" && <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />}
                        {status === "waiting" && <Circle className="w-5 h-5 text-muted-foreground/30" />}
                        {status === "skipped" && <SkipForward className="w-5 h-5 text-muted-foreground/30" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium leading-tight ${status === "waiting" || status === "skipped" ? "text-muted-foreground" : "text-foreground"}`}>
                          {t(step.labelKey)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {status === "skipped" ? t("runAgents.skipped") : t(step.descriptionKey)}
                        </p>
                        {status === "done" && log && (
                          <p className="text-xs text-primary mt-1 truncate">{log.decision}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Agent Thoughts Console */}
          <div className="col-span-3">
            <Card className="h-full border-0 overflow-hidden">
              <CardHeader className="pb-2 bg-[hsl(222,20%,9%)] border-b border-white/5">
                <CardTitle className="text-xs text-green-400 font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  {t("runAgents.agentThoughts")}
                </CardTitle>
              </CardHeader>
              <div
                ref={consoleRef}
                className="terminal-console p-4 text-xs leading-relaxed overflow-y-auto"
                style={{ minHeight: 280, maxHeight: 380, background: "#0f1117" }}
              >
                {agentState.agentLogs.length === 0 ? (
                  <span className="text-green-400/40">{t("runAgents.waiting")}</span>
                ) : (
                  agentState.agentLogs.map((log, i) => (
                    <div key={i} className="mb-2">
                      <span className="text-green-400/60">[{formatTime(log.timestamp)}]</span>
                      {" "}
                      <span className="text-cyan-400">{log.agent}</span>
                      {" › "}
                      <span className="text-green-300">{log.decision}</span>
                    </div>
                  ))
                )}
                {running && (
                  <span className="text-amber-400 animate-pulse">▌</span>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Post-completion CTA */}
      {isComplete && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
          <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
          <p className="text-sm text-foreground flex-1">
            {t("runAgents.pipelineCompleteSteps", { count: agentState?.agentLogs.length || 0 })}
          </p>
          <Button asChild size="sm" variant="outline" className="gap-2">
            <Link to="/issues">
              {t("runAgents.viewIssues")} <ArrowRight className="w-3 h-3" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
