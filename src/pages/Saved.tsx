import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { getSavedPosts, savePost, unsavePost } from "@/services/impactService";
import { PostCard } from "@/components/community/PostCard";
import type { CommunityPost } from "@/types/impact";

export default function Saved() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<CommunityPost[]>([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getSavedPosts();
      setPosts(data);
    } catch (error: any) {
      toast.error(error.message || "Could not load saved posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const toggleSave = async (post: CommunityPost) => {
    try {
      await unsavePost(post.postType, post.id);
      toast.success("Removed from saved posts.");
      refresh();
    } catch {
      await savePost(post.postType, post.id);
      refresh();
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Saved Posts</h1>
        <p className="text-sm text-muted-foreground mt-1">Your bookmarked requests and volunteer offers.</p>
      </div>

      {loading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Loading saved posts...</CardContent></Card>
      ) : posts.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">You have no saved posts yet.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={`${post.postType}:${post.id}`}
              post={post}
              canRespond={false}
              isSaved={true}
              onSave={toggleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
