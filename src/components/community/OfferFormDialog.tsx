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

export interface OfferFormValues {
  title: string;
  description: string;
  skills: string;
  availability: string;
  preferredCauses: string;
  location: string;
  mode: "remote" | "on_ground" | "hybrid";
  contactMethod: string;
}

const INITIAL_STATE: OfferFormValues = {
  title: "",
  description: "",
  skills: "",
  availability: "",
  preferredCauses: "",
  location: "",
  mode: "remote",
  contactMethod: "",
};

interface OfferFormDialogProps {
  onSubmit: (values: OfferFormValues) => Promise<void>;
  triggerLabel?: string;
  title?: string;
}

export function OfferFormDialog({
  onSubmit,
  triggerLabel = "New Offer",
  title = "Create Volunteer Offer",
}: OfferFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<OfferFormValues>(INITIAL_STATE);

  const update = <K extends keyof OfferFormValues>(key: K, value: OfferFormValues[K]) => {
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
        <Button variant="secondary">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Share your availability and skills so NGOs can connect quickly.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Title" value={values.title} onChange={(e) => update("title", e.target.value)} />
          <Input placeholder="Location" value={values.location} onChange={(e) => update("location", e.target.value)} />
          <Textarea className="md:col-span-2" placeholder="Description" value={values.description} onChange={(e) => update("description", e.target.value)} />
          <Input placeholder="Skills (comma separated)" value={values.skills} onChange={(e) => update("skills", e.target.value)} />
          <Input placeholder="Availability" value={values.availability} onChange={(e) => update("availability", e.target.value)} />
          <Input className="md:col-span-2" placeholder="Preferred causes (comma separated)" value={values.preferredCauses} onChange={(e) => update("preferredCauses", e.target.value)} />

          <Select value={values.mode} onValueChange={(value: OfferFormValues["mode"]) => update("mode", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Remote or on-ground" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="on_ground">On-ground</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>

          <Input placeholder="Contact method" value={values.contactMethod} onChange={(e) => update("contactMethod", e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !values.title || !values.description}>
            {saving ? "Saving..." : "Publish Offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
