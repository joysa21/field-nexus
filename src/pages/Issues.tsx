import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Users } from "lucide-react";

interface Issue {
  id: string;
  issue_summary: string | null;
  sector: string | null;
  location: string | null;
  affected_count: number | null;
  priority_score: number | null;
  status: string | null;
  assigned_volunteer_id: string | null;
  assignment_reason: string | null;
}

interface Volunteer {
  id: string;
  name: string;
}

const DEMO_ISSUES: Issue[] = [
  {
    id: "demo-issue-1",
    issue_summary: "Drinking water shortage in Rampur for 5 days. Immediate tanker support needed.",
    sector: "water",
    location: "Rampur",
    affected_count: 220,
    priority_score: 9.1,
    status: "unassigned",
    assigned_volunteer_id: null,
    assignment_reason: null,
  },
  {
    id: "demo-issue-2",
    issue_summary: "Primary health center in Meerut is low on antibiotics and first-aid supplies.",
    sector: "healthcare",
    location: "Meerut",
    affected_count: 480,
    priority_score: 8.4,
    status: "assigned",
    assigned_volunteer_id: null,
    assignment_reason: "Awaiting NGO assignment sync",
  },
  {
    id: "demo-issue-3",
    issue_summary: "Flood-affected families in Dibrugarh need temporary shelter kits and dry food.",
    sector: "shelter",
    location: "Dibrugarh",
    affected_count: 75,
    priority_score: 8.9,
    status: "unassigned",
    assigned_volunteer_id: null,
    assignment_reason: null,
  },
  {
    id: "demo-issue-4",
    issue_summary: "School sanitation units in Kharagpur are damaged and require urgent repairs.",
    sector: "sanitation",
    location: "Kharagpur",
    affected_count: 160,
    priority_score: 7.2,
    status: "resolved",
    assigned_volunteer_id: null,
    assignment_reason: "Resolved by local sanitation task force",
  },
];

const SECTOR_COLORS: Record<string, string> = {
  water: "bg-teal-100 text-teal-700 border-teal-200",
  healthcare: "bg-red-100 text-red-700 border-red-200",
  electricity: "bg-amber-100 text-amber-700 border-amber-200",
  food: "bg-green-100 text-green-700 border-green-200",
  education: "bg-blue-100 text-blue-700 border-blue-200",
  shelter: "bg-purple-100 text-purple-700 border-purple-200",
  sanitation: "bg-orange-100 text-orange-700 border-orange-200",
  safety: "bg-rose-100 text-rose-700 border-rose-200",
  logistics: "bg-slate-100 text-slate-700 border-slate-200",
  counseling: "bg-pink-100 text-pink-700 border-pink-200",
};

const STATUS_COLORS: Record<string, string> = {
  unassigned: "bg-muted text-muted-foreground",
  assigned: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
};

function PriorityBar({ score }: { score: number }) {
  const color = score > 7 ? "bg-destructive" : score >= 4 ? "bg-amber-500" : "bg-primary";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
      <span className={`text-xs font-mono font-medium tabular-nums ${score > 7 ? "text-destructive" : score >= 4 ? "text-amber-600" : "text-primary"}`}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

export default function Issues() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [sectorFilter, setSectorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [issuesRes, volRes] = await Promise.all([
        supabase.from("issues").select("*"),
        supabase.from("volunteers").select("id, name"),
      ]);

      const dbIssues = (issuesRes.data || []) as Issue[];
      setIssues(dbIssues.length > 0 ? dbIssues : DEMO_ISSUES);
      setVolunteers((volRes.data || []) as Volunteer[]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const sectors = [...new Set(issues.map((i) => i.sector).filter(Boolean))] as string[];

  const filtered = issues
    .filter((i) => sectorFilter === "all" || i.sector === sectorFilter)
    .filter((i) => statusFilter === "all" || i.status === statusFilter)
    .sort((a, b) => {
      if (sortBy === "priority") return (b.priority_score || 0) - (a.priority_score || 0);
      return new Date(b.id).getTime() - new Date(a.id).getTime();
    });

  const getVolunteerName = (id: string | null) =>
    id ? volunteers.find((v) => v.id === id)?.name || "Unknown" : null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Issues</h1>
        <p className="text-muted-foreground text-sm mt-1">{filtered.length} issues found</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sector" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sectors</SelectItem>
            {sectors.map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">Priority Score ↓</SelectItem>
            <SelectItem value="newest">Newest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center text-muted-foreground py-16">Loading issues…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 space-y-2">
          <p className="text-muted-foreground text-sm">No issues yet.</p>
          <p className="text-muted-foreground/60 text-xs">Run the agents to extract issues from a field report.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((issue) => {
            const volunteerName = getVolunteerName(issue.assigned_volunteer_id);
            return (
              <div key={issue.id} className="bg-card border rounded-lg p-4 space-y-3 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${SECTOR_COLORS[issue.sector || ""] || "bg-muted text-muted-foreground border-border"}`}>
                    {issue.sector || "other"}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[issue.status || "unassigned"] || STATUS_COLORS.unassigned}`}>
                    {issue.status || "unassigned"}
                  </span>
                </div>

                <p className="text-sm font-semibold text-foreground leading-snug">{issue.issue_summary}</p>

                <PriorityBar score={issue.priority_score || 0} />

                <div className="space-y-1">
                  {(issue.location || issue.affected_count) && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {issue.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {issue.location}
                        </span>
                      )}
                      {issue.affected_count && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {issue.affected_count.toLocaleString()} affected
                        </span>
                      )}
                    </div>
                  )}
                  {volunteerName && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        👤 {volunteerName}
                      </span>
                    </div>
                  )}
                  {issue.assignment_reason && (
                    <p className="text-xs text-muted-foreground italic">{issue.assignment_reason}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
