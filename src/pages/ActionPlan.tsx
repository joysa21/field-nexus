import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Printer, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDateTime, translateLabel, translateSector, translateStatus } from "@/lib/i18n";

interface Issue {
  id: string;
  issue_summary: string | null;
  sector: string | null;
  location: string | null;
  priority_score: number | null;
  status: string | null;
  assigned_volunteer_id: string | null;
  assignment_reason?: string | null;
}

interface Volunteer {
  id: string;
  name: string;
  skills: string[] | null;
  zone: string | null;
}

interface AgentRun {
  id: string;
  run_at: string | null;
  total_issues: number | null;
  total_assigned: number | null;
  alerts: any;
}

const SECTOR_COLORS: Record<string, string> = {
  water: "#0d9488",
  healthcare: "#ef4444",
  electricity: "#f59e0b",
  food: "#22c55e",
  education: "#3b82f6",
  shelter: "#8b5cf6",
  sanitation: "#f97316",
  safety: "#f43f5e",
  logistics: "#64748b",
  counseling: "#ec4899",
  other: "#94a3b8",
};

const SECTOR_SKILL_MATCHES: Record<string, string[]> = {
  water: ["water", "sanitation", "logistics"],
  healthcare: ["healthcare", "counseling"],
  electricity: ["electricity", "logistics"],
  food: ["food", "logistics"],
  education: ["education", "counseling"],
  shelter: ["shelter", "logistics"],
  sanitation: ["sanitation", "water", "logistics"],
  safety: ["safety", "logistics"],
  logistics: ["logistics"],
  counseling: ["counseling", "healthcare"],
  other: [],
};

interface MatchResult {
  volunteer: Volunteer;
  score: number;
  matchedSkills: string[];
  currentLoad: number;
}

interface IssueMatch {
  issue: Issue;
  assignedVolunteer: Volunteer | null;
  recommendedVolunteer: MatchResult | null;
  backupVolunteer: MatchResult | null;
  matchLabel: string;
  matchReason: string;
}

const normalizeValue = (value?: string | null) => value?.toLowerCase().trim() ?? "";

export default function ActionPlan() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [lastRun, setLastRun] = useState<AgentRun | null>(null);
  const [assignedCounts, setAssignedCounts] = useState<Record<string, number>>({});
  const { language, t } = useLanguage();

  useEffect(() => {
    const fetchData = async () => {
      const [issuesRes, volRes, runsRes] = await Promise.all([
        supabase.from("issues").select("*").order("priority_score", { ascending: false }).limit(10),
        supabase.from("volunteers").select("id, name, skills, zone").eq("is_active", true),
        supabase.from("agent_runs").select("*").order("run_at", { ascending: false }).limit(1),
      ]);
      setIssues(issuesRes.data || []);
      setVolunteers(volRes.data || []);
      if (runsRes.data && runsRes.data.length > 0) setLastRun(runsRes.data[0]);

      const counts: Record<string, number> = {};
      (issuesRes.data || []).forEach((i) => {
        if (i.assigned_volunteer_id) counts[i.assigned_volunteer_id] = (counts[i.assigned_volunteer_id] || 0) + 1;
      });
      setAssignedCounts(counts);
    };
    fetchData();
  }, []);

  const totalIssues = issues.length;
  const criticalIssues = issues.filter((i) => (i.priority_score || 0) > 7).length;
  const volunteersDeployed = volunteers.filter((v) => assignedCounts[v.id] > 0).length;
  const unassigned = issues.filter((i) => i.status === "unassigned").length;

  const sectorData = Object.entries(
    issues.reduce((acc: Record<string, number>, i) => {
      const s = i.sector || "other";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const getVolName = (id: string | null) =>
    id ? volunteers.find((v) => v.id === id)?.name || "—" : "—";

  const issueMatches = useMemo<IssueMatch[]>(() => {
    return issues.map((issue) => {
      const sectorKey = normalizeValue(issue.sector) || "other";
      const requiredSkills = SECTOR_SKILL_MATCHES[sectorKey] || [];
      const assignedVolunteer = volunteers.find((volunteer) => volunteer.id === issue.assigned_volunteer_id) || null;

      const scoredCandidates = volunteers
        .map<MatchResult>((volunteer) => {
          const volunteerSkills = (volunteer.skills || []).map(normalizeValue).filter(Boolean);
          const matchedSkills = requiredSkills.filter((skill) => volunteerSkills.includes(skill));
          const currentLoad = assignedCounts[volunteer.id] || 0;

          let score = matchedSkills.length * 10;
          if (normalizeValue(issue.sector) && volunteerSkills.includes(normalizeValue(issue.sector))) {
            score += 12;
          }
          if (["water", "food", "shelter", "sanitation"].includes(sectorKey) && volunteerSkills.includes("logistics")) {
            score += 3;
          }
          if (assignedVolunteer?.id === volunteer.id) {
            score += 40;
          }
          score -= currentLoad * 1.5;

          return { volunteer, score, matchedSkills, currentLoad };
        })
        .sort((left, right) => {
          if (right.score !== left.score) return right.score - left.score;
          if (left.currentLoad !== right.currentLoad) return left.currentLoad - right.currentLoad;
          return left.volunteer.name.localeCompare(right.volunteer.name);
        });

      const recommendedVolunteer = scoredCandidates[0] || null;
      const backupVolunteer = scoredCandidates[1] || null;

      const matchedSkillsText = recommendedVolunteer?.matchedSkills.length
        ? (language === "hi"
          ? `मेल खाते कौशल: ${recommendedVolunteer.matchedSkills.map((skill) => translateLabel(language, skill)).join(", ")}`
          : `matches ${recommendedVolunteer.matchedSkills.join(", ")}`)
        : (language === "hi"
          ? `${translateSector(language, issue.sector || "other")} के लिए सर्वोत्तम उपलब्ध`
          : `best available for ${issue.sector || "other"}`);
      const loadText = recommendedVolunteer
        ? recommendedVolunteer.currentLoad > 0
          ? (language === "hi"
            ? `${recommendedVolunteer.currentLoad} सक्रिय समस्या${recommendedVolunteer.currentLoad === 1 ? "" : "एँ"}`
            : `${recommendedVolunteer.currentLoad} active issue${recommendedVolunteer.currentLoad === 1 ? "" : "s"}`)
          : (language === "hi" ? "हल्का कार्यभार" : "light workload")
        : (language === "hi" ? "कोई सक्रिय स्वयंसेवक उपलब्ध नहीं" : "no active volunteer available");

      return {
        issue,
        assignedVolunteer,
        recommendedVolunteer,
        backupVolunteer,
        matchLabel: assignedVolunteer ? t("actionPlan.assigned") : recommendedVolunteer ? t("actionPlan.suggestedLabel") : t("actionPlan.unmatched"),
        matchReason: `${matchedSkillsText} • ${loadText}`,
      };
    });
  }, [assignedCounts, issues, volunteers, language, t]);

  const getRecommendedVolunteer = (issueId: string | null) =>
    issueMatches.find((match) => match.issue.id === issueId);

  const alerts: any[] = lastRun?.alerts || [];

  const SeverityIcon = ({ severity }: { severity: string }) => {
    if (severity === "critical") return <AlertCircle className="w-3 h-3 text-destructive" />;
    if (severity === "warning") return <AlertTriangle className="w-3 h-3 text-amber-500" />;
    return <Info className="w-3 h-3 text-blue-500" />;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold">Action Plan</h1>
          <p className="text-muted-foreground text-sm mt-1">Printable field coordination report</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" /> Download PDF
        </Button>
      </div>

      {/* Section 1 — Summary banner */}
      <div className="grid grid-cols-4 gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
        {[
          { label: "Total Issues", value: totalIssues },
          { label: "Critical", value: criticalIssues },
          { label: "Volunteers Deployed", value: volunteersDeployed },
          { label: "Unassigned", value: unassigned },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-2xl font-bold text-primary">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Issue-to-volunteer map */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Issue-to-Volunteer Map</h2>
        <div className="grid gap-3">
          {issueMatches.length === 0 ? (
            <div className="h-28 flex items-center justify-center text-muted-foreground text-sm border rounded-lg">
              No issues or volunteers available to match yet.
            </div>
          ) : (
            issueMatches.map(({ issue, assignedVolunteer, recommendedVolunteer, backupVolunteer, matchLabel, matchReason }) => (
              <div key={issue.id} className="border rounded-lg p-4 space-y-3 bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground line-clamp-2">{issue.issue_summary}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {issue.location || "Unknown location"} • {issue.sector || "other"}
                    </p>
                  </div>
                  <Badge variant={matchLabel === "Assigned" ? "default" : matchLabel === "Suggested" ? "secondary" : "outline"}>
                    {matchLabel}
                  </Badge>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Best volunteer</p>
                    <p className="text-sm font-semibold mt-1">
                      {assignedVolunteer?.name || recommendedVolunteer?.volunteer.name || "No volunteer available"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{matchReason}</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Backup volunteer</p>
                    <p className="text-sm font-semibold mt-1">
                      {backupVolunteer?.volunteer.name || "No backup volunteer"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {backupVolunteer
                        ? `${(backupVolunteer.volunteer.skills || []).slice(0, 3).join(", ") || "No skills listed"}`
                        : "No alternate match found"}
                    </p>
                  </div>
                </div>

                {issue.assignment_reason && (
                  <p className="text-xs text-muted-foreground italic">Existing assignment note: {issue.assignment_reason}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Section 2 — Priority Issues Table */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Priority Issues (Top 10)</h2>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Rank</TableHead>
                <TableHead>Issue Summary</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No issues found. Run the agents first.</TableCell>
                </TableRow>
              ) : (
                issues.map((issue, idx) => (
                  <TableRow key={issue.id}>
                    <TableCell className="text-muted-foreground font-mono text-sm">#{idx + 1}</TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm line-clamp-2">{issue.issue_summary}</p>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-xs font-medium">{issue.sector || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono text-sm font-semibold ${(issue.priority_score || 0) > 7 ? "text-destructive" : (issue.priority_score || 0) >= 4 ? "text-amber-600" : "text-primary"}`}>
                        {(issue.priority_score || 0).toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{issue.location || "—"}</TableCell>
                    <TableCell className="text-xs">
                      <div className="space-y-1">
                        <p>{getVolName(issue.assigned_volunteer_id)}</p>
                        {!issue.assigned_volunteer_id && getRecommendedVolunteer(issue.id)?.recommendedVolunteer && (
                          <p className="text-[11px] text-muted-foreground">
                            Suggested: {getRecommendedVolunteer(issue.id)?.recommendedVolunteer?.volunteer.name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs capitalize">{issue.status || "unassigned"}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Section 3 — Sector breakdown */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Sector Breakdown</h2>
          {sectorData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm border rounded-lg">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sectorData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                  {sectorData.map((entry) => (
                    <Cell key={entry.name} fill={SECTOR_COLORS[entry.name] || SECTOR_COLORS.other} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Section 5 — Alerts */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Alerts from Last Run</h2>
          {alerts.length === 0 ? (
            <div className="text-sm text-muted-foreground italic py-4">No alerts from last run.</div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert: any, i: number) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted">
                  <SeverityIcon severity={alert.severity} />
                  <p className="text-xs text-foreground">{alert.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 4 — Volunteer Deployment */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Volunteer Deployment</h2>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Volunteer Name</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Assigned Issues</TableHead>
                <TableHead>Zone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {volunteers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No active volunteers.</TableCell>
                </TableRow>
              ) : (
                volunteers.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium text-sm">{v.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(v.skills || []).map((s) => (
                          <span key={s} className="text-xs bg-muted px-1.5 py-0.5 rounded capitalize">{s}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{assignedCounts[v.id] || 0}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{v.zone || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
