export interface CurriculumData {
  grade: string;
  subject: string;
  strands: string[];
}

export const grades = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9",
];

export const subjects = [
  "Mathematics", "English", "Kiswahili", "Science & Technology",
  "Social Studies", "Creative Arts", "Religious Education (CRE)",
  "Health Education", "Agriculture", "Home Science",
  "Physical Education", "Music", "Art & Craft",
];

export const kiswahiliSubjects = ["Kiswahili"];

export const strandsBySubject: Record<string, string[]> = {
  Mathematics: [
    "Numbers", "Measurement", "Geometry", "Data Handling", "Algebra",
  ],
  English: [
    "Listening & Speaking", "Reading", "Writing", "Grammar", "Language Use",
  ],
  Kiswahili: [
    "Kusikiliza na Kuzungumza", "Kusoma", "Kuandika", "Sarufi", "Matumizi ya Lugha",
  ],
  "Science & Technology": [
    "Living Things", "The Environment", "Matter & Materials", "Energy", "Earth & Space",
  ],
  "Social Studies": [
    "People & Population", "Culture & Social Organisation", "Resources & Economic Activities",
    "Political Systems & Governance", "Physical Environment",
  ],
  "Creative Arts": [
    "Visual Arts", "Performing Arts", "Digital Art",
  ],
  "Religious Education (CRE)": [
    "Creation", "The Bible", "Christian Living", "Moral Values",
  ],
  "Health Education": [
    "Personal Hygiene", "Nutrition", "Diseases & Prevention", "Safety", "Mental Health",
  ],
  Agriculture: [
    "Crop Production", "Animal Production", "Soil & Water Conservation",
  ],
  "Home Science": [
    "Food & Nutrition", "Clothing & Textiles", "Home Management",
  ],
  "Physical Education": [
    "Ball Games", "Athletics", "Gymnastics", "Swimming",
  ],
  Music: [
    "Singing", "Playing Instruments", "Music Literacy", "Appreciation",
  ],
  "Art & Craft": [
    "Drawing & Painting", "Weaving", "Modelling", "Printing",
  ],
};

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

// Sample generated data for demo purposes
export function generateSampleScheme(grade: string, subject: string, strand: string): SchemeRow[] {
  const isSw = kiswahiliSubjects.includes(subject);

  const sampleData: SchemeRow[] = [
    {
      strand,
      subStrand: isSw ? "Aina za Maneno" : "Introduction & Fundamentals",
      learningOutcomes: isSw
        ? "• Mwanafunzi aweze kutambua aina mbalimbali za maneno\n• Mwanafunzi aweze kutumia maneno kwa usahihi"
        : `• I can identify key concepts in ${strand}\n• I can explain the importance of ${strand} in daily life\n• I can apply basic principles of ${strand}`,
      learningExperiences: isSw
        ? "• Kusoma maandishi mbalimbali na kutambua maneno\n• Kujadiliana katika vikundi\n• Kuandika sentensi kwa kutumia maneno mapya"
        : `• Group discussions on real-world applications of ${strand}\n• Hands-on experiments and demonstrations\n• Field observation and data collection\n• Role play and dramatization`,
      inquiryQuestions: isSw
        ? "• Kwa nini ni muhimu kujua aina za maneno?\n• Maneno yanatusaidia vipi katika mawasiliano?"
        : `• Why is ${strand} important in our daily lives?\n• How can we use ${strand} to solve real-world problems?\n• What would happen without ${strand}?`,
      coreCompetencies: isSw
        ? "Mawasiliano, Ubunifu, Ushirikiano"
        : "Communication, Critical Thinking, Creativity, Collaboration",
      values: isSw
        ? "Umoja, Uwajibikaji, Uadilifu"
        : "Unity, Responsibility, Integrity, Respect",
      pcis: isSw
        ? "Elimu ya Mazingira, Afya, Ujumuishaji"
        : "Environmental Education, Health, Social Cohesion, Life Skills",
    },
    {
      strand,
      subStrand: isSw ? "Ufahamu wa Kusoma" : "Exploration & Application",
      learningOutcomes: isSw
        ? "• Mwanafunzi aweze kusoma kwa ufasaha\n• Mwanafunzi aweze kuelewa maana ya maandishi"
        : `• I can analyze different aspects of ${strand}\n• I can compare and contrast related concepts\n• I can create solutions using ${strand} knowledge`,
      learningExperiences: isSw
        ? "• Kusoma hadithi na kujibu maswali\n• Kutumia kamusi kutafuta maana ya maneno\n• Kuandika muhtasari"
        : `• Project-based learning activities\n• Peer teaching and collaborative research\n• Digital resource exploration\n• Community engagement activities`,
      inquiryQuestions: isSw
        ? "• Kusoma kunatusaidia vipi?\n• Tunawezaje kuboresha ufahamu wetu?"
        : `• How can we apply ${strand} concepts in our community?\n• What patterns do we notice in ${strand}?\n• How does ${strand} connect to other subjects?`,
      coreCompetencies: isSw
        ? "Kufikiri kwa Kina, Ubunifu, Mawasiliano"
        : "Critical Thinking, Problem Solving, Digital Literacy, Self-Efficacy",
      values: isSw
        ? "Heshima, Upendo, Amani"
        : "Patriotism, Love, Peace, Social Justice",
      pcis: isSw
        ? "Teknolojia, Utamaduni, Haki za Binadamu"
        : "ICT Integration, Citizenship, Human Rights, Gender Equity",
    },
    {
      strand,
      subStrand: isSw ? "Utungaji wa Insha" : "Assessment & Reflection",
      learningOutcomes: isSw
        ? "• Mwanafunzi aweze kutunga insha fupi\n• Mwanafunzi aweze kutumia alama za uakifishaji"
        : `• I can evaluate my understanding of ${strand}\n• I can present findings to peers\n• I can reflect on learning and set goals`,
      learningExperiences: isSw
        ? "• Kutunga insha binafsi\n• Kusahihishana kazi katika vikundi\n• Kuwasilisha kazi mbele ya darasa"
        : `• Portfolio development and self-assessment\n• Presentation of learning outcomes\n• Peer review and feedback sessions\n• Reflective journaling`,
      inquiryQuestions: isSw
        ? "• Uandishi mzuri unaonekanaje?\n• Tunawezaje kuboresha uandishi wetu?"
        : `• What have I learned about ${strand}?\n• How can I improve my understanding?\n• Where can I apply this knowledge?`,
      coreCompetencies: isSw
        ? "Uongozi, Uwajibikaji, Mawasiliano"
        : "Learning to Learn, Leadership, Communication, Citizenship",
      values: isSw
        ? "Bidii, Uaminifu, Uwajibikaji"
        : "Diligence, Honesty, Responsibility, Excellence",
      pcis: isSw
        ? "Elimu kwa Maendeleo Endelevu, Afya ya Akili"
        : "Education for Sustainable Development, Mental Health, Financial Literacy",
    },
  ];

  return sampleData;
}
