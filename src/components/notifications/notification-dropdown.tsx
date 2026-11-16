"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Check, Megaphone, UserPlus, FileText, DollarSign, GraduationCap, AlertCircle, BookOpen, Clock } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { collection, query, orderBy, onSnapshot, where, getDocs, updateDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { formatDistanceToNow } from "date-fns";
import { Separator } from "../ui/separator";
import { useRouter } from "../router";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { markNotificationAsRead, markMultipleNotificationsAsRead, getReadNotificationIds } from "../../lib/notificationReadStatus";

type Route = string; // Allow any string for dynamic routes

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

interface NotificationDropdownProps {
  userId: string;
  userRole: string;
  notificationCount: number;
}

// Skeleton loader component
const NotificationSkeleton = () => (
  <div className="p-4 space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex gap-3 animate-pulse">
        <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-2 bg-muted rounded w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export function NotificationDropdown({ userId, userRole, notificationCount }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const router = useRouter();

  // Fetch role-based notifications with real-time updates
  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      try {
        // Fetch announcements (all roles)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const announcementsQuery = query(
          collection(db, "announcements"),
          orderBy("createdAt", "desc")
        );
        
        // Set up real-time listener for announcements
        const unsubscribe = onSnapshot(announcementsQuery, async (announcementsSnapshot) => {
          const freshNotifications: Notification[] = [];
          
          // Get read notification IDs for this user
          const readNotificationIds = await getReadNotificationIds(userId);
          
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

            // Only show last 7 days
            if (createdAt < sevenDaysAgo) return;

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
              freshNotifications.push({
                id: docSnapshot.id,
                type: "announcement",
                title: data.title,
                message: data.content?.substring(0, 100) || "",
                createdAt,
                isRead: readNotificationIds.includes(docSnapshot.id),
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
              await fetchStudentNotifications(userId, freshNotifications, readNotificationIds);
              break;
            case "Teacher":
              await fetchTeacherNotifications(userId, freshNotifications, readNotificationIds);
              break;
            case "Admin":
              await fetchAdminNotifications(freshNotifications, readNotificationIds);
              break;
            case "Registrar":
              await fetchRegistrarNotifications(freshNotifications, readNotificationIds);
              break;
            case "Business Office":
              await fetchBusinessOfficeNotifications(freshNotifications, readNotificationIds);
              break;
            case "Parent":
              await fetchParentNotifications(userId, freshNotifications, readNotificationIds);
              break;
          }

          // Sort by date
          freshNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

          // Check for new notifications
          const previousUnreadCount = notifications.filter(n => !n.isRead).length;
          const newUnreadCount = freshNotifications.filter(n => !n.isRead).length;
          
          if (notifications.length > 0 && newUnreadCount > previousUnreadCount) {
            setHasNewNotification(true);
            setTimeout(() => setHasNewNotification(false), 3000);
          }

          setNotifications(freshNotifications.slice(0, 20)); // Limit to 20 most recent
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("[NotificationDropdown] Error fetching notifications:", error);
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

  // Student-specific notifications
  const fetchStudentNotifications = async (studentId: string, notifications: Notification[], readNotificationIds: string[]) => {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // Recent grades
      const gradesQuery = query(
        collection(db, "grades"),
        where("studentId", "==", studentId)
      );
      const gradesSnapshot = await getDocs(gradesQuery);
      
      gradesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.() || new Date();
        
        if (createdAt > threeDaysAgo && data.finalGrade) {
          const notificationId = `grade-${doc.id}`;
          notifications.push({
            id: notificationId,
            type: "grade",
            title: "New Grade Posted",
            message: `Your grade for ${data.subjectCode} has been posted: ${data.finalGrade}`,
            createdAt,
            isRead: readNotificationIds.includes(notificationId)
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
        if (date > threeDaysAgo) recentAbsences++;
      });

      if (recentAbsences > 0) {
        const notificationId = `attendance-alert-${studentId}`;
        notifications.push({
          id: notificationId,
          type: "attendance",
          title: "Attendance Alert",
          message: `You have ${recentAbsences} absence(s) recorded in the last 3 days`,
          createdAt: new Date(),
          isRead: readNotificationIds.includes(notificationId)
        });
      }
    } catch (error) {
      console.error("Error fetching student notifications:", error);
    }
  };

  // Teacher-specific notifications
  const fetchTeacherNotifications = async (teacherId: string, notifications: Notification[], readNotificationIds: string[]) => {
    try {
      // No specific teacher notifications yet
    } catch (error) {
      console.error("Error fetching teacher notifications:", error);
    }
  };

  // Admin-specific notifications
  const fetchAdminNotifications = async (notifications: Notification[], readNotificationIds: string[]) => {
    try {
      // Pending enrollments
      const enrollmentsQuery = query(
        collection(db, "enrollments"),
        where("status", "==", "pending")
      );
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      
      if (enrollmentsSnapshot.size > 0) {
        const notificationId = "pending-enrollments";
        notifications.push({
          id: notificationId,
          type: "enrollment",
          title: "Pending Enrollments",
          message: `${enrollmentsSnapshot.size} enrollment application(s) awaiting review`,
          createdAt: new Date(),
          isRead: readNotificationIds.includes(notificationId),
          actionUrl: "dashboard/admin/enrollments"
        });
      }
    } catch (error) {
      console.error("Error fetching admin notifications:", error);
    }
  };

  // Registrar-specific notifications
  const fetchRegistrarNotifications = async (notifications: Notification[], readNotificationIds: string[]) => {
    try {
      // Pending enrollments
      const enrollmentsQuery = query(
        collection(db, "enrollments"),
        where("status", "==", "pending")
      );
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      
      if (enrollmentsSnapshot.size > 0) {
        const notificationId = "pending-enrollments-registrar";
        notifications.push({
          id: notificationId,
          type: "enrollment",
          title: "Pending Applications",
          message: `${enrollmentsSnapshot.size} enrollment application(s) need review`,
          createdAt: new Date(),
          isRead: readNotificationIds.includes(notificationId),
          actionUrl: "dashboard/registrar/enrollments"
        });
      }
    } catch (error) {
      console.error("Error fetching registrar notifications:", error);
    }
  };

  // Business Office-specific notifications
  const fetchBusinessOfficeNotifications = async (notifications: Notification[], readNotificationIds: string[]) => {
    try {
      // Pending payment verifications
      const paymentsQuery = query(
        collection(db, "enrollments"),
        where("paymentStatus", "==", "pending")
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      
      if (paymentsSnapshot.size > 0) {
        const notificationId = "pending-payments";
        notifications.push({
          id: notificationId,
          type: "payment",
          title: "Payment Verification",
          message: `${paymentsSnapshot.size} payment(s) awaiting verification`,
          createdAt: new Date(),
          isRead: readNotificationIds.includes(notificationId),
          actionUrl: "dashboard/business-office/payments"
        });
      }
    } catch (error) {
      console.error("Error fetching business office notifications:", error);
    }
  };

  // Parent-specific notifications
  const fetchParentNotifications = async (parentId: string, notifications: Notification[], readNotificationIds: string[]) => {
    try {
      // Get linked student(s)
      const parentDoc = await getDocs(query(
        collection(db, "users"),
        where("parentId", "==", parentId)
      ));

      for (const studentDoc of parentDoc.docs) {
        const studentId = studentDoc.id;
        await fetchStudentNotifications(studentId, notifications, readNotificationIds);
      }
    } catch (error) {
      console.error("Error fetching parent notifications:", error);
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "announcement":
        return <Megaphone className="h-4 w-4" />;
      case "enrollment":
        return <UserPlus className="h-4 w-4" />;
      case "payment":
        return <DollarSign className="h-4 w-4" />;
      case "grade":
        return <GraduationCap className="h-4 w-4" />;
      case "attendance":
        return <Clock className="h-4 w-4" />;
      case "system":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "announcement":
        return "text-blue-600 bg-blue-50";
      case "enrollment":
        return "text-green-600 bg-green-50";
      case "payment":
        return "text-yellow-600 bg-yellow-50";
      case "grade":
        return "text-purple-600 bg-purple-50";
      case "attendance":
        return "text-orange-600 bg-orange-50";
      case "system":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Mark all notifications as read
  const handleMarkAllRead = useCallback(async () => {
    const unreadNotificationIds = notifications
      .filter(n => !n.isRead)
      .map(n => n.id);
    
    if (unreadNotificationIds.length === 0) return;
    
    // Update local state immediately for UI responsiveness
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    
    // Persist to Firebase
    try {
      await markMultipleNotificationsAsRead(userId, unreadNotificationIds);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark notifications as read");
      // Revert local state on error
      setNotifications(prev => prev.map(n => ({
        ...n,
        isRead: unreadNotificationIds.includes(n.id) ? false : n.isRead
      })));
    }
  }, [notifications, userId]);

  // Mark individual notification as read
  const handleMarkAsRead = useCallback(async (id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (!notification || notification.isRead) return;
    
    // Update local state immediately for UI responsiveness
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    
    // Persist to Firebase
    try {
      await markNotificationAsRead(userId, id);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Revert local state on error
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: false } : n)
      );
    }
  }, [notifications, userId]);

  // Handle notification click
  const handleNotificationClick = useCallback(async (notification: Notification) => {
    await handleMarkAsRead(notification.id);
    if (notification.actionUrl) {
      setOpen(false);
      router.navigate(notification.actionUrl as any);
    }
  }, [handleMarkAsRead, router]);

  // Navigate to full notifications page
  const handleViewAll = useCallback(() => {
    setOpen(false);
    // Navigate to role-specific notifications page
    const notificationsRoute = `dashboard/${userRole.toLowerCase().replace(" ", "-")}/notifications` as Route;
    router.navigate(notificationsRoute);
  }, [userRole, router]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`relative ${hasNewNotification ? 'animate-pulse' : ''}`}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -right-1 -top-1"
            >
              <Badge
                variant="destructive"
                className="h-5 min-w-5 rounded-full px-1 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            </motion.div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[90vw] sm:w-96 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">Notifications</h3>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs hover:bg-muted transition-colors" 
              onClick={handleMarkAllRead}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[60vh] sm:h-[400px]">
          {loading ? (
            <NotificationSkeleton />
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              <AnimatePresence mode="popLayout">
                {notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 hover:bg-muted/50 cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                      !notification.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <motion.div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}`}
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        {getNotificationIcon(notification.type)}
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm leading-tight">
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <motion.div 
                              className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring" }}
                            />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                          </p>
                          {notification.metadata?.postedBy && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <p className="text-xs text-muted-foreground truncate">
                                {notification.metadata.postedBy}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button 
                variant="ghost" 
                className="w-full text-xs hover:bg-muted transition-colors" 
                size="sm" 
                onClick={handleViewAll}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}