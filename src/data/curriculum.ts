export interface SubStrandInfo {
  name: string;
  lessons: number;
}

export interface StrandInfo {
  name: string;
  subStrands: SubStrandInfo[];
}

export interface SchemeRow {
  strand: string;
  subStrand: string;
  learningOutcomes: string;
  learningExperiences: string;
  inquiryQuestions: string;
  coreCompetencies: string;
  values: string;
  pcis: string;
}

export const columnHeaders = {
  en: [
    "Strand", "Sub-Strand (Lessons)", "Specific Learning Outcomes",
    "Suggested Learning Experiences", "Key Inquiry Question(s)",
    "Core Competencies", "Values", "PCIs",
  ],
  sw: [
    "Mada", "Mada Ndogo (Masomo)", "Matokeo ya Ujifunzaji",
    "Shughuli za Ujifunzaji", "Maswali ya Uchunguzi",
    "Stadi Kuu", "Maadili", "Masuala ya Kisasa",
  ],
};

export const kiswahiliSubjects = ["Kiswahili"];

export const grades = [
  "Grade 1", "Grade 2", "Grade 3",
  "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9",
];

// Exact subject names from KICD website (kicd.ac.ke)
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

// ─── Hardcoded KICD strand data (verified from official curriculum designs) ───

type CurriculumKey = string; // "Grade X|Subject"

const hardcodedStrands: Record<CurriculumKey, StrandInfo[]> = {
  "Grade 3|Creative Activities": [
    {
      name: "1.0 Creating and Executing",
      subStrands: [
        { name: "1.1 Pushing and Pulling", lessons: 14 },
        { name: "1.2 Drawing and Painting", lessons: 14 },
        { name: "1.3 Rhythm and Pattern Making", lessons: 18 },
        { name: "1.4 Skipping", lessons: 14 },
        { name: "1.5 Collage", lessons: 10 },
        { name: "1.6 Melody", lessons: 14 },
        { name: "1.7 Weaving", lessons: 14 },
      ],
    },
    {
      name: "2.0 Performing and Displaying",
      subStrands: [
        { name: "2.1 Rounds", lessons: 18 },
        { name: "2.2 Galloping", lessons: 14 },
        { name: "2.3 Sculpture", lessons: 14 },
        { name: "2.4 Forward Roll and V-balance", lessons: 14 },
        { name: "2.5 String Musical Instrument", lessons: 14 },
        { name: "2.6 Modelling and Ornament Making", lessons: 10 },
      ],
    },
    {
      name: "3.0 Appreciation",
      subStrands: [
        { name: "3.1 The Kenya National Anthem", lessons: 14 },
        { name: "3.2 Water Safety Awareness", lessons: 14 },
      ],
    },
  ],
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
export function getSubStrandsForStrand(grade: string, subject: string, strandName: string): SubStrandInfo[] | null {
  const strands = getHardcodedStrands(grade, subject);
  if (!strands) return null;
  const found = strands.find(s => s.name === strandName);
  return found?.subStrands || null;
}
