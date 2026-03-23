import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

interface Issue {
  id: string;
  issue_summary: string | null;
  sector: string | null;
  location: string | null;
  priority_score: number | null;
  status: string | null;
  assigned_volunteer_id: string | null;
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

export default function ActionPlan() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [lastRun, setLastRun] = useState<AgentRun | null>(null);
  const [assignedCounts, setAssignedCounts] = useState<Record<string, number>>({});

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
                    <TableCell className="text-xs">{getVolName(issue.assigned_volunteer_id)}</TableCell>
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
