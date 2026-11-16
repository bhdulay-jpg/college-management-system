"use client";

import { useState, useEffect } from "react";
import { AnnouncementsFeed } from "../shared/announcements-feed";
import { DashboardLayout } from "../dashboard-layout";
import { auth } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { LoadingState } from "../../loading-state";

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

  if (loading) {
    return <LoadingState message="Loading announcements..." />;
  }

  return (
    <DashboardLayout userRole="Parent" userName={userData?.name || "Parent"} notificationCount={0}>
      <AnnouncementsFeed
        currentUserRole={userData?.role || "Parent"}
        currentUserId={userData?.id || ""}
        currentUserName={userData?.name || "Parent"}
        canPost={false} // Parents can only view
      />
    </DashboardLayout>
  );
}