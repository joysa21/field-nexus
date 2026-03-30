import type { Database } from "@/integrations/supabase/types";

export type UserRole = Database["public"]["Tables"]["profiles"]["Row"]["role"];

export type BaseProfile = Database["public"]["Tables"]["profiles"]["Row"];
export type NgoProfile = Database["public"]["Tables"]["ngo_profiles"]["Row"];
export type IndividualProfile = Database["public"]["Tables"]["individual_profiles"]["Row"];

export type NgoRequest = Database["public"]["Tables"]["ngo_requests"]["Row"];
export type VolunteerOffer = Database["public"]["Tables"]["volunteer_offers"]["Row"];
export type PostComment = Database["public"]["Tables"]["post_comments"]["Row"];
export type ConnectionResponse = Database["public"]["Tables"]["connections_or_responses"]["Row"];
export type SavedPost = Database["public"]["Tables"]["saved_posts"]["Row"];
export type NotificationItem = Database["public"]["Tables"]["notifications"]["Row"];

export type CommunityPostType = "ngo_request" | "volunteer_offer";

export interface CommunityPost {
  id: string;
  postType: CommunityPostType;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  location: string;
  status: string;
  createdAt: string;
  ownerName: string;
  ownerRole: UserRole;
}

export interface CommunityFilter {
  feedType: "all" | "ngo_request" | "volunteer_offer";
  category: string;
  location: string;
  urgency: string;
  query: string;
}
