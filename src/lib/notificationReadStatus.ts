import { doc, setDoc, getDoc, getDocs, collection, query, where, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Mark a notification as read for a specific user
 */
export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  try {
    const readStatusRef = doc(db, "notificationReadStatus", `${userId}_${notificationId}`);
    await setDoc(readStatusRef, {
      userId,
      notificationId,
      readAt: new Date(),
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

/**
 * Mark multiple notifications as read for a specific user
 */
export async function markMultipleNotificationsAsRead(userId: string, notificationIds: string[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    
    notificationIds.forEach((notificationId) => {
      const readStatusRef = doc(db, "notificationReadStatus", `${userId}_${notificationId}`);
      batch.set(readStatusRef, {
        userId,
        notificationId,
        readAt: new Date(),
      });
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    throw error;
  }
}

/**
 * Check if a notification has been read by a user
 */
export async function isNotificationRead(userId: string, notificationId: string): Promise<boolean> {
  try {
    const readStatusRef = doc(db, "notificationReadStatus", `${userId}_${notificationId}`);
    const readStatusDoc = await getDoc(readStatusRef);
    return readStatusDoc.exists();
  } catch (error) {
    console.error("Error checking notification read status:", error);
    return false;
  }
}

/**
 * Get all read notification IDs for a user
 */
export async function getReadNotificationIds(userId: string): Promise<string[]> {
  try {
    const readStatusQuery = query(
      collection(db, "notificationReadStatus"),
      where("userId", "==", userId)
    );
    const readStatusSnapshot = await getDocs(readStatusQuery);
    return readStatusSnapshot.docs.map(doc => doc.data().notificationId);
  } catch (error) {
    console.error("Error getting read notifications:", error);
    return [];
  }
}
