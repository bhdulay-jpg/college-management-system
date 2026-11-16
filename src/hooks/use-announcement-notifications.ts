import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

interface UseAnnouncementNotificationsProps {
  userId: string;
  userRole: string;
}

export function useAnnouncementNotifications({ userId, userRole }: UseAnnouncementNotificationsProps) {
  const [notificationCount, setNotificationCount] = useState(0);
  const [userEnrolledSubjects, setUserEnrolledSubjects] = useState<string[]>([]);

  // Fetch student's enrolled subjects
  useEffect(() => {
    const fetchStudentEnrollments = async () => {
      if (userRole !== "Student" || !userId) return;

      try {
        const studentSubjectsQuery = query(
          collection(db, "studentSubjects"),
          where("studentId", "==", userId),
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
      } catch (error) {
        console.error("[useAnnouncementNotifications] Error fetching enrollments:", error);
      }
    };

    fetchStudentEnrollments();
  }, [userId, userRole]);

  // Listen to announcements and count visible ones
  useEffect(() => {
    if (!userId) return;

    const announcementsRef = collection(db, "announcements");
    const q = query(announcementsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Get the last 7 days of announcements
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      let count = 0;

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);

        // Only count announcements from last 7 days
        if (createdAt < sevenDaysAgo) return;

        const visibility = data.visibility || "public";

        // Public announcements count for everyone
        if (visibility === "public") {
          count++;
          return;
        }

        // Subject-specific announcements
        if (visibility === "subject-specific") {
          // Admins and teachers see all
          if (userRole === "Admin" || userRole === "Teacher") {
            count++;
            return;
          }

          // Students see if enrolled
          if (userRole === "Student") {
            const targetSubjects = data.targetSubjectIds || [];
            const hasAccess = targetSubjects.some((subjectId: string) =>
              userEnrolledSubjects.includes(subjectId)
            );
            if (hasAccess) {
              count++;
            }
          }
        }
      });

      setNotificationCount(count);
    });

    return () => unsubscribe();
  }, [userId, userRole, userEnrolledSubjects]);

  return notificationCount;
}
