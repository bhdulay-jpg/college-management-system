"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Textarea } from "../../ui/textarea";
import { Avatar, AvatarFallback } from "../../ui/avatar";
import {
  ThumbsUp,
  Heart,
  Sparkles,
  MessageCircle,
  Send,
  Pin,
  MoreVertical,
  Trash2,
  Star,
  Lightbulb,
  Globe,
  BookOpen
} from "lucide-react";
import { db, auth } from "../../../lib/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, Timestamp } from "firebase/firestore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { toast } from "sonner@2.0.3";

interface Reaction {
  userId: string;
  userName: string;
  type: "like" | "love" | "celebrate" | "support" | "insightful";
  timestamp: any;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  content: string;
  timestamp: any;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  postedBy: string;
  postedByName: string;
  postedByRole: string;
  createdAt: any;
  updatedAt?: any;
  isPinned?: boolean;
  visibility?: string;
  targetSubjectIds?: string[];
  reactions?: Reaction[];
  comments?: Comment[];
  attachments?: string[];
}

interface AnnouncementCardProps {
  announcement: Announcement;
  currentUserRole: string;
  currentUserId: string;
  currentUserName: string;
}

const reactionTypes = [
  { type: "like", icon: ThumbsUp, label: "Like", color: "text-blue-600" },
  { type: "love", icon: Heart, label: "Love", color: "text-red-600" },
  { type: "celebrate", icon: Sparkles, label: "Celebrate", color: "text-yellow-600" },
  { type: "support", icon: Star, label: "Support", color: "text-green-600" },
  { type: "insightful", icon: Lightbulb, label: "Insightful", color: "text-purple-600" },
] as const;

export function AnnouncementCard({
  announcement,
  currentUserRole,
  currentUserId,
  currentUserName,
}: AnnouncementCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showReactions, setShowReactions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reactions = announcement.reactions || [];
  const comments = announcement.comments || [];

  // Get user's current reaction
  const userReaction = reactions.find(r => r.userId === currentUserId);

  // Count reactions by type
  const reactionCounts = reactions.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleReaction = async (type: string) => {
    if (!currentUserId) return;

    try {
      const announcementRef = doc(db, "announcements", announcement.id);

      // If user already reacted with this type, remove it
      if (userReaction?.type === type) {
        await updateDoc(announcementRef, {
          reactions: arrayRemove(userReaction),
          updatedAt: Timestamp.now()
        });
      } else {
        // Remove old reaction if exists
        if (userReaction) {
          await updateDoc(announcementRef, {
            reactions: arrayRemove(userReaction),
          });
        }

        // Add new reaction
        const newReaction: Reaction = {
          userId: currentUserId,
          userName: currentUserName,
          type: type as any,
          timestamp: Timestamp.now()
        };

        await updateDoc(announcementRef, {
          reactions: arrayUnion(newReaction),
          updatedAt: Timestamp.now()
        });
      }

      setShowReactions(false);
    } catch (error) {
      console.error("Error updating reaction:", error);
      toast.error("Failed to update reaction");
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !currentUserId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newComment: Comment = {
        id: `${currentUserId}-${Date.now()}`,
        userId: currentUserId,
        userName: currentUserName,
        userRole: currentUserRole,
        content: commentText.trim(),
        timestamp: Timestamp.now()
      };

      const announcementRef = doc(db, "announcements", announcement.id);
      await updateDoc(announcementRef, {
        comments: arrayUnion(newComment),
        updatedAt: Timestamp.now()
      });

      setCommentText("");
      toast.success("Comment posted");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    try {
      await deleteDoc(doc(db, "announcements", announcement.id));
      toast.success("Announcement deleted");
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement");
    }
  };

  const handleTogglePin = async () => {
    try {
      const announcementRef = doc(db, "announcements", announcement.id);
      await updateDoc(announcementRef, {
        isPinned: !announcement.isPinned,
        updatedAt: Timestamp.now()
      });
      toast.success(announcement.isPinned ? "Announcement unpinned" : "Announcement pinned");
    } catch (error) {
      console.error("Error toggling pin:", error);
      toast.error("Failed to update announcement");
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-PH', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const canModify = currentUserRole === "Admin" || announcement.postedBy === currentUserId;

  return (
    <Card className={announcement.isPinned ? "border-primary border-2" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(announcement.postedByName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{announcement.postedByName}</span>
                <Badge variant="secondary" className="text-xs">
                  {announcement.postedByRole}
                </Badge>
                {announcement.isPinned && (
                  <Badge variant="default" className="text-xs">
                    <Pin className="h-3 w-3 mr-1" />
                    Pinned
                  </Badge>
                )}
                {announcement.visibility === "subject-specific" && (
                  <Badge variant="outline" className="text-xs">
                    <BookOpen className="h-3 w-3 mr-1" />
                    Subject-Specific
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {formatTimestamp(announcement.createdAt)}
              </div>
            </div>
          </div>

          {canModify && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleTogglePin}>
                  <Pin className="h-4 w-4 mr-2" />
                  {announcement.isPinned ? "Unpin" : "Pin"} Announcement
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Announcement
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Announcement Content */}
        <div>
          <h3 className="font-semibold mb-2">{announcement.title}</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {announcement.content}
          </p>
        </div>

        {/* Reactions Summary */}
        {reactions.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-3">
            <div className="flex -space-x-1">
              {Object.entries(reactionCounts).slice(0, 3).map(([type, count]) => {
                const reactionType = reactionTypes.find(r => r.type === type);
                if (!reactionType) return null;
                const Icon = reactionType.icon;
                return (
                  <div
                    key={type}
                    className={`w-5 h-5 rounded-full bg-background border flex items-center justify-center ${reactionType.color}`}
                  >
                    <Icon className="h-3 w-3" />
                  </div>
                );
              })}
            </div>
            <span>{reactions.length} {reactions.length === 1 ? 'reaction' : 'reactions'}</span>
            {comments.length > 0 && (
              <>
                <span>•</span>
                <span>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
              </>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 border-t pt-3">
          <div className="relative flex-1">
            <Button
              variant={userReaction ? "default" : "outline"}
              size="sm"
              className="w-full"
              onClick={() => setShowReactions(!showReactions)}
            >
              {userReaction ? (
                <>
                  {reactionTypes.find(r => r.type === userReaction.type)?.icon && (
                    <>
                      {(() => {
                        const Icon = reactionTypes.find(r => r.type === userReaction.type)!.icon;
                        return <Icon className="h-4 w-4 mr-2" />;
                      })()}
                    </>
                  )}
                  {reactionTypes.find(r => r.type === userReaction.type)?.label}
                </>
              ) : (
                <>
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  React
                </>
              )}
            </Button>

            {/* Reaction Picker */}
            {showReactions && (
              <div className="absolute bottom-full mb-2 left-0 bg-popover border rounded-lg shadow-lg p-2 flex gap-1 z-10">
                {reactionTypes.map(({ type, icon: Icon, label, color }) => (
                  <Button
                    key={type}
                    variant="ghost"
                    size="sm"
                    className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${color}`}
                    onClick={() => handleReaction(type)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{label}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Comment {comments.length > 0 && `(${comments.length})`}
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="border-t pt-4 space-y-4">
            {/* Existing Comments */}
            {comments.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {comments
                  .sort((a, b) => {
                    const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp);
                    const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp);
                    return timeA.getTime() - timeB.getTime();
                  })
                  .map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-muted">
                          {getInitials(comment.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{comment.userName}</span>
                            <Badge variant="secondary" className="text-xs">
                              {comment.userRole}
                            </Badge>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 ml-2">
                          {formatTimestamp(comment.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Add Comment */}
            <div className="flex gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {getInitials(currentUserName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Textarea
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[60px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleComment();
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleComment}
                  disabled={!commentText.trim() || isSubmitting}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}