import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { MapPin, MessageSquare, Bookmark, Handshake } from "lucide-react";
import { Link } from "react-router-dom";
import type { CommunityPost } from "@/types/impact";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDateTime, translateLabel, translatePostType, translateRole, translateStatus, translateUrgency } from "@/lib/i18n";

interface PostCardProps {
  post: CommunityPost;
  canRespond: boolean;
  isOwner?: boolean;
  isSaved?: boolean;
  onSave?: (post: CommunityPost) => void;
  onRespond?: (post: CommunityPost) => void;
  onEdit?: (post: CommunityPost) => void;
  onDelete?: (post: CommunityPost) => void;
  onMarkClosed?: (post: CommunityPost) => void;
}

const roleTone = {
  ngo: "default",
  individual: "secondary",
} as const;

export function PostCard({
  post,
  canRespond,
  isOwner,
  isSaved,
  onSave,
  onRespond,
  onEdit,
  onDelete,
  onMarkClosed,
}: PostCardProps) {
  const { language, t } = useLanguage();

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-2 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant={roleTone[post.ownerRole]}>{translateRole(language, post.ownerRole)}</Badge>
              <Badge variant="outline">{translatePostType(language, post.postType)}</Badge>
              <Badge variant="outline">{translateStatus(language, post.status)}</Badge>
            </div>
            <h3 className="text-base font-semibold mt-2 leading-tight">{post.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t("community.postedBy", { name: post.ownerName })}</p>
          </div>
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDateTime(language, post.createdAt)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-2">
        <p className="text-sm text-foreground whitespace-pre-wrap">{post.description}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{translateLabel(language, post.category)}</Badge>
          <Badge variant="outline">{t("community.urgencyLabel", { value: translateUrgency(language, post.urgency) })}</Badge>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {post.location}
          </span>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-2">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/community/${post.postType}/${post.id}`} className="inline-flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {t("community.discussion")}
          </Link>
        </Button>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isOwner && (
            <>
              <Button variant="outline" size="sm" onClick={() => onEdit?.(post)}>Edit</Button>
              <Button variant="outline" size="sm" onClick={() => onMarkClosed?.(post)}>
                {post.postType === "ngo_request" ? t("community.markFulfilled") : t("community.markUnavailable")}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onDelete?.(post)}>{t("common.delete")}</Button>
            </>
          )}
          <Button
            variant={isSaved ? "secondary" : "outline"}
            size="sm"
            onClick={() => onSave?.(post)}
          >
            <Bookmark className="h-4 w-4 mr-1" />
            {isSaved ? t("community.saved") : t("community.save")}
          </Button>
          {(post.postType === "ngo_request" ? !isOwner : canRespond) && (
            <Button size="sm" onClick={() => onRespond?.(post)}>
              <Handshake className="h-4 w-4 mr-1" />
              {post.postType === "ngo_request" ? t("community.helpNgo") : t("community.connect")}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
