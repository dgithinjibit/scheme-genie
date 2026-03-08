export interface SubStrandInfo {
  name: string;
  lessons: number;
  /** Official KICD learning outcomes for this sub-strand */
  learningOutcomes?: string[];
  /** Official KICD suggested learning experiences */
  suggestedExperiences?: string[];
  /** Official KICD key inquiry question */
  keyInquiryQuestion?: string;
}

export interface StrandInfo {
  name: string;
  subStrands: SubStrandInfo[];
}

export interface SchemeRow {
  week: number;
  lesson: number;
  strand: string;
  subStrand: string;
  specificLearningOutcome: string;
  keyInquiryQuestion: string;
  learningExperiences: string;
  learningResources: string;
  assessmentMethods: string;
  reflection: string;
}

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
// Lower Primary (Grades 1-3)
const lowerPrimaryLessons: Record<string, number> = {
  "Indigenous Language": 2,
  "Kiswahili": 4,
  "English Activities": 5,
  "Mathematics": 5,
  "CRE": 3, "HRE": 3, "IRE": 3,
  "Environmental Activities": 4,
  "Creative Activities": 7,
};

// Upper Primary (Grades 4-6)
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

// Junior Secondary (Grades 7-9)
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
  // ─── Grade 1 Creative Activities (from KICD Curriculum Design 2024, pp.13) ───
  "Grade 1|Creative Activities": [
    {
      name: "1.0 Creating and Executing",
      subStrands: [
        { name: "1.1 Jumping", lessons: 14 },
        { name: "1.2 Rhythm", lessons: 14 },
        { name: "1.3 Drawing", lessons: 14 },
        { name: "1.4 Stretching", lessons: 14 },
        { name: "1.5 Painting and Colouring", lessons: 14 },
        { name: "1.6 Melody", lessons: 14 },
        { name: "1.7 Pattern Making", lessons: 10 },
      ],
    },
    {
      name: "2.0 Performing and Displaying",
      subStrands: [
        { name: "2.1 Singing Games - Kenyan Style", lessons: 13 },
        { name: "2.2 Throwing and Catching", lessons: 14 },
        { name: "2.3 Paper Craft", lessons: 10 },
        { name: "2.4 Log Roll and T Balances", lessons: 14 },
        { name: "2.5 Songs - Action Songs", lessons: 13 },
        { name: "2.6 Modelling", lessons: 14 },
        { name: "2.7 Percussion Musical Instruments", lessons: 10 },
      ],
    },
    {
      name: "3.0 Appreciation",
      subStrands: [
        { name: "3.1 Musical Sounds", lessons: 14 },
        { name: "3.2 Water Safety Awareness", lessons: 14 },
      ],
    },
  ],

  // ─── Grade 3 Creative Activities (from KICD Curriculum Design 2024) ───
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

  // ─── Grade 1 CRE (from KICD Curriculum Design, verified from official PDF) ───
  "Grade 1|CRE": [
    {
      name: "1.0 Creation",
      subStrands: [
        {
          name: "1.1 Self-Awareness",
          lessons: 5,
          learningOutcomes: [
            "identify their uniqueness as guided by the word of God",
            "state their gender according to Genesis 1:27",
            "appreciate that God knows them by their names",
          ],
          suggestedExperiences: [
            "in pairs read Genesis 1:27",
            "say why they are a special creation",
            "sing songs related to their uniqueness",
            "state their gender as guided by Genesis 1:27",
            "draw and colour a picture of a boy and a girl",
            "in turns read Isaiah 43:1",
            "write their names on flashcards and display them in class",
            "sing songs related to their names",
            "watch a clip of a palm of a hand with a name on it",
            "draw the palm of a hand and write their names",
            "Sing the song, 'I am fearfully and wonderfully made'",
            "memorise Isaiah 49:16",
          ],
          keyInquiryQuestion: "What makes you a special creation?",
        },
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
