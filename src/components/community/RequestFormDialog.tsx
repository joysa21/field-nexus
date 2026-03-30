import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface RequestFormValues {
  title: string;
  description: string;
  category: string;
  urgency: "low" | "medium" | "high" | "critical";
  location: string;
  volunteersNeeded: number;
  skillsNeeded: string;
  deadline: string;
  contactMethod: string;
}

const INITIAL_STATE: RequestFormValues = {
  title: "",
  description: "",
  category: "",
  urgency: "medium",
  location: "",
  volunteersNeeded: 1,
  skillsNeeded: "",
  deadline: "",
  contactMethod: "",
};

interface RequestFormDialogProps {
  onSubmit: (values: RequestFormValues) => Promise<void>;
  triggerLabel?: string;
  title?: string;
}

export function RequestFormDialog({
  onSubmit,
  triggerLabel = "New Request",
  title = "Create NGO Request",
}: RequestFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<RequestFormValues>(INITIAL_STATE);

  const update = <K extends keyof RequestFormValues>(key: K, value: RequestFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    setSaving(true);
    try {
      await onSubmit(values);
      setValues(INITIAL_STATE);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Publish a clear request so volunteers can quickly respond.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Title" value={values.title} onChange={(e) => update("title", e.target.value)} />
          <Input placeholder="Category" value={values.category} onChange={(e) => update("category", e.target.value)} />
          <Textarea className="md:col-span-2" placeholder="Description" value={values.description} onChange={(e) => update("description", e.target.value)} />

          <Select value={values.urgency} onValueChange={(value: RequestFormValues["urgency"]) => update("urgency", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Urgency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          <Input placeholder="Location" value={values.location} onChange={(e) => update("location", e.target.value)} />
          <Input
            type="number"
            min={1}
            placeholder="Volunteers needed"
            value={values.volunteersNeeded}
            onChange={(e) => update("volunteersNeeded", Number(e.target.value || 1))}
          />
          <Input placeholder="Skills needed (comma separated)" value={values.skillsNeeded} onChange={(e) => update("skillsNeeded", e.target.value)} />
          <Input type="date" value={values.deadline} onChange={(e) => update("deadline", e.target.value)} />
          <Input className="md:col-span-2" placeholder="Contact method" value={values.contactMethod} onChange={(e) => update("contactMethod", e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !values.title || !values.description}>
            {saving ? "Saving..." : "Publish Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
