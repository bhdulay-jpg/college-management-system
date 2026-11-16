/**
 * Schedule Day Utilities
 * Handles multi-day scheduling with abbreviated day formats
 */

// Full day names
export const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Day abbreviations (2 characters for consistency)
export const DAY_ABBREVIATIONS: Record<string, string> = {
  "Monday": "M",
  "Tuesday": "T",
  "Wednesday": "W",
  "Thursday": "Th",
  "Friday": "F",
  "Saturday": "S"
};

// Reverse mapping
export const ABBREVIATION_TO_DAY: Record<string, string> = {
  "M": "Monday",
  "T": "Tuesday",
  "W": "Wednesday",
  "Th": "Thursday",
  "F": "Friday",
  "S": "Saturday"
};

/**
 * Convert an array of full day names to abbreviated format
 * Example: ["Monday", "Wednesday"] => "MW"
 * Example: ["Tuesday", "Thursday"] => "TTh"
 */
export function daysToAbbreviation(days: string[]): string {
  if (!days || days.length === 0) return "";
  
  // Sort days by week order
  const sortedDays = [...days].sort((a, b) => 
    DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b)
  );
  
  return sortedDays.map(day => DAY_ABBREVIATIONS[day] || day).join("");
}

/**
 * Convert abbreviated format to array of full day names
 * Example: "MW" => ["Monday", "Wednesday"]
 * Example: "TTh" => ["Tuesday", "Thursday"]
 */
export function abbreviationToDays(abbr: string): string[] {
  if (!abbr) return [];
  
  const days: string[] = [];
  let i = 0;
  
  while (i < abbr.length) {
    // Check for two-character abbreviations first (Th, Sa)
    if (i + 1 < abbr.length) {
      const twoChar = abbr.substring(i, i + 2);
      if (ABBREVIATION_TO_DAY[twoChar]) {
        days.push(ABBREVIATION_TO_DAY[twoChar]);
        i += 2;
        continue;
      }
    }
    
    // Single character abbreviation
    const oneChar = abbr.charAt(i);
    if (ABBREVIATION_TO_DAY[oneChar]) {
      days.push(ABBREVIATION_TO_DAY[oneChar]);
    }
    i++;
  }
  
  return days;
}

/**
 * Check if the abbreviated format represents a single day
 */
export function isSingleDay(abbr: string): boolean {
  return abbreviationToDays(abbr).length === 1;
}

/**
 * Get display text for abbreviated days
 * Example: "MW" => "Mon, Wed"
 * Example: "TTh" => "Tue, Thu"
 */
export function getDisplayDays(abbr: string): string {
  const days = abbreviationToDays(abbr);
  return days.map(day => day.substring(0, 3)).join(", ");
}

/**
 * Common day combinations for quick selection
 */
export const COMMON_DAY_PATTERNS = [
  { label: "Monday & Wednesday", value: ["Monday", "Wednesday"], abbr: "MW" },
  { label: "Tuesday & Thursday", value: ["Tuesday", "Thursday"], abbr: "TTh" },
  { label: "Monday, Wednesday & Friday", value: ["Monday", "Wednesday", "Friday"], abbr: "MWF" },
  { label: "Tuesday, Thursday & Friday", value: ["Tuesday", "Thursday", "Friday"], abbr: "TThF" },
  { label: "Monday to Friday", value: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], abbr: "MTWThF" },
  { label: "Saturday", value: ["Saturday"], abbr: "S" },
];

/**
 * Check if two schedules have overlapping days
 */
export function hasOverlappingDays(days1: string, days2: string): boolean {
  const daysArray1 = abbreviationToDays(days1);
  const daysArray2 = abbreviationToDays(days2);
  
  return daysArray1.some(day => daysArray2.includes(day));
}

/**
 * Check if two schedules conflict (same days AND overlapping times)
 */
export function hasScheduleConflict(
  schedule1: { dayOfWeek: string; startTime: string; endTime: string },
  schedule2: { dayOfWeek: string; startTime: string; endTime: string }
): boolean {
  // Check if days overlap
  if (!hasOverlappingDays(schedule1.dayOfWeek, schedule2.dayOfWeek)) {
    return false;
  }
  
  // Check if times overlap
  const start1 = schedule1.startTime;
  const end1 = schedule1.endTime;
  const start2 = schedule2.startTime;
  const end2 = schedule2.endTime;
  
  return start1 < end2 && end1 > start2;
}

/**
 * Get badge color for day abbreviation display
 */
export function getDayBadgeColor(abbr: string): string {
  const dayCount = abbreviationToDays(abbr).length;
  
  if (dayCount === 1) {
    return "bg-primary/10 text-primary border-primary/20";
  } else if (dayCount === 2) {
    return "bg-success/10 text-success border-success/20";
  } else if (dayCount === 3) {
    return "bg-info/10 text-info border-info/20";
  } else {
    return "bg-warning/10 text-warning border-warning/20";
  }
}

/**
 * Validate day abbreviation format
 */
export function isValidDayAbbreviation(abbr: string): boolean {
  if (!abbr) return false;
  const days = abbreviationToDays(abbr);
  return days.length > 0;
}

/**
 * Format time from 24h to 12h format
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}
