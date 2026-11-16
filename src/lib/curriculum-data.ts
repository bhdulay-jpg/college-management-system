// BSCS (Bachelor of Science in Computer Science) Curriculum Data
// Structured by Year and Semester with Course Code, Title, Units, and Prerequisites

export interface CurriculumSubject {
  code: string;
  name: string;
  units: number;
  prerequisites: string[];
  year: number;
  semester: number;
  category: string;
  description?: string;
}

export const BSCS_CURRICULUM: CurriculumSubject[] = [
  // YEAR 1 — SEMESTER 1
  {
    code: "CS101",
    name: "Introduction to Computing",
    units: 3,
    prerequisites: [],
    year: 1,
    semester: 1,
    category: "CORE",
    description: "Fundamental concepts of computing, computer systems, and information technology."
  },
  {
    code: "CS102",
    name: "Computer Programming I",
    units: 3,
    prerequisites: [],
    year: 1,
    semester: 1,
    category: "CORE",
    description: "Introduction to programming concepts, problem-solving, and algorithm development."
  },
  {
    code: "MATH101",
    name: "Discrete Mathematics",
    units: 3,
    prerequisites: [],
    year: 1,
    semester: 1,
    category: "MATH",
    description: "Topics in logic, sets, relations, functions, graphs, and combinatorics for CS."
  },
  {
    code: "GE101",
    name: "Purposive Communication",
    units: 3,
    prerequisites: [],
    year: 1,
    semester: 1,
    category: "GE",
    description: "Enhances written, oral, and digital communication skills in professional contexts."
  },
  {
    code: "PE101",
    name: "Physical Education 1",
    units: 2,
    prerequisites: [],
    year: 1,
    semester: 1,
    category: "PE",
    description: "Promotes physical fitness, movement skills, and wellness."
  },
  {
    code: "NSTP1",
    name: "National Service Training Program 1",
    units: 3,
    prerequisites: [],
    year: 1,
    semester: 1,
    category: "NSTP",
    description: "Civic engagement, citizenship training, and community service orientation."
  },

  // YEAR 1 — SEMESTER 2
  {
    code: "CS103",
    name: "Computer Programming 2",
    units: 3,
    prerequisites: ["CS102"],
    year: 1,
    semester: 2,
    category: "CORE",
    description: "Advanced programming concepts including functions, arrays, files, and basic OOP."
  },
  {
    code: "MATH102",
    name: "Calculus 1",
    units: 3,
    prerequisites: ["MATH101"],
    year: 1,
    semester: 2,
    category: "MATH",
    description: "Limits, continuity, derivatives, and basic applications."
  },
  {
    code: "CS104",
    name: "Data Structures & Algorithms",
    units: 3,
    prerequisites: ["CS103"],
    year: 1,
    semester: 2,
    category: "CORE",
    description: "Fundamental data structures and algorithm implementation techniques.."
  },
  {
    code: "GE103",
    name: "Art Appreciation",
    units: 3,
    prerequisites: [],
    year: 1,
    semester: 2,
    category: "GE",
    description: "Understanding, analyzing, and appreciating works of art."
  },
  {
    code: "PE102",
    name: "Physical Education 2",
    units: 2,
    prerequisites: ["PE101"],
    year: 1,
    semester: 2,
    category: "PE",
    description: "Continued development of fitness, dance, and sports fundamentals."
  },
  {
    code: "NSTP2",
    name: "National Service Training Program 2",
    units: 3,
    prerequisites: ["NSTP1"],
    year: 1,
    semester: 2,
    category: "NSTP",
    description: "Community project implementation and leadership development."
  },

 
];

// Helper function to get subjects by year and semester
export function getSubjectsByYearSemester(year: number, semester: number): CurriculumSubject[] {
  return BSCS_CURRICULUM.filter(
    subject => subject.year === year && subject.semester === semester
  );
}

// Helper function to get total units by year
export function getTotalUnitsByYear(year: number): number {
  return BSCS_CURRICULUM
    .filter(subject => subject.year === year)
    .reduce((total, subject) => total + subject.units, 0);
}

// Helper function to get total units by year and semester
export function getTotalUnitsByYearSemester(year: number, semester: number): number {
  return BSCS_CURRICULUM
    .filter(subject => subject.year === year && subject.semester === semester)
    .reduce((total, subject) => total + subject.units, 0);
}

// Helper function to get all prerequisite subjects
export function getPrerequisites(subjectCode: string): CurriculumSubject[] {
  const subject = BSCS_CURRICULUM.find(s => s.code === subjectCode);
  if (!subject || !subject.prerequisites.length) return [];
  
  return BSCS_CURRICULUM.filter(s => subject.prerequisites.includes(s.code));
}

// Helper function to calculate total curriculum units
export function getTotalCurriculumUnits(): number {
  return BSCS_CURRICULUM.reduce((total, subject) => total + subject.units, 0);
}

// Helper function to get subjects by category
export function getSubjectsByCategory(category: string): CurriculumSubject[] {
  return BSCS_CURRICULUM.filter(subject => subject.category === category);
}

// Helper function to format semester display
export function formatSemester(semester: number): string {
  return semester === 1 ? "1st Semester" : "2nd Semester";
}

// Helper function to format year level display
export function formatYearLevel(year: number): string {
  const suffixes = ["st", "nd", "rd", "th"];
  const suffix = year <= 3 ? suffixes[year - 1] : suffixes[3];
  return `${year}${suffix} Year`;
}
