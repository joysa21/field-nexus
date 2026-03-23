import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, Users, ListChecks, Unlink } from "lucide-react";

const DEMO_VOLUNTEERS = [
  { name: "Aisha Patel", email: "aisha@ngo.org", zone: "North", skills: ["healthcare", "counseling"], availability_hours_per_week: 20 },
  { name: "Carlos Rivera", email: "carlos@ngo.org", zone: "South", skills: ["water", "sanitation", "logistics"], availability_hours_per_week: 15 },
  { name: "Priya Nair", email: "priya@ngo.org", zone: "East", skills: ["education", "food"], availability_hours_per_week: 10 },
  { name: "James Osei", email: "james@ngo.org", zone: "West", skills: ["electricity", "shelter", "safety"], availability_hours_per_week: 25 },
  { name: "Fatima Al-Hassan", email: "fatima@ngo.org", zone: "Central", skills: ["healthcare", "food", "logistics"], availability_hours_per_week: 18 },
];

const DEMO_ISSUES = [
  { issue_summary: "Village of Rampur has had no clean water for 6 days, affecting ~200 families.", sector: "water", location: "Rampur", affected_count: 200, priority_score: 9.2, urgency_score: 9.5, status: "unassigned" },
  { issue_summary: "Local health clinic in Meerut is out of essential medicines.", sector: "healthcare", location: "Meerut", affected_count: 500, priority_score: 8.7, urgency_score: 9.0, status: "unassigned" },
  { issue_summary: "Power outage in Sundarbans affecting cold storage for food supplies.", sector: "electricity", location: "Sundarbans", affected_count: 300, priority_score: 7.5, urgency_score: 7.8, status: "unassigned" },
  { issue_summary: "Open sewage near primary school causing disease risk.", sector: "sanitation", location: "Kharagpur", affected_count: 150, priority_score: 8.1, urgency_score: 8.3, status: "unassigned" },
  { issue_summary: "40 families displaced after flooding, need temporary shelter.", sector: "shelter", location: "Dibrugarh", affected_count: 40, priority_score: 9.0, urgency_score: 9.2, status: "unassigned" },
  { issue_summary: "School children without meals for 3 days after supply chain disruption.", sector: "food", location: "Guwahati", affected_count: 600, priority_score: 7.3, urgency_score: 7.5, status: "unassigned" },
  { issue_summary: "Trauma counseling needed after landslide in hill district.", sector: "healthcare", location: "Darjeeling", affected_count: 80, priority_score: 6.8, urgency_score: 7.0, status: "unassigned" },
  { issue_summary: "Rural school destroyed, 120 children without education access.", sector: "education", location: "Bankura", affected_count: 120, priority_score: 5.5, urgency_score: 5.0, status: "unassigned" },
];

interface Stats {
  totalIssues: number;
  criticalIssues: number;
  activeVolunteers: number;
  unassignedIssues: number;
}

interface SectorData {
  sector: string;
  count: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ totalIssues: 0, criticalIssues: 0, activeVolunteers: 0, unassignedIssues: 0 });
  const [sectorData, setSectorData] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    const [issuesRes, volunteersRes] = await Promise.all([
      supabase.from("issues").select("priority_score, status, sector"),
      supabase.from("volunteers").select("is_active"),
    ]);

    const issues = issuesRes.data || [];
    const volunteers = volunteersRes.data || [];

    const sectorMap: Record<string, number> = {};
    issues.forEach((i) => {
      const s = i.sector || "other";
      sectorMap[s] = (sectorMap[s] || 0) + 1;
    });

    setStats({
      totalIssues: issues.length,
      criticalIssues: issues.filter((i) => (i.priority_score || 0) > 7).length,
      activeVolunteers: volunteers.filter((v) => v.is_active).length,
      unassignedIssues: issues.filter((i) => i.status === "unassigned").length,
    });

    setSectorData(Object.entries(sectorMap).map(([sector, count]) => ({ sector, count })));
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const loadDemoData = async () => {
    setSeeding(true);
    try {
      const { error: vErr } = await supabase.from("volunteers").insert(DEMO_VOLUNTEERS);
      if (vErr) throw vErr;
      const { error: iErr } = await supabase.from("issues").insert(DEMO_ISSUES);
      if (iErr) throw iErr;
      toast.success("Demo data loaded — 5 volunteers & 8 issues added!");
      await fetchStats();
    } catch (e: any) {
      toast.error("Failed to load demo data: " + e.message);
    } finally {
      setSeeding(false);
    }
  };

  const statCards = [
    { label: "Total Issues", value: stats.totalIssues, icon: ListChecks, color: "text-primary" },
    { label: "Critical Issues", value: stats.criticalIssues, icon: AlertTriangle, color: "text-destructive" },
    { label: "Active Volunteers", value: stats.activeVolunteers, icon: Users, color: "text-blue-600" },
    { label: "Unassigned Issues", value: stats.unassignedIssues, icon: Unlink, color: "text-amber-500" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Field coordination overview</p>
        </div>
        <Button onClick={loadDemoData} disabled={seeding} variant="outline" size="sm">
          {seeding ? "Loading…" : "Load Demo Data"}
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</p>
                  <p className={`text-3xl font-bold mt-1 ${color}`}>
                    {loading ? "—" : value}
                  </p>
                </div>
                <Icon className={`w-8 h-8 ${color} opacity-20`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sector bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issues by Sector</CardTitle>
        </CardHeader>
        <CardContent>
          {sectorData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              No issues yet. Load demo data or run the agents.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sectorData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="sector"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
