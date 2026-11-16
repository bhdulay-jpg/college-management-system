// Standardized Program Service for CollegeConnect
// Provides consistent program naming, codes, and curriculum management

export interface Program {
  code: string; // Standardized code (BSCS, BSIT, BSBA, etc.)
  name: string; // Full program name
  department: string;
  duration: string;
  totalUnits: number;
  description: string;
  hasCurriculum?: boolean; // Whether curriculum data exists
}

// Standardized program definitions
// These serve as the single source of truth for all program data
export const PROGRAMS: Program[] = [
  {
    code: "BSCS",
    name: "Bachelor of Science in Computer Science",
    department: "College of Computer Studies",
    duration: "4 years",
    totalUnits: 120,
    description: "Comprehensive program covering software development, algorithms, and computer systems.",
    hasCurriculum: true,
  },
  {
    code: "BSIT",
    name: "Bachelor of Science in Information Technology",
    department: "College of Computer Studies",
    duration: "4 years",
    totalUnits: 120,
    description: "Focus on IT infrastructure, networking, and information systems management.",
    hasCurriculum: false,
  },
  {
    code: "BSBA",
    name: "Bachelor of Science in Business Administration",
    department: "College of Business",
    duration: "4 years",
    totalUnits: 120,
    description: "Comprehensive business management and administration program.",
    hasCurriculum: false,
  },
  {
    code: "BSA",
    name: "Bachelor of Science in Accountancy",
    department: "College of Business",
    duration: "4 years",
    totalUnits: 120,
    description: "Professional accountancy program preparing students for CPA certification.",
    hasCurriculum: false,
  },
  {
    code: "BSN",
    name: "Bachelor of Science in Nursing",
    department: "College of Nursing",
    duration: "4 years",
    totalUnits: 120,
    description: "Comprehensive nursing program with clinical training.",
    hasCurriculum: false,
  },
  {
    code: "BSED",
    name: "Bachelor of Secondary Education",
    department: "College of Education",
    duration: "4 years",
    totalUnits: 120,
    description: "Professional education program preparing students to teach at the secondary level.",
    hasCurriculum: false,
  },
  {
    code: "BEED",
    name: "Bachelor of Elementary Education",
    department: "College of Education",
    duration: "4 years",
    totalUnits: 120,
    description: "Professional education program preparing students to teach at the elementary level.",
    hasCurriculum: false,
  },
  {
    code: "BSCE",
    name: "Bachelor of Science in Civil Engineering",
    department: "College of Engineering",
    duration: "5 years",
    totalUnits: 150,
    description: "Professional engineering program covering infrastructure and construction.",
    hasCurriculum: false,
  },
];

/**
 * Get program by code (e.g., "BSCS")
 */
export function getProgramByCode(code: string): Program | undefined {
  return PROGRAMS.find(p => p.code.toLowerCase() === code.toLowerCase());
}

/**
 * Get program full name from code
 */
export function getProgramName(code: string): string {
  const program = getProgramByCode(code);
  return program ? program.name : code;
}

/**
 * Get all available programs
 */
export function getAllPrograms(): Program[] {
  return PROGRAMS;
}

/**
 * Format program display (e.g., "BSCS - Bachelor of Science in Computer Science")
 */
export function formatProgramDisplay(code: string): string {
  const program = getProgramByCode(code);
  if (!program) return code;
  return `${program.code} - ${program.name}`;
}

/**
 * Validate program code
 */
export function isValidProgramCode(code: string): boolean {
  return PROGRAMS.some(p => p.code.toLowerCase() === code.toLowerCase());
}

/**
 * Get programs by department
 */
export function getProgramsByDepartment(department: string): Program[] {
  return PROGRAMS.filter(p => p.department === department);
}

/**
 * Get all unique departments
 */
export function getAllDepartments(): string[] {
  return Array.from(new Set(PROGRAMS.map(p => p.department)));
}
