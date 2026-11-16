/**
 * Local Storage Utility Functions
 * For managing app-related data in browser storage
 */

const STORAGE_KEYS = {
  ENROLLMENT_DRAFT: 'enrollment_draft',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
} as const;

/**
 * Clear all CollegeConnect data from local storage
 */
export function clearAllStorage(): void {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('✅ All local storage cleared');
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
}

/**
 * Clear only enrollment draft data
 */
export function clearEnrollmentDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ENROLLMENT_DRAFT);
    console.log('✅ Enrollment draft cleared');
  } catch (error) {
    console.error('Error clearing enrollment draft:', error);
  }
}

/**
 * Get item from local storage with error handling
 */
export function getStorageItem<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading ${key} from storage:`, error);
    return null;
  }
}

/**
 * Set item in local storage with error handling
 */
export function setStorageItem(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
}

export { STORAGE_KEYS };
