/**
 * Format Firebase Timestamp or Date object to readable string
 */
export function formatDate(date: any): string {
  if (!date) return "N/A";
  
  try {
    // If it's a Firebase Timestamp with toDate() method
    if (date.toDate && typeof date.toDate === 'function') {
      return date.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    // If it's already a Date object
    if (date instanceof Date) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    // If it's a timestamp string or number
    if (typeof date === 'string' || typeof date === 'number') {
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    }
    
    return "N/A";
  } catch (error) {
    console.error('Error formatting date:', error);
    return "N/A";
  }
}

/**
 * Format Firebase Timestamp to short date (MM/DD/YYYY)
 */
export function formatDateShort(date: any): string {
  if (!date) return "N/A";
  
  try {
    // If it's a Firebase Timestamp with toDate() method
    if (date.toDate && typeof date.toDate === 'function') {
      return date.toDate().toLocaleDateString('en-US');
    }
    
    // If it's already a Date object
    if (date instanceof Date) {
      return date.toLocaleDateString('en-US');
    }
    
    // If it's a timestamp string or number
    if (typeof date === 'string' || typeof date === 'number') {
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString('en-US');
      }
    }
    
    return "N/A";
  } catch (error) {
    console.error('Error formatting date:', error);
    return "N/A";
  }
}

/**
 * Format Firebase Timestamp to date and time
 */
export function formatDateTime(date: any): string {
  if (!date) return "N/A";
  
  try {
    // If it's a Firebase Timestamp with toDate() method
    if (date.toDate && typeof date.toDate === 'function') {
      return date.toDate().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    
    // If it's already a Date object
    if (date instanceof Date) {
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    
    // If it's a timestamp string or number
    if (typeof date === 'string' || typeof date === 'number') {
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
    }
    
    return "N/A";
  } catch (error) {
    console.error('Error formatting date:', error);
    return "N/A";
  }
}
