import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { addComment, getComments, getCommunityFeed } from "@/services/impactService";
import type { CommunityPost, CommunityPostType } from "@/types/impact";

interface EnrichedComment {
  id: string;
  content: string;
  created_at: string;
  author_name: string;
  author_role: string;
}

export default function PostDetail() {
  const { type, id } = useParams();
  const postType = type as CommunityPostType;

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<EnrichedComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!id || !postType) return;

    setLoading(true);
    try {
      const [feed, items] = await Promise.all([
        getCommunityFeed(),
        getComments(postType, id),
      ]);
      setPost(feed.find((item) => item.id === id && item.postType === postType) || null);
      setComments(items as EnrichedComment[]);
    } catch (error: any) {
      toast.error(error.message || "Could not load post details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [id, postType]);

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!id || !postType || !commentText.trim()) return;

    try {
      await addComment(postType, id, commentText.trim());
      setCommentText("");
      toast.success("Comment added.");
      await refresh();
    } catch (error: any) {
      toast.error(error.message || "Could not add comment.");
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Loading...</CardContent>
        </Card>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Post not found.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{post.postType === "ngo_request" ? "NGO Request" : "Volunteer Offer"}</Badge>
            <Badge variant="outline">{post.status}</Badge>
            <Badge variant="outline">{post.category}</Badge>
          </div>
          <CardTitle className="text-xl">{post.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {post.ownerName} · {post.location} · {new Date(post.createdAt).toLocaleString()}
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{post.description}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Discussion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-2" onSubmit={submitComment}>
            <Textarea
              placeholder="Write a comment"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <Button type="submit">Post Comment</Button>
          </form>

          <div className="space-y-2">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="border rounded-md p-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{comment.author_name}</p>
                    <Badge variant="outline">{comment.author_role}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
