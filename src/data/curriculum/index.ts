// Re-export types
export type { SubStrandInfo, StrandInfo, SchemeRow } from "./types";

// Re-export grade data
export { grade1CreativeActivities, grade3CreativeActivities } from "./lower-primary/creative-activities";
export { grade1CRE } from "./lower-primary/cre";
export { grade1HRE, grade2HRE, grade3HRE } from "./lower-primary/hre";
export {
  grade1EnvironmentalActivities,
  grade2EnvironmentalActivities,
  grade3EnvironmentalActivities,
} from "./lower-primary/environmental-activities";
export {
  grade1EnglishActivities,
  grade2EnglishActivities,
  grade3EnglishActivities,
} from "./lower-primary/english-activities";

import type { StrandInfo } from "./types";
import { grade1CreativeActivities, grade3CreativeActivities } from "./lower-primary/creative-activities";
import { grade1CRE } from "./lower-primary/cre";
import { grade1HRE, grade2HRE, grade3HRE } from "./lower-primary/hre";
import {
  grade1EnvironmentalActivities,
  grade2EnvironmentalActivities,
  grade3EnvironmentalActivities,
} from "./lower-primary/environmental-activities";
import {
  grade1EnglishActivities,
  grade2EnglishActivities,
  grade3EnglishActivities,
} from "./lower-primary/english-activities";

// ─── Strand registry keyed by "Grade X|Subject" ───

type CurriculumKey = string;

const hardcodedStrands: Record<CurriculumKey, StrandInfo[]> = {
  "Grade 1|Creative Activities": grade1CreativeActivities,
  "Grade 3|Creative Activities": grade3CreativeActivities,
  "Grade 1|CRE": grade1CRE,
  "Grade 1|HRE": grade1HRE,
  "Grade 2|HRE": grade2HRE,
  "Grade 3|HRE": grade3HRE,
  "Grade 1|Environmental Activities": grade1EnvironmentalActivities,
  "Grade 2|Environmental Activities": grade2EnvironmentalActivities,
  "Grade 3|Environmental Activities": grade3EnvironmentalActivities,
  "Grade 1|English Activities": grade1EnglishActivities,
  "Grade 2|English Activities": grade2EnglishActivities,
  "Grade 3|English Activities": grade3EnglishActivities,
};

/**
 * Get hardcoded strands for a grade+subject combo.
 * Returns null if not yet hardcoded (will fall back to AI).
 */
export function getHardcodedStrands(grade: string, subject: string): StrandInfo[] | null {
  return hardcodedStrands[`${grade}|${subject}`] || null;
}

/**
 * Get sub-strands for a specific strand within a grade+subject.
 */
export function getSubStrandsForStrand(grade: string, subject: string, strandName: string): import("./types").SubStrandInfo[] | null {
  const strands = getHardcodedStrands(grade, subject);
  if (!strands) return null;
  const found = strands.find(s => s.name === strandName);
  return found?.subStrands || null;
}

// ─── Shared constants and utility functions ───

export const columnHeaders = {
  en: [
    "WK", "LSN", "Strand", "Sub-Strand",
    "Specific Learning Outcome", "Key Inquiry Question",
    "Learning Experiences", "Learning Resources",
    "Assessment Methods", "Refl",
  ],
  sw: [
    "WK", "LSN", "Mada", "Mada Ndogo",
    "Matokeo ya Ujifunzaji", "Swali la Uchunguzi",
    "Shughuli za Ujifunzaji", "Rasilimali za Kujifunza",
    "Mbinu za Tathmini", "Tafak",
  ],
};

export const kiswahiliSubjects = ["Kiswahili"];

// Official KICD lesson allocation per week by grade level
const lowerPrimaryLessons: Record<string, number> = {
  "Indigenous Language": 2,
  "Kiswahili": 4,
  "English Activities": 5,
  "Mathematics": 5,
  "CRE": 3, "HRE": 3, "IRE": 3,
  "Environmental Activities": 4,
  "Creative Activities": 7,
};

const upperPrimaryLessons: Record<string, number> = {
  "English": 5,
  "Kiswahili": 4,
  "Mathematics": 5,
  "Science & Technology": 4,
  "Social Studies": 3,
  "Agriculture": 2,
  "Creative Arts": 3,
  "CRE": 3, "HRE": 3, "IRE": 3,
  "Arabic": 2, "French": 2, "German": 2, "Mandarin": 2,
  "Indigenous Language": 2,
};

const juniorSecondaryLessons: Record<string, number> = {
  "English": 5,
  "Kiswahili": 4,
  "Mathematics": 5,
  "Integrated Science": 4,
  "Social Studies": 3,
  "Agriculture": 2,
  "Creative Arts": 3,
  "Pre-Technical Studies": 3,
  "CRE": 3, "HRE": 3, "IRE": 3,
  "Arabic": 2, "French": 2, "German": 2, "Mandarin": 2,
  "Indigenous Language": 2,
};

export function getLessonsPerWeek(grade: string, subject: string): number {
  const num = parseInt(grade.replace("Grade ", ""));
  let map: Record<string, number>;
  if (num >= 1 && num <= 3) map = lowerPrimaryLessons;
  else if (num >= 4 && num <= 6) map = upperPrimaryLessons;
  else map = juniorSecondaryLessons;
  return map[subject] || 5;
}

export const grades = [
  "Grade 1", "Grade 2", "Grade 3",
  "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9",
];

const lowerPrimarySubjects = [
  "Creative Activities",
  "CRE",
  "English Activities",
  "Environmental Activities",
  "HRE",
  "IRE",
  "Kiswahili",
  "Mathematics",
];

const upperPrimarySubjects = [
  "Agriculture",
  "Arabic",
  "Creative Arts",
  "CRE",
  "English",
  "French",
  "German",
  "HRE",
  "Indigenous Language",
  "IRE",
  "Kiswahili",
  "Mandarin",
  "Mathematics",
  "Science & Technology",
  "Social Studies",
];

const juniorSecondarySubjects = [
  "Agriculture",
  "Arabic",
  "Creative Arts",
  "CRE",
  "English",
  "French",
  "German",
  "HRE",
  "Indigenous Language",
  "Integrated Science",
  "IRE",
  "Kiswahili",
  "Mandarin",
  "Mathematics",
  "Pre-Technical Studies",
  "Social Studies",
];

export function getSubjectsForGrade(grade: string): string[] {
  const num = parseInt(grade.replace("Grade ", ""));
  if (num >= 1 && num <= 3) return lowerPrimarySubjects;
  if (num >= 4 && num <= 6) return upperPrimarySubjects;
  if (num >= 7 && num <= 9) return juniorSecondarySubjects;
  return upperPrimarySubjects;
}
