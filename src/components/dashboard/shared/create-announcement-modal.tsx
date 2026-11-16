"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Label } from "../../ui/label";
import { Switch } from "../../ui/switch";
import { Checkbox } from "../../ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group";
import { Megaphone, Loader2, Users, Globe, BookOpen } from "lucide-react";
import { db, auth } from "../../../lib/firebase";
import { collection, addDoc, Timestamp, query, where, getDocs } from "firebase/firestore";
import { toast } from "sonner@2.0.3";
import { Badge } from "../../ui/badge";

interface CreateAnnouncementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  userRole: string;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  program?: string;
}

export function CreateAnnouncementModal({
  open,
  onOpenChange,
  userName,
  userRole,
}: CreateAnnouncementModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "subject-specific">("public");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Fetch teacher's subjects when modal opens and user is a teacher
  useEffect(() => {
    const fetchTeacherSubjects = async () => {
      if (!open || userRole !== "Teacher") return;
      
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      setLoadingSubjects(true);
      try {
        // Fetch schedules where this teacher is assigned
        const schedulesQuery = query(
          collection(db, "schedules"),
          where("teacherId", "==", currentUser.uid)
        );
        const schedulesSnapshot = await getDocs(schedulesQuery);
        
        // Get unique subject IDs
        const subjectIds = new Set<string>();
        schedulesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.subjectId) {
            subjectIds.add(data.subjectId);
          }
        });

        // Fetch subject details
        const subjectsData: Subject[] = [];
        for (const subjectId of subjectIds) {
          const subjectDoc = await getDocs(
            query(collection(db, "subjects"), where("__name__", "==", subjectId))
          );
          subjectDoc.docs.forEach(doc => {
            subjectsData.push({
              id: doc.id,
              ...doc.data()
            } as Subject);
          });
        }

        setSubjects(subjectsData);
      } catch (error) {
        console.error("Error fetching teacher subjects:", error);
        toast.error("Failed to load your subjects");
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchTeacherSubjects();
  }, [open, userRole]);

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (visibility === "subject-specific" && selectedSubjects.length === 0) {
      toast.error("Please select at least one subject");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("You must be logged in to post announcements");
      return;
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "announcements"), {
        title: title.trim(),
        content: content.trim(),
        postedBy: currentUser.uid,
        postedByName: userName,
        postedByRole: userRole,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isPinned: isPinned,
        visibility: visibility,
        targetSubjectIds: visibility === "subject-specific" ? selectedSubjects : [],
        reactions: [],
        comments: [],
      });

      toast.success("Announcement posted successfully!");
      
      // Reset form
      setTitle("");
      setContent("");
      setIsPinned(false);
      setVisibility("public");
      setSelectedSubjects([]);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast.error("Failed to post announcement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Create Announcement
          </DialogTitle>
          <DialogDescription>
            Share important updates with students and the school community.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter announcement title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/150 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              placeholder="Write your announcement here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] resize-none"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              {content.length} characters
            </p>
          </div>

          {/* Visibility Options - Only for Teachers */}
          {userRole === "Teacher" && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <Label>Who can see this announcement? *</Label>
              <RadioGroup
                value={visibility}
                onValueChange={(value: any) => setVisibility(value)}
                disabled={isSubmitting}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer font-normal">
                    <Globe className="h-4 w-4" />
                    <div>
                      <div>Everyone (Public)</div>
                      <div className="text-xs text-muted-foreground">All students, teachers, and staff can see this</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="subject-specific" id="subject-specific" />
                  <Label htmlFor="subject-specific" className="flex items-center gap-2 cursor-pointer font-normal">
                    <BookOpen className="h-4 w-4" />
                    <div>
                      <div>Specific Subjects Only</div>
                      <div className="text-xs text-muted-foreground">Only students enrolled in selected subjects</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {/* Subject Selection */}
              {visibility === "subject-specific" && (
                <div className="mt-4 space-y-2">
                  <Label>Select Subjects *</Label>
                  {loadingSubjects ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading your subjects...
                    </div>
                  ) : subjects.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-3 bg-background rounded border">
                      No subjects assigned to you. Contact the registrar if this is incorrect.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-3 bg-background">
                      {subjects.map((subject) => (
                        <div key={subject.id} className="flex items-start space-x-2">
                          <Checkbox
                            id={subject.id}
                            checked={selectedSubjects.includes(subject.id)}
                            onCheckedChange={() => handleSubjectToggle(subject.id)}
                            disabled={isSubmitting}
                          />
                          <Label
                            htmlFor={subject.id}
                            className="cursor-pointer font-normal flex-1"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{subject.code}</span>
                              <span className="text-muted-foreground">-</span>
                              <span>{subject.name}</span>
                            </div>
                            {subject.program && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {subject.program}
                              </Badge>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedSubjects.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pin Option */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="pin" className="cursor-pointer">
                Pin this announcement
              </Label>
              <p className="text-xs text-muted-foreground">
                Pinned announcements appear at the top of the feed
              </p>
            </div>
            <Switch
              id="pin"
              checked={isPinned}
              onCheckedChange={setIsPinned}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Megaphone className="h-4 w-4 mr-2" />
                  Post Announcement
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}