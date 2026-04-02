import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, UserPlus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateSkill } from "@/lib/i18n";

interface Volunteer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  skills: string[] | null;
  zone: string | null;
  availability_hours_per_week: number | null;
  is_active: boolean | null;
}

const ALL_SKILLS = ["healthcare", "water", "electricity", "sanitation", "food", "education", "shelter", "safety", "logistics", "counseling"];

const SKILL_COLORS: Record<string, string> = {
  healthcare: "bg-red-100 text-red-700",
  water: "bg-teal-100 text-teal-700",
  electricity: "bg-amber-100 text-amber-700",
  food: "bg-green-100 text-green-700",
  education: "bg-blue-100 text-blue-700",
  shelter: "bg-purple-100 text-purple-700",
  sanitation: "bg-orange-100 text-orange-700",
  safety: "bg-rose-100 text-rose-700",
  logistics: "bg-slate-100 text-slate-700",
  counseling: "bg-pink-100 text-pink-700",
};

const DEMO_VOLUNTEERS = [
  { name: "Aisha Patel", email: "aisha@ngo.org", zone: "North", skills: ["healthcare", "counseling"], availability_hours_per_week: 20 },
  { name: "Carlos Rivera", email: "carlos@ngo.org", zone: "South", skills: ["water", "sanitation", "logistics"], availability_hours_per_week: 15 },
  { name: "Priya Nair", email: "priya@ngo.org", zone: "East", skills: ["education", "food"], availability_hours_per_week: 10 },
  { name: "James Osei", email: "james@ngo.org", zone: "West", skills: ["electricity", "shelter", "safety"], availability_hours_per_week: 25 },
  { name: "Fatima Al-Hassan", email: "fatima@ngo.org", zone: "Central", skills: ["healthcare", "food", "logistics"], availability_hours_per_week: 18 },
];

const DIRECTORY_VOLUNTEER_FALLBACK: Volunteer[] = [
  {
    id: "fallback-vol-1",
    name: "Anita Sharma",
    email: "anita@example.org",
    phone: "+91 98765 12345",
    skills: ["counseling", "healthcare"],
    zone: "Delhi",
    availability_hours_per_week: 8,
    is_active: true,
  },
  {
    id: "fallback-vol-2",
    name: "Rohan Mehta",
    email: "rohan@example.org",
    phone: "+91 91234 56789",
    skills: ["education", "logistics"],
    zone: "Mumbai",
    availability_hours_per_week: 12,
    is_active: true,
  },
  {
    id: "fallback-vol-3",
    name: "Meera Iyer",
    email: "meera@example.org",
    phone: "+91 90011 22334",
    skills: ["community outreach", "content creation"],
    zone: "Bengaluru",
    availability_hours_per_week: 10,
    is_active: true,
  },
];

const defaultForm = { name: "", email: "", phone: "", zone: "", availability_hours_per_week: 10, skills: [] as string[], is_active: true };

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [assignedCounts, setAssignedCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { language, t } = useLanguage();

  const fetchData = async () => {
    setLoading(true);
    const [volRes, issuesRes] = await Promise.all([
      supabase.from("volunteers").select("*").order("created_at", { ascending: false }),
      supabase.from("issues").select("assigned_volunteer_id").not("assigned_volunteer_id", "is", null),
    ]);
    const fetched = (volRes.data || []) as Volunteer[];
    setVolunteers(fetched.length > 0 ? fetched : DIRECTORY_VOLUNTEER_FALLBACK);
    const counts: Record<string, number> = {};
    (issuesRes.data || []).forEach((i) => {
      if (i.assigned_volunteer_id) counts[i.assigned_volunteer_id] = (counts[i.assigned_volunteer_id] || 0) + 1;
    });
    setAssignedCounts(counts);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.name.trim() || !form.zone.trim()) {
      toast.error(t("volunteers.nameRequired"));
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("volunteers").insert({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      zone: form.zone,
      availability_hours_per_week: form.availability_hours_per_week,
      skills: form.skills,
      is_active: form.is_active,
    });
    if (error) {
      toast.error(t("volunteers.saveFailed", { message: error.message }));
    } else {
      toast.success(t("volunteers.added"));
      setForm(defaultForm);
      setOpen(false);
      await fetchData();
    }
    setSaving(false);
  };

  const handleSeed = async () => {
    setSeeding(true);
    const { error } = await supabase.from("volunteers").insert(DEMO_VOLUNTEERS);
    if (error) toast.error(t("volunteers.seedFailed", { message: error.message }));
    else { toast.success(t("volunteers.sampleAdded")); await fetchData(); }
    setSeeding(false);
  };

  const toggleSkill = (skill: string) => {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(skill) ? f.skills.filter((s) => s !== skill) : [...f.skills, skill],
    }));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("volunteers.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("volunteers.registered", { count: volunteers.length })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
            {seeding ? t("volunteers.seeding") : t("volunteers.seedSampleVolunteers")}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> {t("volunteers.addVolunteer")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> {t("volunteers.addVolunteer")}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t("volunteers.nameRequired")}</Label>
                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t("auth.fullName")} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("volunteers.zone")}</Label>
                    <Input value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))} placeholder="e.g. North" />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("volunteers.email")}</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@org.com" />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("volunteers.phone")}</Label>
                    <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+1 234 567 890" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t("volunteers.availability")}</Label>
                  <Input type="number" min={1} max={80} value={form.availability_hours_per_week} onChange={(e) => setForm((f) => ({ ...f, availability_hours_per_week: +e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("volunteers.skillLabel")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_SKILLS.map((skill) => (
                      <label key={skill} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={form.skills.includes(skill)} onCheckedChange={() => toggleSkill(skill)} />
                        <span className="capitalize">{translateSkill(language, skill)}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
                  <Label>{t("volunteers.activeToggle")}</Label>
                </div>
                <Button className="w-full" onClick={handleSave} disabled={saving}>
                  {saving ? t("common.loading") : t("volunteers.saveVolunteer")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-16">{t("volunteers.loading")}</div>
      ) : volunteers.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          {t("volunteers.noVolunteersYet")}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {volunteers.map((v) => (
            <div key={v.id} className="bg-card border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm text-foreground">{v.name}</p>
                  <p className="text-xs text-muted-foreground">{v.zone || "—"}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                  {v.is_active ? t("volunteers.active") : t("volunteers.inactive")}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(v.skills || []).map((skill) => (
                  <span key={skill} className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${SKILL_COLORS[skill] || "bg-muted text-muted-foreground"}`}>
                    {translateSkill(language, skill)}
                  </span>
                ))}
                {(!v.skills || v.skills.length === 0) && <span className="text-xs text-muted-foreground">{t("volunteers.noSkillsListed")}</span>}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("volunteers.hoursPerWeek", { hours: v.availability_hours_per_week || 10 })}</span>
                <span>{t("volunteers.assignedIssues", { count: assignedCounts[v.id] || 0 })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
