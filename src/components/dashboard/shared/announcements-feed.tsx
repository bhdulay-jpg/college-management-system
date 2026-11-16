"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Megaphone, Plus, Search, Filter, Pin } from "lucide-react";
import { collection, query, orderBy, onSnapshot, where, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";
import { AnnouncementCard } from "./announcement-card";
import { CreateAnnouncementModal } from "./create-announcement-modal";
import { PageHeader } from "./page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { toast } from "sonner@2.0.3";
import { BookOpen } from "lucide-react";

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
  reactions?: any[];
  comments?: any[];
}

interface AnnouncementsFeedProps {
  currentUserRole: string;
  currentUserId: string;
  currentUserName: string;
  canPost?: boolean; // Admin and Teacher can post
}

export function AnnouncementsFeed({
  currentUserRole,
  currentUserId,
  currentUserName,
  canPost = false,
}: AnnouncementsFeedProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userEnrolledSubjects, setUserEnrolledSubjects] = useState<string[]>([]);

  // Fetch student's enrolled subjects if user is a student
  useEffect(() => {
    const fetchStudentEnrollments = async () => {
      if (currentUserRole !== "Student" || !currentUserId) return;

      try {
        // Get student's enrolled subjects from studentSubjects collection
        const studentSubjectsQuery = query(
          collection(db, "studentSubjects"),
          where("studentId", "==", currentUserId),
          where("status", "==", "enrolled")
        );
        const studentSubjectsSnapshot = await getDocs(studentSubjectsQuery);

        const subjectIds = new Set<string>();
        studentSubjectsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.subjectId) {
            subjectIds.add(data.subjectId);
          }
        });

        setUserEnrolledSubjects(Array.from(subjectIds));
        console.log(`[AnnouncementsFeed] ✅ Student enrolled in ${subjectIds.size} subjects:`, Array.from(subjectIds));
      } catch (error) {
        console.error("[AnnouncementsFeed] ❌ Error fetching student enrollments:", error);
      }
    };

    fetchStudentEnrollments();
  }, [currentUserRole, currentUserId]);

  // Real-time listener for announcements
  useEffect(() => {
    console.log(`[AnnouncementsFeed] Setting up real-time listener for ${currentUserRole}`);
    const announcementsRef = collection(db, "announcements");
    const q = query(announcementsRef, orderBy("createdAt", "desc"));

    let isFirstLoad = true; // Skip toast on initial load

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const announcementsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Announcement[];

      console.log(`[AnnouncementsFeed] 🔄 REAL-TIME UPDATE: Received ${announcementsData.length} total announcements`);
      
      // Log new announcements and show toast
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          console.log(`[AnnouncementsFeed] ✅ NEW announcement added:`, {
            id: change.doc.id,
            title: data.title,
            visibility: data.visibility || "public",
            targetSubjects: data.targetSubjectIds?.length || 0,
            postedBy: data.postedByName
          });

          // Show toast notification for new announcements (skip on initial load)
          if (!isFirstLoad) {
            // Check if user can see this announcement
            const visibility = data.visibility || "public";
            let canView = visibility === "public";

            if (visibility === "subject-specific" && currentUserRole === "Student") {
              const targetSubjects = data.targetSubjectIds || [];
              canView = targetSubjects.some((subjectId: string) => 
                userEnrolledSubjects.includes(subjectId)
              );
            } else if (visibility === "subject-specific" && (currentUserRole === "Admin" || currentUserRole === "Teacher")) {
              canView = true;
            }

            if (canView) {
              toast.success(`📢 New announcement from ${data.postedByName}`, {
                description: data.title,
                duration: 5000,
              });
            }
          }
        }
      });

      isFirstLoad = false; // After first load, enable toasts
      setAnnouncements(announcementsData);
      setLoading(false);
    }, (error) => {
      console.error("[AnnouncementsFeed] Error loading announcements:", error);
      setLoading(false);
    });

    return () => {
      console.log(`[AnnouncementsFeed] Cleaning up real-time listener`);
      unsubscribe();
    };
  }, [currentUserRole, userEnrolledSubjects]);

  // Filter announcements based on visibility and user role
  const getVisibleAnnouncements = () => {
    const visible = announcements.filter((announcement) => {
      // Public announcements are visible to everyone
      if (!announcement.visibility || announcement.visibility === "public") {
        return true;
      }

      // Subject-specific announcements
      if (announcement.visibility === "subject-specific") {
        // Teachers and admins can see all announcements
        if (currentUserRole === "Admin" || currentUserRole === "Teacher") {
          return true;
        }

        // Students can only see if they're enrolled in one of the target subjects
        if (currentUserRole === "Student") {
          const targetSubjects = announcement.targetSubjectIds || [];
          const hasAccess = targetSubjects.some(subjectId => 
            userEnrolledSubjects.includes(subjectId)
          );
          
          console.log(`[AnnouncementsFeed] 🔍 Checking subject-specific announcement "${announcement.title}":`, {
            targetSubjects,
            userEnrolledSubjects,
            hasAccess
          });
          
          return hasAccess;
        }

        // Other roles cannot see subject-specific announcements
        return false;
      }

      return true;
    });

    console.log(`[AnnouncementsFeed] 👁️ Filtered ${visible.length} visible announcements from ${announcements.length} total (Role: ${currentUserRole})`);
    return visible;
  };

  // Filter and search announcements
  const filteredAnnouncements = getVisibleAnnouncements().filter((announcement) => {
    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      announcement.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      announcement.postedByName.toLowerCase().includes(searchQuery.toLowerCase());

    // Role filter
    const matchesRole =
      filterRole === "all" || announcement.postedByRole === filterRole;

    return matchesSearch && matchesRole;
  });

  // Sort: Pinned first, then by date
  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    // Pinned announcements first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // Then by date (newest first)
    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });

  if (loading) {
    return <LoadingState message="Loading announcements..." />;
  }

  const visibleCount = getVisibleAnnouncements().length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Megaphone}
        title="Announcements"
        description="Stay updated with the latest school news and announcements"
        action={
          canPost ? (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
          ) : undefined
        }
      />

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search announcements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter by Role */}
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Teacher">Teacher</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters */}
          {(searchQuery || filterRole !== "all") && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery("")}
                    className="ml-2 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filterRole !== "all" && (
                <Badge variant="secondary">
                  Role: {filterRole}
                  <button
                    onClick={() => setFilterRole("all")}
                    className="ml-2 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900/30 flex items-center justify-center">
                <Megaphone className="h-6 w-6 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
              </div>
              <div>
                <div className="text-2xl tabular-nums">{visibleCount}</div>
                <div className="text-sm text-muted-foreground">Visible Announcements</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Pin className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-2xl tabular-nums">
                  {getVisibleAnnouncements().filter((a) => a.isPinned).length}
                </div>
                <div className="text-sm text-muted-foreground">Pinned</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Megaphone className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl tabular-nums">
                  {sortedAnnouncements.length}
                </div>
                <div className="text-sm text-muted-foreground">Showing</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student Debug Info - Shows enrolled subjects */}
      {currentUserRole === "Student" && userEnrolledSubjects.length > 0 && (
        <div className="p-4 border rounded-lg bg-blue-bayoux-50 dark:bg-blue-bayoux-950/20 border-blue-bayoux-200 dark:border-blue-bayoux-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-bayoux-100 dark:bg-blue-bayoux-900/30 flex items-center justify-center flex-shrink-0">
              <BookOpen className="h-5 w-5 text-blue-bayoux-600 dark:text-blue-bayoux-400" />
            </div>
            <div className="flex-1">
              <div className="text-foreground mb-1">
                You're enrolled in {userEnrolledSubjects.length} subject{userEnrolledSubjects.length !== 1 ? 's' : ''}
              </div>
              <div className="text-sm text-muted-foreground">
                You can view subject-specific announcements from teachers for the subjects you're enrolled in.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {sortedAnnouncements.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <EmptyState
                icon={Megaphone}
                title={
                  searchQuery || filterRole !== "all"
                    ? "No announcements found"
                    : "No announcements yet"
                }
                description={
                  searchQuery || filterRole !== "all"
                    ? "Try adjusting your search or filters"
                    : canPost
                    ? "Create your first announcement to get started"
                    : "Announcements from admin and teachers will appear here"
                }
                action={
                  canPost && !searchQuery && filterRole === "all" ? (
                    <Button onClick={() => setShowCreateModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Announcement
                    </Button>
                  ) : undefined
                }
              />
            </CardContent>
          </Card>
        ) : (
          sortedAnnouncements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              currentUserRole={currentUserRole}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
            />
          ))
        )}
      </div>

      {/* Create Announcement Modal */}
      {canPost && (
        <CreateAnnouncementModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          userName={currentUserName}
          userRole={currentUserRole}
        />
      )}
    </div>
  );
}