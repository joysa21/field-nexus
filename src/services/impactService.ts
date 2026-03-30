import { supabase } from "@/integrations/supabase/client";
import { getMockSession, isMockAuthEnabled, setMockSession } from "@/lib/mockAuth";
import { VOLUNTEER_DOMAINS } from "@/lib/volunteerDomains";
import type {
  CommunityPost,
  CommunityPostType,
  ConnectionResponse,
  NotificationItem,
  UserRole,
} from "@/types/impact";

type SessionLikeUser = {
  id: string;
  email: string | null;
};

const MOCK_NGO_DIRECTORY = [
  {
    id: "ngo-1",
    role: "ngo" as const,
    display_name: "SilverCare Foundation",
    location: "Delhi",
    contact_info: "contact@silvercare.org",
    verification_status: "verified" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    details: {
      description: "Supports senior citizens with weekly health camps and home visits.",
      sector: "Old Age Support",
      contact_info: "contact@silvercare.org",
    },
  },
  {
    id: "ngo-2",
    role: "ngo" as const,
    display_name: "Bright Futures Trust",
    location: "Mumbai",
    contact_info: "hello@brightfutures.org",
    verification_status: "verified" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    details: {
      description: "Runs after-school and nutrition programs for underserved children.",
      sector: "Children Welfare",
      contact_info: "hello@brightfutures.org",
    },
  },
  {
    id: "ngo-3",
    role: "ngo" as const,
    display_name: "Rapid Relief Collective",
    location: "Bengaluru",
    contact_info: "ops@rapidrelief.org",
    verification_status: "pending" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    details: {
      description: "Coordinates volunteer response during floods and local emergencies.",
      sector: "Disaster Management",
      contact_info: "ops@rapidrelief.org",
    },
  },
  {
    id: "ngo-4",
    role: "ngo" as const,
    display_name: "HealthReach Network",
    location: "Pune",
    contact_info: "team@healthreach.org",
    verification_status: "verified" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    details: {
      description: "Organizes preventive healthcare and awareness drives in urban slums.",
      sector: "Healthcare Outreach",
      contact_info: "team@healthreach.org",
    },
  },
  {
    id: "ngo-5",
    role: "ngo" as const,
    display_name: "LearnForward Initiative",
    location: "Hyderabad",
    contact_info: "volunteer@learnforward.org",
    verification_status: "verified" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    details: {
      description: "Builds digital and foundational learning opportunities for youth.",
      sector: "Education Support",
      contact_info: "volunteer@learnforward.org",
    },
  },
];

const MOCK_VOLUNTEER_DIRECTORY = [
  {
    id: "vol-1",
    role: "individual" as const,
    display_name: "Anita Sharma",
    location: "Delhi",
    contact_info: "anita@example.org",
    verification_status: "verified" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    details: {
      skills: ["counseling", "first aid"],
      interests: ["Old Age Support", "Healthcare Outreach"],
      availability: "Weekends",
    },
  },
  {
    id: "vol-2",
    role: "individual" as const,
    display_name: "Rohan Mehta",
    location: "Mumbai",
    contact_info: "rohan@example.org",
    verification_status: "pending" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    details: {
      skills: ["teaching", "event coordination"],
      interests: ["Children Welfare", "Education Support"],
      availability: "Evenings",
    },
  },
];

const splitList = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const buildOwnerMap = async () => {
  const { data } = await supabase
    .from("profiles")
    .select("id, role, display_name");

  const ownerMap = new Map<string, { role: UserRole; name: string }>();
  (data || []).forEach((profile) => {
    ownerMap.set(profile.id, {
      role: profile.role,
      name: profile.display_name,
    });
  });

  return ownerMap;
};

export async function getCurrentSessionUser() {
  if (isMockAuthEnabled()) {
    const session = getMockSession();
    if (!session) return null;
    return {
      id: session.id,
      email: session.email,
    } as SessionLikeUser;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user as SessionLikeUser | null;
}

export async function getMyProfile() {
  const user = await getCurrentSessionUser();
  if (!user) return null;

  if (isMockAuthEnabled()) {
    const session = getMockSession();
    if (!session) return null;

    return {
      id: session.id,
      role: session.role,
      display_name: session.displayName,
      location: null,
      contact_info: session.email,
      verification_status: "unverified",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function ensureProfileForCurrentUser(role: UserRole, displayName: string) {
  const user = await getCurrentSessionUser();
  if (!user) throw new Error("No authenticated user found.");

  if (isMockAuthEnabled()) {
    const session = setMockSession({
      email: user.email || "user@example.org",
      displayName,
      role,
      volunteeringDomain: VOLUNTEER_DOMAINS[0],
      availableForNgo: false,
    });

    return {
      id: session.id,
      role: session.role,
      display_name: session.displayName,
      location: null,
      contact_info: session.email,
      verification_status: "unverified",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        role,
        display_name: displayName || user.email?.split("@")[0] || "User",
        contact_info: user.email || null,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (profileError) throw profileError;

  if (role === "ngo") {
    const { error } = await supabase.from("ngo_profiles").upsert(
      {
        user_id: user.id,
        ngo_name: displayName || "New NGO",
        contact_info: user.email || null,
      },
      { onConflict: "user_id" },
    );

    if (error) throw error;
  } else {
    const { error } = await supabase.from("individual_profiles").upsert(
      {
        user_id: user.id,
        full_name: displayName || "New Volunteer",
        contact_info: user.email || null,
      },
      { onConflict: "user_id" },
    );

    if (error) throw error;
  }

  return profile;
}

export async function getCommunityFeed() {
  const [ownerMap, requestsResult, offersResult] = await Promise.all([
    buildOwnerMap(),
    supabase
      .from("ngo_requests")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("volunteer_offers")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  if (requestsResult.error) throw requestsResult.error;
  if (offersResult.error) throw offersResult.error;

  const requestPosts: CommunityPost[] = (requestsResult.data || []).map((request) => {
    const owner = ownerMap.get(request.owner_id);
    return {
      id: request.id,
      postType: "ngo_request",
      ownerId: request.owner_id,
      title: request.title,
      description: request.description,
      category: request.category,
      urgency: request.urgency,
      location: request.location || "Not specified",
      status: request.status,
      createdAt: request.created_at,
      ownerName: owner?.name || "Unknown",
      ownerRole: owner?.role || "ngo",
    };
  });

  const offerPosts: CommunityPost[] = (offersResult.data || []).map((offer) => {
    const owner = ownerMap.get(offer.owner_id);
    return {
      id: offer.id,
      postType: "volunteer_offer",
      ownerId: offer.owner_id,
      title: offer.title,
      description: offer.description,
      category: (offer.preferred_causes || ["General"])[0] || "General",
      urgency: "normal",
      location: offer.location || "Not specified",
      status: offer.status,
      createdAt: offer.created_at,
      ownerName: owner?.name || "Unknown",
      ownerRole: owner?.role || "individual",
    };
  });

  return [...requestPosts, ...offerPosts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function createNgoRequest(payload: {
  title: string;
  description: string;
  category: string;
  urgency: "low" | "medium" | "high" | "critical";
  location: string;
  volunteersNeeded: number;
  skillsNeeded: string;
  deadline?: string;
  contactMethod: string;
}) {
  const user = await getCurrentSessionUser();
  if (!user) throw new Error("Please sign in first.");

  const { error } = await supabase.from("ngo_requests").insert({
    owner_id: user.id,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    urgency: payload.urgency,
    location: payload.location,
    volunteers_needed: payload.volunteersNeeded,
    skills_needed: splitList(payload.skillsNeeded),
    deadline: payload.deadline || null,
    contact_method: payload.contactMethod,
  });

  if (error) throw error;
}

export async function updateNgoRequest(
  id: string,
  patch: Partial<{
    title: string;
    description: string;
    category: string;
    urgency: "low" | "medium" | "high" | "critical";
    location: string;
    volunteers_needed: number;
    skills_needed: string[];
    deadline: string | null;
    contact_method: string;
    status: string;
  }>,
) {
  const { error } = await supabase.from("ngo_requests").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteNgoRequest(id: string) {
  const { error } = await supabase.from("ngo_requests").delete().eq("id", id);
  if (error) throw error;
}

export async function createVolunteerOffer(payload: {
  title: string;
  description: string;
  skills: string;
  availability: string;
  preferredCauses: string;
  location: string;
  mode: "remote" | "on_ground" | "hybrid";
  contactMethod: string;
}) {
  const user = await getCurrentSessionUser();
  if (!user) throw new Error("Please sign in first.");

  const { error } = await supabase.from("volunteer_offers").insert({
    owner_id: user.id,
    title: payload.title,
    description: payload.description,
    skills: splitList(payload.skills),
    availability: payload.availability,
    preferred_causes: splitList(payload.preferredCauses),
    location: payload.location,
    mode: payload.mode,
    contact_method: payload.contactMethod,
  });

  if (error) throw error;
}

export async function updateVolunteerOffer(
  id: string,
  patch: Partial<{
    title: string;
    description: string;
    skills: string[];
    availability: string;
    preferred_causes: string[];
    location: string;
    mode: "remote" | "on_ground" | "hybrid";
    contact_method: string;
    status: string;
  }>,
) {
  const { error } = await supabase.from("volunteer_offers").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteVolunteerOffer(id: string) {
  const { error } = await supabase.from("volunteer_offers").delete().eq("id", id);
  if (error) throw error;
}

export async function addConnection(payload: {
  requestId?: string;
  offerId?: string;
  receiverId: string;
  message: string;
}) {
  const user = await getCurrentSessionUser();
  if (!user) throw new Error("Please sign in first.");

  const { error } = await supabase.from("connections_or_responses").insert({
    request_id: payload.requestId || null,
    offer_id: payload.offerId || null,
    sender_id: user.id,
    receiver_id: payload.receiverId,
    message: payload.message,
    status: "pending",
  });

  if (error) throw error;
}

export async function getConnectionsForMe() {
  const user = await getCurrentSessionUser();
  if (!user) return [] as ConnectionResponse[];

  const { data, error } = await supabase
    .from("connections_or_responses")
    .select("*")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateConnectionStatus(id: string, status: ConnectionResponse["status"]) {
  const { error } = await supabase
    .from("connections_or_responses")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
}

export async function getComments(postType: CommunityPostType, postId: string) {
  const query = supabase
    .from("post_comments")
    .select("*")
    .eq(postType === "ngo_request" ? "request_id" : "offer_id", postId)
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  const ownerMap = await buildOwnerMap();
  return (data || []).map((comment) => ({
    ...comment,
    author_name: ownerMap.get(comment.author_id)?.name || "Unknown",
    author_role: ownerMap.get(comment.author_id)?.role || "individual",
  }));
}

export async function addComment(postType: CommunityPostType, postId: string, content: string) {
  const user = await getCurrentSessionUser();
  if (!user) throw new Error("Please sign in first.");

  const payload = {
    post_type: postType,
    author_id: user.id,
    content,
    request_id: postType === "ngo_request" ? postId : null,
    offer_id: postType === "volunteer_offer" ? postId : null,
  };

  const { error } = await supabase.from("post_comments").insert(payload);
  if (error) throw error;
}

export async function savePost(postType: CommunityPostType, postId: string) {
  const user = await getCurrentSessionUser();
  if (!user) throw new Error("Please sign in first.");

  const { error } = await supabase.from("saved_posts").upsert(
    {
      user_id: user.id,
      post_type: postType,
      request_id: postType === "ngo_request" ? postId : null,
      offer_id: postType === "volunteer_offer" ? postId : null,
    },
    { onConflict: "user_id,post_type,request_id,offer_id" },
  );

  if (error) throw error;
}

export async function unsavePost(postType: CommunityPostType, postId: string) {
  const user = await getCurrentSessionUser();
  if (!user) throw new Error("Please sign in first.");

  const { error } = await supabase
    .from("saved_posts")
    .delete()
    .eq("user_id", user.id)
    .eq(postType === "ngo_request" ? "request_id" : "offer_id", postId)
    .eq("post_type", postType);

  if (error) throw error;
}

export async function getSavedPosts() {
  const user = await getCurrentSessionUser();
  if (!user) return [] as CommunityPost[];

  const [savedResult, feed] = await Promise.all([
    supabase.from("saved_posts").select("*").eq("user_id", user.id),
    getCommunityFeed(),
  ]);

  if (savedResult.error) throw savedResult.error;

  const savedLookup = new Set(
    (savedResult.data || []).map((saved) =>
      `${saved.post_type}:${saved.request_id || saved.offer_id}`,
    ),
  );

  return feed.filter((post) => savedLookup.has(`${post.postType}:${post.id}`));
}

export async function getNotifications() {
  const user = await getCurrentSessionUser();
  if (!user) return [] as NotificationItem[];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) throw error;
}

export async function getNgoDirectory() {
  if (isMockAuthEnabled()) {
    const session = getMockSession();
    const domain = session?.volunteeringDomain?.toLowerCase() || "";

    const prioritized = [...MOCK_NGO_DIRECTORY].sort((a, b) => {
      const aMatch = a.details.sector.toLowerCase().includes(domain) ? 1 : 0;
      const bMatch = b.details.sector.toLowerCase().includes(domain) ? 1 : 0;
      return bMatch - aMatch;
    });

    return prioritized;
  }

  const [baseProfiles, ngoProfiles] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "ngo"),
    supabase.from("ngo_profiles").select("*"),
  ]);

  if (baseProfiles.error) throw baseProfiles.error;
  if (ngoProfiles.error) throw ngoProfiles.error;

  const ngoMap = new Map((ngoProfiles.data || []).map((ngo) => [ngo.user_id, ngo]));

  return (baseProfiles.data || []).map((profile) => ({
    ...profile,
    details: ngoMap.get(profile.id),
  }));
}

export async function getVolunteerDirectory() {
  if (isMockAuthEnabled()) {
    return MOCK_VOLUNTEER_DIRECTORY;
  }

  const [baseProfiles, individualProfiles] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "individual"),
    supabase.from("individual_profiles").select("*"),
  ]);

  if (baseProfiles.error) throw baseProfiles.error;
  if (individualProfiles.error) throw individualProfiles.error;

  const individualMap = new Map((individualProfiles.data || []).map((person) => [person.user_id, person]));

  return (baseProfiles.data || []).map((profile) => ({
    ...profile,
    details: individualMap.get(profile.id),
  }));
}

export async function getProfileByUserId(userId: string) {
  if (isMockAuthEnabled()) {
    const session = getMockSession();

    if (session?.id === userId) {
      return {
        profile: {
          id: session.id,
          role: session.role,
          display_name: session.displayName,
          location: "Delhi",
          contact_info: session.email,
          verification_status: "unverified",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ngoProfile: session.role === "ngo"
          ? {
              user_id: session.id,
              ngo_name: session.displayName,
              description: "Community support organization",
              sector: session.volunteeringDomain,
              location: "Delhi",
              contact_info: session.email,
            }
          : null,
        individualProfile: session.role === "individual"
          ? {
              user_id: session.id,
              full_name: session.displayName,
              skills: ["coordination", "outreach"],
              interests: [session.volunteeringDomain],
              location: "Delhi",
              availability: session.availableForNgo ? "Available for NGO assignments" : "Not available",
              contact_info: session.email,
            }
          : null,
        requests: [],
        offers: [],
      };
    }

    const ngo = MOCK_NGO_DIRECTORY.find((item) => item.id === userId);
    if (ngo) {
      return {
        profile: ngo,
        ngoProfile: {
          user_id: ngo.id,
          ngo_name: ngo.display_name,
          description: ngo.details.description,
          sector: ngo.details.sector,
          location: ngo.location,
          contact_info: ngo.contact_info,
        },
        individualProfile: null,
        requests: [
          {
            id: `req-${ngo.id}`,
            title: `${ngo.details.sector} volunteer drive`,
            status: "open",
            category: ngo.details.sector,
          },
        ],
        offers: [],
      };
    }
  }

  const [base, ngo, individual, requests, offers] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("ngo_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("individual_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("ngo_requests").select("*").eq("owner_id", userId).order("created_at", { ascending: false }),
    supabase.from("volunteer_offers").select("*").eq("owner_id", userId).order("created_at", { ascending: false }),
  ]);

  if (base.error) throw base.error;
  if (ngo.error) throw ngo.error;
  if (individual.error) throw individual.error;
  if (requests.error) throw requests.error;
  if (offers.error) throw offers.error;

  return {
    profile: base.data,
    ngoProfile: ngo.data,
    individualProfile: individual.data,
    requests: requests.data || [],
    offers: offers.data || [],
  };
}

export async function updateNgoProfile(userId: string, patch: {
  ngo_name?: string;
  description?: string;
  sector?: string;
  location?: string;
  contact_info?: string;
}) {
  const { error } = await supabase.from("ngo_profiles").update(patch).eq("user_id", userId);
  if (error) throw error;

  if (patch.ngo_name || patch.location || patch.contact_info) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: patch.ngo_name,
        location: patch.location,
        contact_info: patch.contact_info,
      })
      .eq("id", userId);
    if (profileError) throw profileError;
  }
}

export async function updateIndividualProfile(userId: string, patch: {
  full_name?: string;
  skills?: string;
  interests?: string;
  location?: string;
  availability?: string;
  contact_info?: string;
}) {
  const profilePatch = {
    full_name: patch.full_name,
    skills: patch.skills ? splitList(patch.skills) : undefined,
    interests: patch.interests ? splitList(patch.interests) : undefined,
    location: patch.location,
    availability: patch.availability,
    contact_info: patch.contact_info,
  };

  const { error } = await supabase.from("individual_profiles").update(profilePatch).eq("user_id", userId);
  if (error) throw error;

  if (patch.full_name || patch.location || patch.contact_info) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: patch.full_name,
        location: patch.location,
        contact_info: patch.contact_info,
      })
      .eq("id", userId);
    if (profileError) throw profileError;
  }
}

export async function getRecommendations() {
  const user = await getCurrentSessionUser();
  if (!user) return [] as CommunityPost[];

  const [profileResult, individualResult, ngoResult, feed] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("individual_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("ngo_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    getCommunityFeed(),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (individualResult.error) throw individualResult.error;
  if (ngoResult.error) throw ngoResult.error;

  const profile = profileResult.data;

  const scored = feed
    .filter((post) => post.ownerId !== user.id)
    .map((post) => {
      let score = 0;
      const locationMatch = profile.location && post.location && profile.location === post.location;
      if (locationMatch) score += 2;

      if (profile.role === "individual") {
        if (post.postType === "ngo_request") {
          score += 2;
          const interests = new Set((individualResult.data?.interests || []).map((x) => x.toLowerCase()));
          const skills = new Set((individualResult.data?.skills || []).map((x) => x.toLowerCase()));

          if (interests.has(post.category.toLowerCase())) score += 3;
          if (skills.has(post.category.toLowerCase())) score += 1;
        }
      } else {
        if (post.postType === "volunteer_offer") {
          score += 2;
          const ngoSector = (ngoResult.data?.sector || "").toLowerCase();
          if (ngoSector && post.category.toLowerCase().includes(ngoSector)) score += 2;
        }
      }

      if (post.urgency === "critical") score += 1;
      if (post.status === "open") score += 1;

      return { post, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.post);

  return scored;
}
