/**
 * Utility functions for handling program codes and names
 * Ensures consistency across the system when dealing with program fields
 */

/**
 * Extracts the program code from a full program string
 * @param programString - Full program string (e.g., "BSIT - Bachelor of Science in Information Technology")
 * @returns Program code only (e.g., "BSIT")
 * 
 * @example
 * extractProgramCode("BSIT - Bachelor of Science in Information Technology") // returns "BSIT"
 * extractProgramCode("BSCS") // returns "BSCS"
 */
export function extractProgramCode(programString: string): string {
  if (!programString) return "";
  
  // If the string contains " - ", extract the part before it
  if (programString.includes(" - ")) {
    return programString.split(" - ")[0].trim();
  }
  
  // Otherwise, return as is (already a short code)
  return programString.trim();
}

/**
 * Checks if two program strings match, accounting for both full and short formats
 * @param program1 - First program string
 * @param program2 - Second program string
 * @returns true if programs match
 * 
 * @example
 * programsMatch("BSIT", "BSIT - Bachelor of Science in Information Technology") // returns true
 * programsMatch("BSIT - Bachelor of Science in Information Technology", "BSIT") // returns true
 * programsMatch("BSIT", "BSCS") // returns false
 */
export function programsMatch(program1: string, program2: string): boolean {
  const code1 = extractProgramCode(program1);
  const code2 = extractProgramCode(program2);
  return code1 === code2;
}

/**
 * Normalizes a program string to its short code format for database queries
 * This ensures compatibility between old data (short codes) and new data (full names)
 * @param programString - Program string in any format
 * @returns Normalized program code
 */
export function normalizeProgramForQuery(programString: string): string {
  return extractProgramCode(programString);
}
