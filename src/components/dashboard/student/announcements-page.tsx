"use client";

import { useState, useEffect } from "react";
import { AnnouncementsFeed } from "../shared/announcements-feed";
import { auth } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { LoadingState } from "../../loading-state";
import { useAnnouncementNotifications } from "../../../hooks/use-announcement-notifications";
import { DashboardLayout } from "../dashboard-layout";

export function AnnouncementsPage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        setUserData({
          id: currentUser.uid,
          ...userDoc.data()
        });
      }
      setLoading(false);
    };

    loadUserData();
  }, []);

  const notificationCount = useAnnouncementNotifications({
    userId: userData?.id || "",
    userRole: userData?.role || "Student"
  });

  if (loading) {
    return (
      <DashboardLayout userRole="Student" userName="Student" notificationCount={notificationCount}>
        <LoadingState message="Loading announcements..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      userRole="Student"
      userName={userData?.name || "Student"}
      userId={userData?.id}
      notificationCount={notificationCount}
    >
      <AnnouncementsFeed
        currentUserRole={userData?.role || "Student"}
        currentUserId={userData?.id || ""}
        currentUserName={userData?.name || "Student"}
        canPost={false} // Students cannot post
      />
    </DashboardLayout>
  );
}