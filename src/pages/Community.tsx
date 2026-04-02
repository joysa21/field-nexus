import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PostFilters } from "@/components/community/PostFilters";
import { PostCard } from "@/components/community/PostCard";
import { RequestFormDialog, type RequestFormValues } from "@/components/community/RequestFormDialog";
import { OfferFormDialog, type OfferFormValues } from "@/components/community/OfferFormDialog";
import { Badge } from "@/components/ui/badge";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import type { CommunityFilter, CommunityPost } from "@/types/impact";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  addConnection,
  createNgoRequest,
  createVolunteerOffer,
  deleteNgoRequest,
  deleteVolunteerOffer,
  getCommunityFeed,
  getRecommendations,
  getSavedPosts,
  savePost,
  unsavePost,
  updateNgoRequest,
  updateVolunteerOffer,
} from "@/services/impactService";

const INITIAL_FILTER: CommunityFilter = {
  feedType: "all",
  category: "",
  location: "",
  urgency: "all",
  query: "",
};

export default function Community() {
  const { profile, userId } = useAuthProfile();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [recommended, setRecommended] = useState<CommunityPost[]>([]);
  const [filter, setFilter] = useState(INITIAL_FILTER);

  const refresh = async () => {
    setLoading(true);
    try {
      const [feed, saved, suggestions] = await Promise.all([
        getCommunityFeed(),
        getSavedPosts(),
        getRecommendations(),
      ]);
      setPosts(feed);
      setSavedKeys(new Set(saved.map((post) => `${post.postType}:${post.id}`)));
      setRecommended(suggestions);
    } catch (error: any) {
      toast.error(error.message || t("community.couldNotLoad"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    return posts.filter((post) => {
      if (filter.feedType !== "all" && post.postType !== filter.feedType) return false;
      if (filter.category && !post.category.toLowerCase().includes(filter.category.toLowerCase())) return false;
      if (filter.location && !post.location.toLowerCase().includes(filter.location.toLowerCase())) return false;
      if (filter.urgency !== "all" && post.urgency !== filter.urgency) return false;

      const q = filter.query.toLowerCase().trim();
      if (!q) return true;
      return (
        post.title.toLowerCase().includes(q) ||
        post.description.toLowerCase().includes(q) ||
        post.ownerName.toLowerCase().includes(q)
      );
    });
  }, [posts, filter]);

  const handleSave = async (post: CommunityPost) => {
    try {
      const key = `${post.postType}:${post.id}`;
      if (savedKeys.has(key)) {
        await unsavePost(post.postType, post.id);
      } else {
        await savePost(post.postType, post.id);
      }
      await refresh();
    } catch (error: any) {
      toast.error(error.message || "Could not update saved post.");
    }
  };

  const handleRespond = async (post: CommunityPost) => {
    if (!profile) return;

    const message = window.prompt(
      post.postType === "ngo_request"
        ? t("community.responsePromptNgo")
        : t("community.responsePromptVolunteer"),
    );

    if (!message) return;

    try {
      await addConnection({
        requestId: post.postType === "ngo_request" ? post.id : undefined,
        offerId: post.postType === "volunteer_offer" ? post.id : undefined,
        receiverId: post.ownerId,
        message,
      });
      toast.success(t("community.responseSent"));
    } catch (error: any) {
      toast.error(error.message || t("community.couldNotSendResponse"));
    }
  };

  const handleCreateRequest = async (values: RequestFormValues) => {
    try {
      await createNgoRequest(values);
      toast.success(t("community.createRequestSuccess"));
      await refresh();
    } catch (error: any) {
      toast.error(error.message || t("community.couldNotCreateRequest"));
    }
  };

  const handleCreateOffer = async (values: OfferFormValues) => {
    try {
      await createVolunteerOffer(values);
      toast.success(t("community.createOfferSuccess"));
      await refresh();
    } catch (error: any) {
      toast.error(error.message || t("community.couldNotCreateOffer"));
    }
  };

  const handleEdit = async (post: CommunityPost) => {
    const title = window.prompt(t("community.editTitle"), post.title);
    if (!title) return;
    const description = window.prompt(t("community.editDescription"), post.description);
    if (!description) return;

    try {
      if (post.postType === "ngo_request") {
        await updateNgoRequest(post.id, { title, description });
      } else {
        await updateVolunteerOffer(post.id, { title, description });
      }
      toast.success(t("community.updatePostSuccess"));
      await refresh();
    } catch (error: any) {
      toast.error(error.message || t("community.couldNotUpdatePost"));
    }
  };

  const handleMarkClosed = async (post: CommunityPost) => {
    try {
      if (post.postType === "ngo_request") {
        await updateNgoRequest(post.id, { status: "fulfilled" });
      } else {
        await updateVolunteerOffer(post.id, { status: "unavailable" });
      }
      toast.success(t("community.updateStatusSuccess"));
      await refresh();
    } catch (error: any) {
      toast.error(error.message || t("community.couldNotUpdateStatus"));
    }
  };

  const handleDelete = async (post: CommunityPost) => {
    const confirmed = window.confirm(t("community.deleteConfirm"));
    if (!confirmed) return;

    try {
      if (post.postType === "ngo_request") {
        await deleteNgoRequest(post.id);
      } else {
        await deleteVolunteerOffer(post.id);
      }
      toast.success(t("community.deletePostSuccess"));
      await refresh();
    } catch (error: any) {
      toast.error(error.message || t("community.couldNotDeletePost"));
    }
  };

  const canRespondTo = (post: CommunityPost) => {
    if (!profile) return false;
    if (post.ownerId === userId) return false;

    if (profile.role === "ngo") return post.postType === "volunteer_offer";
    return post.postType === "ngo_request";
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("community.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("community.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {profile?.role === "ngo" && <RequestFormDialog onSubmit={handleCreateRequest} triggerLabel={t("community.newRequest")} title={t("community.createRequest")} />}
          {profile?.role === "individual" && <OfferFormDialog onSubmit={handleCreateOffer} triggerLabel={t("community.newOffer")} title={t("community.createOffer")} />}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("community.filters")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PostFilters value={filter} onChange={setFilter} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("community.recommendedForYou")}</CardTitle>
        </CardHeader>
        <CardContent>
          {recommended.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("community.noRecommendations")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {recommended.map((item) => (
                <Badge key={`${item.postType}:${item.id}`} variant="outline">
                  {item.title}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">{t("community.loadingPosts")}</CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">{t("community.noPostsMatch")}</CardContent>
          </Card>
        ) : (
          filtered.map((post) => {
            const key = `${post.postType}:${post.id}`;
            return (
              <PostCard
                key={key}
                post={post}
                canRespond={canRespondTo(post)}
                isOwner={post.ownerId === userId}
                isSaved={savedKeys.has(key)}
                onSave={handleSave}
                onRespond={handleRespond}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onMarkClosed={handleMarkClosed}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
