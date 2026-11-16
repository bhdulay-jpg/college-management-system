import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getReadNotificationIds } from "../lib/notificationReadStatus";

export function useNotificationCount(userId: string | undefined, userRole: string | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !userRole) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        let count = 0;

        // Fetch announcements (all roles)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const announcementsQuery = query(
          collection(db, "announcements"),
          orderBy("createdAt", "desc")
        );

        // Set up real-time listener
        const unsubscribe = onSnapshot(announcementsQuery, async (announcementsSnapshot) => {
          count = 0;

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

          // Count visible announcements
          announcementsSnapshot.docs.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);

            // Only count last 7 days
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

            // Only count if visible and not read
            if (canView && !readNotificationIds.includes(docSnapshot.id)) {
              count++;
            }
          });

          // Add role-specific notification counts
          switch (userRole) {
            case "Student":
              count += await getStudentNotificationCount(userId, readNotificationIds);
              break;
            case "Admin":
              count += await getAdminNotificationCount(readNotificationIds);
              break;
            case "Registrar":
              count += await getRegistrarNotificationCount(readNotificationIds);
              break;
            case "Business Office":
              count += await getBusinessOfficeNotificationCount(readNotificationIds);
              break;
            case "Parent":
              count += await getParentNotificationCount(userId, readNotificationIds);
              break;
          }

          setUnreadCount(count);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("[useNotificationCount] Error fetching count:", error);
        setLoading(false);
      }
    };

    const unsubscribe = fetchUnreadCount();
    return () => {
      if (unsubscribe && typeof unsubscribe.then === 'function') {
        unsubscribe.then(unsub => unsub && unsub());
      }
    };
  }, [userId, userRole]);

  return { unreadCount, loading };
}

async function getStudentNotificationCount(studentId: string, readNotificationIds: string[]): Promise<number> {
  try {
    let count = 0;
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
        if (!readNotificationIds.includes(notificationId)) {
          count++;
        }
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
      if (!readNotificationIds.includes(notificationId)) {
        count++;
      }
    }

    return count;
  } catch (error) {
    console.error("Error counting student notifications:", error);
    return 0;
  }
}

async function getAdminNotificationCount(readNotificationIds: string[]): Promise<number> {
  try {
    // Pending enrollments
    const enrollmentsQuery = query(
      collection(db, "enrollments"),
      where("status", "==", "pending")
    );
    const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
    
    const notificationId = "pending-enrollments";
    return enrollmentsSnapshot.size > 0 && !readNotificationIds.includes(notificationId) ? 1 : 0;
  } catch (error) {
    console.error("Error counting admin notifications:", error);
    return 0;
  }
}

async function getRegistrarNotificationCount(readNotificationIds: string[]): Promise<number> {
  try {
    // Pending enrollments
    const enrollmentsQuery = query(
      collection(db, "enrollments"),
      where("status", "==", "pending")
    );
    const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
    
    const notificationId = "pending-enrollments-registrar";
    return enrollmentsSnapshot.size > 0 && !readNotificationIds.includes(notificationId) ? 1 : 0;
  } catch (error) {
    console.error("Error counting registrar notifications:", error);
    return 0;
  }
}

async function getBusinessOfficeNotificationCount(readNotificationIds: string[]): Promise<number> {
  try {
    // Pending payment verifications
    const paymentsQuery = query(
      collection(db, "enrollments"),
      where("paymentStatus", "==", "pending")
    );
    const paymentsSnapshot = await getDocs(paymentsQuery);
    
    const notificationId = "pending-payments";
    return paymentsSnapshot.size > 0 && !readNotificationIds.includes(notificationId) ? 1 : 0;
  } catch (error) {
    console.error("Error counting business office notifications:", error);
    return 0;
  }
}

async function getParentNotificationCount(parentId: string, readNotificationIds: string[]): Promise<number> {
  try {
    let count = 0;
    // Get linked student(s)
    const parentDoc = await getDocs(query(
      collection(db, "users"),
      where("parentId", "==", parentId)
    ));

    for (const studentDoc of parentDoc.docs) {
      const studentId = studentDoc.id;
      count += await getStudentNotificationCount(studentId, readNotificationIds);
    }

    return count;
  } catch (error) {
    console.error("Error counting parent notifications:", error);
    return 0;
  }
}