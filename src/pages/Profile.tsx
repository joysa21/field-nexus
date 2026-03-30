import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import {
  getProfileByUserId,
  updateIndividualProfile,
  updateNgoProfile,
} from "@/services/impactService";

export default function Profile() {
  const { userId: routeUserId } = useParams();
  const { userId: authUserId } = useAuthProfile();

  const activeUserId = routeUserId || authUserId;
  const isOwnProfile = !routeUserId || routeUserId === authUserId;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const refresh = async () => {
    if (!activeUserId) return;

    setLoading(true);
    try {
      const payload = await getProfileByUserId(activeUserId);
      setData(payload);
      setForm({
        display_name: payload.profile?.display_name || "",
        location: payload.profile?.location || "",
        contact_info: payload.profile?.contact_info || "",
        ngo_name: payload.ngoProfile?.ngo_name || "",
        description: payload.ngoProfile?.description || "",
        sector: payload.ngoProfile?.sector || "",
        full_name: payload.individualProfile?.full_name || "",
        skills: (payload.individualProfile?.skills || []).join(", "),
        interests: (payload.individualProfile?.interests || []).join(", "),
        availability: payload.individualProfile?.availability || "",
      });
    } catch (error: any) {
      toast.error(error.message || "Could not load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [activeUserId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!data?.profile || !activeUserId) return;

    try {
      if (data.profile.role === "ngo") {
        await updateNgoProfile(activeUserId, {
          ngo_name: form.ngo_name,
          description: form.description,
          sector: form.sector,
          location: form.location,
          contact_info: form.contact_info,
        });
      } else {
        await updateIndividualProfile(activeUserId, {
          full_name: form.full_name,
          skills: form.skills,
          interests: form.interests,
          location: form.location,
          availability: form.availability,
          contact_info: form.contact_info,
        });
      }

      setEditing(false);
      toast.success("Profile updated.");
      refresh();
    } catch (error: any) {
      toast.error(error.message || "Could not update profile.");
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card><CardContent className="py-8 text-center text-muted-foreground">Loading profile...</CardContent></Card>
      </div>
    );
  }

  if (!data?.profile) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card><CardContent className="py-8 text-center text-muted-foreground">Profile not found.</CardContent></Card>
      </div>
    );
  }

  const role = data.profile.role;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{data.profile.display_name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{data.profile.location || "Location not set"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{role === "ngo" ? "NGO" : "Individual"}</Badge>
              <Badge variant="outline">{data.profile.verification_status}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isOwnProfile && (
            <Button variant="outline" size="sm" onClick={() => setEditing((prev) => !prev)}>
              {editing ? "Cancel" : "Edit profile"}
            </Button>
          )}
        </CardContent>
      </Card>

      {editing && isOwnProfile && (
        <Card>
          <CardHeader><CardTitle className="text-base">Edit profile</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
              {role === "ngo" ? (
                <>
                  <Input value={form.ngo_name || ""} onChange={(e) => setForm((prev) => ({ ...prev, ngo_name: e.target.value }))} placeholder="NGO name" />
                  <Input value={form.sector || ""} onChange={(e) => setForm((prev) => ({ ...prev, sector: e.target.value }))} placeholder="Sector" />
                  <Textarea className="md:col-span-2" value={form.description || ""} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description" />
                </>
              ) : (
                <>
                  <Input value={form.full_name || ""} onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))} placeholder="Full name" />
                  <Input value={form.availability || ""} onChange={(e) => setForm((prev) => ({ ...prev, availability: e.target.value }))} placeholder="Availability" />
                  <Input className="md:col-span-2" value={form.skills || ""} onChange={(e) => setForm((prev) => ({ ...prev, skills: e.target.value }))} placeholder="Skills (comma separated)" />
                  <Input className="md:col-span-2" value={form.interests || ""} onChange={(e) => setForm((prev) => ({ ...prev, interests: e.target.value }))} placeholder="Interests (comma separated)" />
                </>
              )}

              <Input value={form.location || ""} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} placeholder="Location" />
              <Input value={form.contact_info || ""} onChange={(e) => setForm((prev) => ({ ...prev, contact_info: e.target.value }))} placeholder="Contact info" />
              <div className="md:col-span-2">
                <Button type="submit">Save profile</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Active NGO Requests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests yet.</p>
            ) : (
              data.requests.map((request: any) => (
                <div key={request.id} className="border rounded-md p-3">
                  <p className="font-medium text-sm">{request.title}</p>
                  <p className="text-xs text-muted-foreground">{request.status} · {request.category}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Active Volunteer Offers</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.offers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No offers yet.</p>
            ) : (
              data.offers.map((offer: any) => (
                <div key={offer.id} className="border rounded-md p-3">
                  <p className="font-medium text-sm">{offer.title}</p>
                  <p className="text-xs text-muted-foreground">{offer.status} · {offer.mode}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
