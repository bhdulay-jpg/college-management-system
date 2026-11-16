"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Check, Megaphone, UserPlus, DollarSign, GraduationCap, Clock, AlertCircle, Filter, Search, X } from "lucide-react";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Input } from "../../ui/input";
import { collection, query, orderBy, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "../../router";
import { markNotificationAsRead, markMultipleNotificationsAsRead, getReadNotificationIds } from "../../../lib/notificationReadStatus";

interface Notification {
  id: string;
  type: "announcement" | "enrollment" | "payment" | "grade" | "attendance" | "system";
  title: string;
  message: string;
  createdAt: Date;
  isRead: boolean;
  actionUrl?: string;
  metadata?: any;
}

interface NotificationsPageProps {
  userId: string;
  userRole: string;
}

export function NotificationsPage({ userId, userRole }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<Notification["type"] | "all">("all");
  const router = useRouter();

  // Real-time notification fetching with onSnapshot
  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      try {
        // Fetch announcements (all roles)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const announcementsQuery = query(
          collection(db, "announcements"),
          orderBy("createdAt", "desc")
        );

        // Set up real-time listener
        const unsubscribe = onSnapshot(announcementsQuery, async (announcementsSnapshot) => {
          const allNotifications: Notification[] = [];
          
          // Get student enrolled subjects if student
          let userEnrolledSubjects: string[] = [];
          if (userRole === "Student") {
            const studentSubjectsQuery = query(
              collection(db, "studentSubjects"),
              where("studentId", "==", userId),
              where("status", "==", "enrolled")
            );
            const studentSubjectsSnapshot = await getDocs(studentSubjectsQuery);
            userEnrolledSubjects = studentSubjectsSnapshot.docs.map(doc => doc.data().subjectId);
          }

          // Process announcements
          announcementsSnapshot.docs.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);

            // Only show last 30 days
            if (createdAt < thirtyDaysAgo) return;

            const visibility = data.visibility || "public";

            // Check visibility permissions
            let canView = false;
            if (visibility === "public") {
              canView = true;
            } else if (visibility === "subject-specific") {
              if (userRole === "Admin" || userRole === "Teacher") {
                canView = true;
              } else if (userRole === "Student") {
                const targetSubjects = data.targetSubjectIds || [];
                canView = targetSubjects.some((subjectId: string) =>
                  userEnrolledSubjects.includes(subjectId)
                );
              }
            }

            if (canView) {
              allNotifications.push({
                id: docSnapshot.id,
                type: "announcement",
                title: data.title,
                message: data.content || "",
                createdAt,
                isRead: false,
                metadata: {
                  postedBy: data.postedByName,
                  visibility: data.visibility,
                  isPinned: data.isPinned
                }
              });
            }
          });

          // Role-specific notifications
          switch (userRole) {
            case "Student":
              await fetchStudentNotifications(userId, allNotifications);
              break;
            case "Teacher":
              await fetchTeacherNotifications(userId, allNotifications);
              break;
            case "Admin":
              await fetchAdminNotifications(allNotifications);
              break;
            case "Registrar":
              await fetchRegistrarNotifications(allNotifications);
              break;
            case "Business Office":
              await fetchBusinessOfficeNotifications(allNotifications);
              break;
            case "Parent":
              await fetchParentNotifications(userId, allNotifications);
              break;
          }

          // Sort by date
          allNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

          setNotifications(allNotifications);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("[NotificationsPage] Error fetching notifications:", error);
        setLoading(false);
      }
    };

    const unsubscribe = fetchNotifications();
    return () => {
      if (unsubscribe && typeof unsubscribe.then === 'function') {
        unsubscribe.then(unsub => unsub && unsub());
      }
    };
  }, [userId, userRole]);

  const fetchStudentNotifications = async (studentId: string, notifications: Notification[]) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Recent grades
      const gradesQuery = query(
        collection(db, "grades"),
        where("studentId", "==", studentId)
      );
      const gradesSnapshot = await getDocs(gradesQuery);
      
      gradesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.() || new Date();
        
        if (createdAt > thirtyDaysAgo && data.finalGrade) {
          notifications.push({
            id: `grade-${doc.id}`,
            type: "grade",
            title: "New Grade Posted",
            message: `Your grade for ${data.subjectCode} has been posted: ${data.finalGrade}`,
            createdAt,
            isRead: false
          });
        }
      });

      // Recent attendance (absences)
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("studentId", "==", studentId),
        where("status", "==", "absent")
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      let recentAbsences = 0;
      attendanceSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const date = data.date?.toDate?.() || new Date(data.date);
        if (date > thirtyDaysAgo) recentAbsences++;
      });

      if (recentAbsences > 0) {
        notifications.push({
          id: `attendance-alert`,
          type: "attendance",
          title: "Attendance Alert",
          message: `You have ${recentAbsences} absence(s) recorded in the last 30 days`,
          createdAt: new Date(),
          isRead: false
        });
      }
    } catch (error) {
      console.error("Error fetching student notifications:", error);
    }
  };

  const fetchTeacherNotifications = async (teacherId: string, notifications: Notification[]) => {
    // Teacher-specific notifications can be added here
  };

  const fetchAdminNotifications = async (notifications: Notification[]) => {
    try {
      // Pending enrollments
      const enrollmentsQuery = query(
        collection(db, "enrollments"),
        where("status", "==", "pending")
      );
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      
      if (enrollmentsSnapshot.size > 0) {
        notifications.push({
          id: "pending-enrollments",
          type: "enrollment",
          title: "Pending Enrollments",
          message: `${enrollmentsSnapshot.size} enrollment application(s) awaiting review`,
          createdAt: new Date(),
          isRead: false,
          actionUrl: "dashboard/admin/enrollments"
        });
      }
    } catch (error) {
      console.error("Error fetching admin notifications:", error);
    }
  };

  const fetchRegistrarNotifications = async (notifications: Notification[]) => {
    try {
      // Pending enrollments
      const enrollmentsQuery = query(
        collection(db, "enrollments"),
        where("status", "==", "pending")
      );
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      
      if (enrollmentsSnapshot.size > 0) {
        notifications.push({
          id: "pending-enrollments-registrar",
          type: "enrollment",
          title: "Pending Applications",
          message: `${enrollmentsSnapshot.size} enrollment application(s) need review`,
          createdAt: new Date(),
          isRead: false,
          actionUrl: "dashboard/registrar/enrollments"
        });
      }
    } catch (error) {
      console.error("Error fetching registrar notifications:", error);
    }
  };

  const fetchBusinessOfficeNotifications = async (notifications: Notification[]) => {
    try {
      // Pending payment verifications
      const paymentsQuery = query(
        collection(db, "enrollments"),
        where("paymentStatus", "==", "pending")
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      
      if (paymentsSnapshot.size > 0) {
        notifications.push({
          id: "pending-payments",
          type: "payment",
          title: "Payment Verification",
          message: `${paymentsSnapshot.size} payment(s) awaiting verification`,
          createdAt: new Date(),
          isRead: false,
          actionUrl: "dashboard/business-office/payments"
        });
      }
    } catch (error) {
      console.error("Error fetching business office notifications:", error);
    }
  };

  const fetchParentNotifications = async (parentId: string, notifications: Notification[]) => {
    try {
      // Get linked student(s)
      const parentDoc = await getDocs(query(
        collection(db, "users"),
        where("parentId", "==", parentId)
      ));

      parentDoc.docs.forEach(async (studentDoc) => {
        const studentId = studentDoc.id;
        await fetchStudentNotifications(studentId, notifications);
      });
    } catch (error) {
      console.error("Error fetching parent notifications:", error);
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "announcement":
        return <Megaphone className="h-5 w-5" />;
      case "enrollment":
        return <UserPlus className="h-5 w-5" />;
      case "payment":
        return <DollarSign className="h-5 w-5" />;
      case "grade":
        return <GraduationCap className="h-5 w-5" />;
      case "attendance":
        return <Clock className="h-5 w-5" />;
      case "system":
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "announcement":
        return "text-blue-600 bg-blue-50 dark:bg-blue-950/30";
      case "enrollment":
        return "text-green-600 bg-green-50 dark:bg-green-950/30";
      case "payment":
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30";
      case "grade":
        return "text-purple-600 bg-purple-50 dark:bg-purple-950/30";
      case "attendance":
        return "text-orange-600 bg-orange-50 dark:bg-orange-950/30";
      case "system":
        return "text-red-600 bg-red-50 dark:bg-red-950/30";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-950/30";
    }
  };

  const handleMarkAllRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    
    if (unreadIds.length === 0) return;
    
    // Update UI immediately
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    
    // Persist to Firebase
    try {
      await markMultipleNotificationsAsRead(userId, unreadIds);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark notifications as read");
      // Revert on error
      setNotifications(prev => prev.map(n => ({
        ...n,
        isRead: unreadIds.includes(n.id) ? false : n.isRead
      })));
    }
  }, [notifications, userId]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (!notification || notification.isRead) return;
    
    // Update UI immediately
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    
    // Persist to Firebase
    try {
      await markNotificationAsRead(userId, id);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Revert on error
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: false } : n)
      );
    }
  }, [notifications, userId]);

  const handleNotificationClick = useCallback(async (notification: Notification) => {
    await handleMarkAsRead(notification.id);
    if (notification.actionUrl) {
      router.navigate(notification.actionUrl as any);
    }
  }, [handleMarkAsRead, router]);

  // Group notifications by date
  const groupNotificationsByDate = (notifications: Notification[]) => {
    const grouped: { [key: string]: Notification[] } = {};
    
    notifications.forEach(notification => {
      let dateKey: string;
      if (isToday(notification.createdAt)) {
        dateKey = "Today";
      } else if (isYesterday(notification.createdAt)) {
        dateKey = "Yesterday";
      } else if (isThisWeek(notification.createdAt)) {
        dateKey = "This Week";
      } else {
        dateKey = format(notification.createdAt, "MMMM d, yyyy");
      }
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(notification);
    });
    
    return grouped;
  };

  // Filter notifications
  const filteredNotifications = notifications
    .filter(n => filter === "all" || !n.isRead)
    .filter(n => typeFilter === "all" || n.type === typeFilter)
    .filter(n => 
      searchQuery === "" || 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const groupedNotifications = groupNotificationsByDate(filteredNotifications);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl mb-1">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllRead} variant="outline" size="sm" className="w-full sm:w-auto">
            <Check className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="px-3 py-2 rounded-md border border-input bg-background text-sm"
        >
          <option value="all">All Types</option>
          <option value="announcement">Announcements</option>
          <option value="grade">Grades</option>
          <option value="attendance">Attendance</option>
          <option value="enrollment">Enrollment</option>
          <option value="payment">Payments</option>
          <option value="system">System</option>
        </select>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")} className="mb-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="all" className="flex-1 sm:flex-none">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex-1 sm:flex-none">
            Unread ({unreadCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading notifications...</p>
          </div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Bell className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg mb-2">No notifications found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || typeFilter !== "all"
                ? "Try adjusting your filters"
                : filter === "unread" 
                  ? "You're all caught up! No unread notifications."
                  : "You don't have any notifications yet."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          <AnimatePresence mode="popLayout">
            {Object.entries(groupedNotifications).map(([dateKey, dateNotifications]) => (
              <motion.div
                key={dateKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-3"
              >
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {dateKey}
                </h2>
                <div className="space-y-3">
                  {dateNotifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className={`p-4 md:p-5 transition-all hover:shadow-md cursor-pointer active:scale-[0.99] ${
                          !notification.isRead ? "border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/20" : ""
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex gap-4">
                          <motion.div 
                            className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}`}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 400 }}
                          >
                            {getNotificationIcon(notification.type)}
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-semibold">{notification.title}</h3>
                              {!notification.isRead && (
                                <Badge variant="default" className="bg-blue-600 shrink-0">New</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                              {notification.message}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatDistanceToNow(notification.createdAt, { addSuffix: true })}</span>
                              {notification.metadata?.postedBy && (
                                <>
                                  <span>•</span>
                                  <span>Posted by {notification.metadata.postedBy}</span>
                                </>
                              )}
                              {notification.metadata?.isPinned && (
                                <>
                                  <span>•</span>
                                  <Badge variant="outline" className="text-xs">Pinned</Badge>
                                </>
                              )}
                              <Badge variant="secondary" className="text-xs capitalize">
                                {notification.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}