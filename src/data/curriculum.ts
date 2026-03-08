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

export const kiswahiliSubjects = ["Kiswahili Language Activities", "Kiswahili"];

// Grade levels
export const grades = [
  "Grade 1", "Grade 2", "Grade 3",
  "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9",
];

// Subjects differ by level per KICD CBC
const lowerPrimarySubjects = [
  "Literacy Activities",
  "English Language Activities",
  "Kiswahili Language Activities",
  "Mathematical Activities",
  "Environmental Activities",
  "Hygiene and Nutrition Activities",
  "Religious Education Activities (CRE)",
  "Religious Education Activities (IRE)",
  "Religious Education Activities (HRE)",
  "Movement and Creative Activities",
];

const upperPrimarySubjects = [
  "English",
  "Kiswahili",
  "Mathematics",
  "Science and Technology",
  "Social Studies",
  "Religious Education (CRE)",
  "Religious Education (IRE)",
  "Religious Education (HRE)",
  "Agriculture",
  "Home Science",
  "Creative Arts",
  "Music",
  "Physical and Health Education",
];

const juniorSecondarySubjects = [
  "English",
  "Kiswahili",
  "Mathematics",
  "Integrated Science",
  "Health Education",
  "Pre-Technical and Pre-Career Education",
  "Social Studies",
  "Religious Education (CRE)",
  "Religious Education (IRE)",
  "Religious Education (HRE)",
  "Business Studies",
  "Agriculture",
  "Creative Arts and Sports",
];

export function getSubjectsForGrade(grade: string): string[] {
  const num = parseInt(grade.replace("Grade ", ""));
  if (num >= 1 && num <= 3) return lowerPrimarySubjects;
  if (num >= 4 && num <= 6) return upperPrimarySubjects;
  if (num >= 7 && num <= 9) return juniorSecondarySubjects;
  return upperPrimarySubjects;
}
