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

type NgoExtraFields = {
  address?: string;
  email?: string;
  contact_number?: string;
  bank_details?: string;
  image_url?: string;
  work_area?: string;
  past_works?: string;
};

const NGO_EXTRA_STORAGE_PREFIX = "ngo-about:";

function getNgoExtraStorageKey(userId: string) {
  return `${NGO_EXTRA_STORAGE_PREFIX}${userId}`;
}

function readNgoExtraFields(userId: string): NgoExtraFields {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(getNgoExtraStorageKey(userId));
    return raw ? JSON.parse(raw) as NgoExtraFields : {};
  } catch (error) {
    console.warn("Failed to read NGO extra fields from local storage:", error);
    return {};
  }
}

function writeNgoExtraFields(userId: string, patch: NgoExtraFields) {
  if (typeof window === "undefined") return;

  try {
    const merged = { ...readNgoExtraFields(userId), ...patch };
    window.localStorage.setItem(getNgoExtraStorageKey(userId), JSON.stringify(merged));
  } catch (error) {
    console.warn("Failed to write NGO extra fields to local storage:", error);
  }
}

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
  {
    id: "ngo-6",
    role: "ngo" as const,
    display_name: "WaterBridge Alliance",
    location: "Lucknow",
    contact_info: "help@waterbridge.org",
    verification_status: "verified" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    details: {
      description: "Restores village handpumps and runs water-safety awareness camps.",
      sector: "Water Access",
      contact_info: "help@waterbridge.org",
    },
  },
  {
    id: "ngo-7",
    role: "ngo" as const,
    display_name: "GreenStep Mission",
    location: "Chennai",
    contact_info: "action@greenstep.org",
    verification_status: "verified" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    details: {
      description: "Coordinates mangrove restoration and urban clean-up drives.",
      sector: "Environment",
      contact_info: "action@greenstep.org",
    },
  },
  {
    id: "ngo-8",
    role: "ngo" as const,
    display_name: "SafeHome Collective",
    location: "Jaipur",
    contact_info: "support@safehome.org",
    verification_status: "pending" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    details: {
      description: "Supports women and families with legal aid and safe shelter referrals.",
      sector: "Women Support",
      contact_info: "support@safehome.org",
    },
  },
  {
    id: "ngo-9",
    role: "ngo" as const,
    display_name: "SkillLift Foundation",
    location: "Kolkata",
    contact_info: "team@skilllift.org",
    verification_status: "verified" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    details: {
      description: "Runs employability, mentoring, and apprenticeship programs for youth.",
      sector: "Livelihood",
      contact_info: "team@skilllift.org",
    },
  },
  {
    id: "ngo-10",
    role: "ngo" as const,
    display_name: "CareNet Relief",
    location: "Bhopal",
    contact_info: "response@carenetrelief.org",
    verification_status: "verified" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    details: {
      description: "Provides emergency ration and medicine support in crisis-hit neighborhoods.",
      sector: "Emergency Relief",
      contact_info: "response@carenetrelief.org",
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
  {
    id: "vol-3",
    role: "individual" as const,
    display_name: "Meera Iyer",
    location: "Bengaluru",
    contact_info: "meera@example.org",
    verification_status: "verified" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    details: {
      skills: ["community outreach", "content creation"],
      interests: ["Women Support", "Education Support"],
      availability: "Hybrid - 10 hrs/week",
    },
  },
];

const MOCK_NGO_REQUESTS = MOCK_NGO_DIRECTORY.map((ngo, idx) => ({
  id: `mock-req-${idx + 1}`,
  owner_id: ngo.id,
  title: `${ngo.display_name} needs volunteers`,
  description: `${ngo.details.description} Looking for committed volunteers to support current field activities this month.`,
  category: ngo.details.sector,
  urgency: idx % 4 === 0 ? "high" : idx % 3 === 0 ? "critical" : "medium",
  location: ngo.location || "Not specified",
  status: "open",
  created_at: new Date(Date.now() - idx * 3600_000).toISOString(),
}));

const MOCK_VOLUNTEER_OFFERS = [
  {
    id: "mock-offer-1",
    owner_id: "vol-1",
    title: "Healthcare camp support volunteer",
    description: "Can assist with patient registration, elder support, and awareness drives on weekends.",
    preferred_causes: ["Healthcare Outreach", "Old Age Support"],
    urgency: "normal",
    location: "Delhi",
    status: "available",
    created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: "mock-offer-2",
    owner_id: "vol-2",
    title: "After-school teaching volunteer",
    description: "Can mentor students in math and science and coordinate small learning events.",
    preferred_causes: ["Children Welfare", "Education Support"],
    urgency: "normal",
    location: "Mumbai",
    status: "available",
    created_at: new Date(Date.now() - 3 * 3600_000).toISOString(),
  },
  {
    id: "mock-offer-3",
    owner_id: "vol-3",
    title: "Outreach and communication volunteer",
    description: "Can help NGOs with campaign messaging, volunteer onboarding, and community updates.",
    preferred_causes: ["Women Support", "Livelihood"],
    urgency: "normal",
    location: "Bengaluru",
    status: "available",
    created_at: new Date(Date.now() - 4 * 3600_000).toISOString(),
  },
];

const buildMockCommunityFeed = (): CommunityPost[] => {
  const requestPosts: CommunityPost[] = MOCK_NGO_REQUESTS.map((request) => {
    const owner = MOCK_NGO_DIRECTORY.find((ngo) => ngo.id === request.owner_id);
    return {
      id: request.id,
      postType: "ngo_request",
      ownerId: request.owner_id,
      title: request.title,
      description: request.description,
      category: request.category,
      urgency: request.urgency,
      location: request.location,
      status: request.status,
      createdAt: request.created_at,
      ownerName: owner?.display_name || "Unknown NGO",
      ownerRole: "ngo",
    };
  });

  const offerPosts: CommunityPost[] = MOCK_VOLUNTEER_OFFERS.map((offer) => {
    const owner = MOCK_VOLUNTEER_DIRECTORY.find((volunteer) => volunteer.id === offer.owner_id);
    return {
      id: offer.id,
      postType: "volunteer_offer",
      ownerId: offer.owner_id,
      title: offer.title,
      description: offer.description,
      category: offer.preferred_causes[0] || "General",
      urgency: offer.urgency,
      location: offer.location,
      status: offer.status,
      createdAt: offer.created_at,
      ownerName: owner?.display_name || "Volunteer",
      ownerRole: "individual",
    };
  });

  return [...requestPosts, ...offerPosts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

const splitList = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const isMissingTableError = (error: unknown) => {
  const message = (error as { message?: string } | null)?.message?.toLowerCase() || "";
  return message.includes("could not find the table") || message.includes("schema cache");
};

const buildOwnerMap = async () => {
  const { data } = await supabase
    .from("profiles")
    .select("id, user_type, display_name, full_name");

  const ownerMap = new Map<string, { role: UserRole; name: string }>();
  (data || []).forEach((profile) => {
    ownerMap.set(profile.id, {
      role: profile.user_type as UserRole,
      display_name: profile.display_name || profile.full_name || "Unknown",
      name: profile.display_name || profile.full_name,
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
        email: user.email || `${user.id}@example.org`,
        user_type: role,
        role,
        display_name: displayName || user.email?.split("@")[0] || "User",
        full_name: displayName || user.email?.split("@")[0] || "User",
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
  if (isMockAuthEnabled()) {
    return buildMockCommunityFeed();
  }

  const [requestsResult, offersResult] = await Promise.all([
    supabase
      .from("ngo_requests")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("volunteer_offers")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  if (isMissingTableError(requestsResult.error) || isMissingTableError(offersResult.error)) {
    return buildMockCommunityFeed();
  }

  const ownerMap = await buildOwnerMap();

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
      ownerRole: owner?.user_type || "ngo",
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
      ownerRole: owner?.user_type || "individual",
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
}): Promise<{ id: string }> {
  const user = await getCurrentSessionUser();
  if (!user) throw new Error("Please sign in first.");

  const { data, error } = await supabase
    .from("ngo_requests")
    .insert({
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
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
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
  const [connectionsResult, commentsResult, savesResult] = await Promise.all([
    supabase.from("connections_or_responses").delete().eq("request_id", id),
    supabase.from("post_comments").delete().eq("request_id", id),
    supabase.from("saved_posts").delete().eq("request_id", id),
  ]);

  if (connectionsResult.error) throw connectionsResult.error;
  if (commentsResult.error) throw commentsResult.error;
  if (savesResult.error) throw savesResult.error;

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
}): Promise<{ id: string }> {
  const user = await getCurrentSessionUser();
  if (!user) throw new Error("Please sign in first.");

  const { data, error } = await supabase
    .from("volunteer_offers")
    .insert({
      owner_id: user.id,
      title: payload.title,
      description: payload.description,
      skills: splitList(payload.skills),
      availability: payload.availability,
      preferred_causes: splitList(payload.preferredCauses),
      location: payload.location,
      mode: payload.mode,
      contact_method: payload.contactMethod,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
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
  const [connectionsResult, commentsResult, savesResult] = await Promise.all([
    supabase.from("connections_or_responses").delete().eq("offer_id", id),
    supabase.from("post_comments").delete().eq("offer_id", id),
    supabase.from("saved_posts").delete().eq("offer_id", id),
  ]);

  if (connectionsResult.error) throw connectionsResult.error;
  if (commentsResult.error) throw commentsResult.error;
  if (savesResult.error) throw savesResult.error;

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

  if (isMockAuthEnabled()) {
    const session = getMockSession();
    const now = new Date();
    const targetNgoIds = MOCK_NGO_DIRECTORY.slice(0, 3).map((ngo) => ngo.id);

    return targetNgoIds.map((ngoId, idx) => ({
      id: `mock-conn-${idx + 1}`,
      request_id: `mock-req-${idx + 1}`,
      offer_id: null,
      sender_id: session?.user_type === "ngo" ? ngoId : user.id,
      receiver_id: session?.user_type === "ngo" ? user.id : ngoId,
      message: session?.user_type === "ngo"
        ? `Thanks for helping ${MOCK_NGO_DIRECTORY[idx].display_name}. Follow-up impact report shared.`
        : `I supported ${MOCK_NGO_DIRECTORY[idx].display_name} on ground operations and volunteer coordination.`,
      status: "completed",
      created_at: new Date(now.getTime() - (idx + 4) * 86_400_000).toISOString(),
      updated_at: new Date(now.getTime() - idx * 43_200_000).toISOString(),
    })) as ConnectionResponse[];
  }

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
  if (isMockAuthEnabled()) {
    const baseComments = [
      {
        id: `${postId}-comment-1`,
        content: "We can mobilize 4 volunteers this weekend.",
        created_at: new Date(Date.now() - 90 * 60_000).toISOString(),
        author_id: "vol-1",
      },
      {
        id: `${postId}-comment-2`,
        content: "Please share shift timings and exact location.",
        created_at: new Date(Date.now() - 70 * 60_000).toISOString(),
        author_id: "vol-2",
      },
      {
        id: `${postId}-comment-3`,
        content: "Our team can help with outreach and beneficiary registration.",
        created_at: new Date(Date.now() - 40 * 60_000).toISOString(),
        author_id: "vol-3",
      },
    ];

    return baseComments.map((comment) => ({
      ...comment,
      post_type: postType,
      request_id: postType === "ngo_request" ? postId : null,
      offer_id: postType === "volunteer_offer" ? postId : null,
      author_name: MOCK_VOLUNTEER_DIRECTORY.find((volunteer) => volunteer.id === comment.author_id)?.display_name || "Volunteer",
      author_role: "individual",
    }));
  }

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
  if (isMockAuthEnabled()) {
    const feed = await getCommunityFeed();
    return feed.slice(0, 3);
  }

  const user = await getCurrentSessionUser();
  if (!user) return [] as CommunityPost[];

  const [savedResult, feed] = await Promise.all([
    supabase.from("saved_posts").select("*").eq("user_id", user.id),
    getCommunityFeed(),
  ]);

  if (isMissingTableError(savedResult.error)) {
    return feed.slice(0, 3);
  }

  if (savedResult.error) throw savedResult.error;

  const savedLookup = new Set(
    (savedResult.data || []).map((saved) =>
      `${saved.post_type}:${saved.request_id || saved.offer_id}`,
    ),
  );

  return feed.filter((post) => savedLookup.has(`${post.postType}:${post.id}`));
}

export async function getNotifications() {
  if (isMockAuthEnabled()) {
    const user = await getCurrentSessionUser();
    const mockUserId = user?.id || "mock-user";
    const now = new Date();
    return [
      {
        id: "mock-notif-fest-2026",
        user_id: mockUserId,
        actor_id: null,
        event_type: "ngo_fest_2026",
        title: "NGO Fest 2026",
        body: "Happening on 5th April, 2026 at Enlarge Mall, Preet Vihar, New Delhi. Timings: 12:00 noon onwards.",
        is_read: false,
        related_request_id: null,
        related_offer_id: null,
        related_connection_id: null,
        related_comment_id: null,
        created_at: new Date(now.getTime() - 20 * 60_000).toISOString(),
      },
      {
        id: "mock-notif-1",
        user_id: mockUserId,
        actor_id: "ngo-1",
        event_type: "connection_completed",
        title: "Connection completed",
        body: "You successfully helped SilverCare Foundation. Impact note added to your history.",
        is_read: false,
        related_request_id: "mock-req-1",
        related_offer_id: null,
        related_connection_id: "mock-conn-1",
        related_comment_id: null,
        created_at: new Date(now.getTime() - 2 * 3600_000).toISOString(),
      },
      {
        id: "mock-notif-2",
        user_id: mockUserId,
        actor_id: "ngo-4",
        event_type: "new_ngo_request",
        title: "New NGO request near you",
        body: "HealthReach Network posted an urgent request in your area.",
        is_read: false,
        related_request_id: "mock-req-4",
        related_offer_id: null,
        related_connection_id: null,
        related_comment_id: null,
        created_at: new Date(now.getTime() - 6 * 3600_000).toISOString(),
      },
      {
        id: "mock-notif-3",
        user_id: mockUserId,
        actor_id: null,
        event_type: "profile_tip",
        title: "Profile boost tip",
        body: "Add one more skill to match with 2 new NGO opportunities.",
        is_read: true,
        related_request_id: null,
        related_offer_id: null,
        related_connection_id: null,
        related_comment_id: null,
        created_at: new Date(now.getTime() - 24 * 3600_000).toISOString(),
      },
    ] as NotificationItem[];
  }

  const user = await getCurrentSessionUser();
  if (!user) return [] as NotificationItem[];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (isMissingTableError(error)) {
    const now = new Date();
    return [
      {
        id: "fallback-notif-fest-2026",
        user_id: user.id,
        actor_id: null,
        event_type: "ngo_fest_2026",
        title: "NGO Fest 2026",
        body: "Happening on 5th April, 2026 at Enlarge Mall, Preet Vihar, New Delhi. Timings: 12:00 noon onwards.",
        related_request_id: null,
        related_offer_id: null,
        related_connection_id: null,
        related_comment_id: null,
        is_read: false,
        created_at: new Date(now.getTime() - 20 * 60_000).toISOString(),
      },
      {
        id: "fallback-notif-1",
        user_id: user.id,
        actor_id: null,
        event_type: "fallback_notice",
        title: "Using demo notifications",
        body: "Supabase notifications table is not available yet. Showing demo activity.",
        related_request_id: null,
        related_offer_id: null,
        related_connection_id: null,
        related_comment_id: null,
        is_read: false,
        created_at: new Date(now.getTime() - 30 * 60_000).toISOString(),
      },
      {
        id: "fallback-notif-2",
        user_id: user.id,
        actor_id: null,
        event_type: "new_ngo_request",
        title: "New NGO request posted",
        body: "WaterBridge Alliance requested 3 field volunteers.",
        related_request_id: null,
        related_offer_id: null,
        related_connection_id: null,
        related_comment_id: null,
        is_read: true,
        created_at: new Date(now.getTime() - 3 * 3600_000).toISOString(),
      },
    ] as NotificationItem[];
  }

  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id: string) {
  if (isMockAuthEnabled()) {
    return;
  }

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
    supabase.from("profiles").select("*").eq("user_type", "ngo"),
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
    supabase.from("profiles").select("*").eq("user_type", "individual"),
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
          role: session.user_type,
          display_name: session.displayName,
          location: "Delhi",
          contact_info: session.email,
          verification_status: "unverified",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ngoProfile: session.user_type === "ngo"
          ? {
              user_id: session.id,
              ngo_name: session.displayName,
              description: "Community support organization",
              sector: session.volunteeringDomain,
              location: "Delhi",
              contact_info: session.email,
              address: "Delhi",
              email: session.email,
              contact_number: "",
              bank_details: "",
              image_url: "",
              work_area: session.volunteeringDomain,
              past_works: "",
              verification_status: "unverified",
            }
          : null,
        individualProfile: session.user_type === "individual"
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
        requests: MOCK_NGO_REQUESTS.slice(0, 3).map((request) => ({
          id: request.id,
          title: request.title,
          status: request.status,
          category: request.category,
        })),
        offers: MOCK_VOLUNTEER_OFFERS.slice(0, 3).map((offer) => ({
          id: offer.id,
          title: offer.title,
          status: offer.status,
          mode: "hybrid",
        })),
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
          address: ngo.location,
          email: ngo.contact_info,
          contact_number: "",
          bank_details: "",
          image_url: "",
          work_area: ngo.details.sector,
          past_works: "",
          verification_status: ngo.verification_status,
        },
        individualProfile: null,
        requests: [
          ...MOCK_NGO_REQUESTS.filter((request) => request.owner_id === ngo.id).slice(0, 3).map((request) => ({
            id: request.id,
            title: request.title,
            status: request.status,
            category: request.category,
          })),
        ],
        offers: MOCK_VOLUNTEER_OFFERS.slice(0, 3).map((offer) => ({
          id: offer.id,
          title: offer.title,
          status: offer.status,
          mode: "hybrid",
        })),
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

  const ngoExtras = readNgoExtraFields(userId);
  const mergedNgoProfile = ngo.data
    ? {
        ...ngo.data,
        ...ngoExtras,
        address: ngoExtras.address ?? ngo.data.location ?? null,
        email: ngoExtras.email ?? ngo.data.contact_info ?? null,
        contact_number: ngoExtras.contact_number ?? null,
        bank_details: ngoExtras.bank_details ?? null,
        image_url: ngoExtras.image_url ?? null,
        work_area: ngoExtras.work_area ?? ngo.data.sector ?? null,
        past_works: ngoExtras.past_works ?? null,
      }
    : base.data?.role === "ngo"
      ? {
          user_id: userId,
          ngo_name: base.data.display_name,
          description: null,
          sector: null,
          location: base.data.location,
          contact_info: base.data.contact_info,
          address: ngoExtras.address ?? base.data.location ?? null,
          email: ngoExtras.email ?? base.data.contact_info ?? null,
          contact_number: ngoExtras.contact_number ?? null,
          bank_details: ngoExtras.bank_details ?? null,
          image_url: ngoExtras.image_url ?? null,
          work_area: ngoExtras.work_area ?? null,
          past_works: ngoExtras.past_works ?? null,
          created_at: null,
          updated_at: null,
          verification_status: null,
        }
      : null;

  return {
    profile: base.data,
    ngoProfile: mergedNgoProfile,
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
  address?: string;
  email?: string;
  contact_number?: string;
  bank_details?: string;
  image_url?: string;
  work_area?: string;
  past_works?: string;
}) {
  const extraPatch: NgoExtraFields = {
    address: patch.address,
    email: patch.email,
    contact_number: patch.contact_number,
    bank_details: patch.bank_details,
    image_url: patch.image_url,
    work_area: patch.work_area,
    past_works: patch.past_works,
  };

  writeNgoExtraFields(userId, extraPatch);

  const stablePatch = {
    user_id: userId,
    ngo_name: patch.ngo_name,
    description: patch.description,
    sector: patch.sector,
    location: patch.location,
    contact_info: patch.email ?? patch.contact_info,
  };

  const fullPatch = {
    ...stablePatch,
    address: patch.address,
    email: patch.email,
    contact_number: patch.contact_number,
    bank_details: patch.bank_details,
    image_url: patch.image_url,
    work_area: patch.work_area,
    past_works: patch.past_works,
  };

  const { error } = await supabase.from("ngo_profiles").upsert(fullPatch, { onConflict: "user_id" });
  if (error) {
    const isMissingColumnError = error.code === "PGRST204"
      || error.message.toLowerCase().includes("column")
      || error.message.toLowerCase().includes("schema cache");

    if (isMissingColumnError) {
      const { error: fallbackError } = await supabase.from("ngo_profiles").upsert(stablePatch, { onConflict: "user_id" });
      if (fallbackError) throw fallbackError;
    } else {
      throw error;
    }
  }

  if (patch.ngo_name || patch.location || patch.contact_info || patch.email) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: patch.ngo_name,
        location: patch.location,
        contact_info: patch.email ?? patch.contact_info,
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

  if (isMockAuthEnabled()) {
    const session = getMockSession();
    const feed = await getCommunityFeed();

    if (session?.user_type === "ngo") {
      return feed.filter((post) => post.postType === "volunteer_offer").slice(0, 3);
    }

    return feed.filter((post) => post.postType === "ngo_request").slice(0, 6);
  }

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

      if (profile.user_type === "individual") {
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
