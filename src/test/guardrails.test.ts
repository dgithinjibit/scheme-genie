import { describe, it, expect } from "vitest";

// We replicate the guardrail functions here since edge functions can't be imported directly.
// These mirror supabase/functions/generate-scheme/index.ts exactly.

interface SchemeRow {
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

function enforceWeekLessonNumbering(rows: SchemeRow[], weekStart: number, lessonsPerWeek: number): SchemeRow[] {
  let currentWeek = weekStart;
  let currentLesson = 1;
  return rows.map((row) => {
    const fixed = { ...row, week: currentWeek, lesson: currentLesson };
    currentLesson++;
    if (currentLesson > lessonsPerWeek) {
      currentLesson = 1;
      currentWeek++;
    }
    return fixed;
  });
}

function enforceStrandNames(rows: SchemeRow[], strand: string, subStrandName: string): SchemeRow[] {
  return rows.map((row) => ({ ...row, strand, subStrand: subStrandName }));
}

function validateAndFixSLO(slo: string): string {
  if (!slo || slo.trim().length === 0) {
    return "By the end of the lesson, the learner should be able to:\na) [Knowledge outcome]\nb) [Skills outcome]\nc) [Attitudes/Values outcome]";
  }
  const hasA = /a\)/.test(slo);
  const hasB = /b\)/.test(slo);
  const hasC = /c\)/.test(slo);
  let fixed = slo;
  if (hasA && hasB && hasC) {
    if (!fixed.toLowerCase().includes("by the end of the lesson")) {
      fixed = "By the end of the lesson, the learner should be able to:\n" + fixed.trim();
    }
    return fixed;
  }
  const lines = slo.split(/\n|(?=\d\.\s)/).map(l => l.trim()).filter(Boolean);
  const content = lines.filter(l => !l.toLowerCase().includes("by the end"));
  if (content.length >= 3) {
    return `By the end of the lesson, the learner should be able to:\na) ${content[0].replace(/^[a-c]\)\s*|^\d+[\.\)]\s*/i, "")}\nb) ${content[1].replace(/^[a-c]\)\s*|^\d+[\.\)]\s*/i, "")}\nc) ${content[2].replace(/^[a-c]\)\s*|^\d+[\.\)]\s*/i, "")}`;
  }
  return slo;
}

function validateAndFixExperiences(exp: string): string {
  if (!exp || exp.trim().length === 0) {
    return "Learner is guided to:\na) [Knowledge activity]\nb) [Skills activity]\nc) [Application activity]\nd) [Attitudes/Values activity]";
  }
  const hasGuided = /learner is guided to/i.test(exp);
  const hasA = /a\)/.test(exp);
  const hasB = /b\)/.test(exp);
  const hasC = /c\)/.test(exp);
  const hasD = /d\)/.test(exp);
  let fixed = exp.trim();
  if (hasGuided && hasA && hasB && hasC && hasD) return fixed;
  if (!hasGuided) fixed = "Learner is guided to:\n" + fixed;
  if (!hasA || !hasB || !hasC || !hasD) {
    const lines = fixed.split(/\n|(?<=\.)\s+/).map(l => l.trim()).filter(l => l && !l.toLowerCase().includes("learner is guided"));
    if (lines.length >= 4) {
      return `Learner is guided to:\na) ${lines[0].replace(/^[a-d]\)\s*|^[-•]\s*/i, "")}\nb) ${lines[1].replace(/^[a-d]\)\s*|^[-•]\s*/i, "")}\nc) ${lines[2].replace(/^[a-d]\)\s*|^[-•]\s*/i, "")}\nd) ${lines[3].replace(/^[a-d]\)\s*|^[-•]\s*/i, "")}`;
    }
  }
  return fixed;
}

function normalizeRowKeys(raw: Record<string, unknown>): SchemeRow {
  const keyMap: Record<string, string> = {
    specificlearningoutcome: "specificLearningOutcome",
    specificlearningoutcomes: "specificLearningOutcome",
    specific_learning_outcome: "specificLearningOutcome",
    specific_learning_outcomes: "specificLearningOutcome",
    keyinquiryquestion: "keyInquiryQuestion",
    key_inquiry_question: "keyInquiryQuestion",
    learningexperiences: "learningExperiences",
    learning_experiences: "learningExperiences",
    learningresources: "learningResources",
    learning_resources: "learningResources",
    assessmentmethods: "assessmentMethods",
    assessment_methods: "assessmentMethods",
    substrand: "subStrand",
    sub_strand: "subStrand",
  };
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const lk = key.toLowerCase().replace(/[-_\s]/g, "");
    normalized[keyMap[lk] || key] = value;
  }
  return {
    week: Number(normalized.week) || 1,
    lesson: Number(normalized.lesson) || 1,
    strand: String(normalized.strand || ""),
    subStrand: String(normalized.subStrand || ""),
    specificLearningOutcome: String(normalized.specificLearningOutcome || ""),
    keyInquiryQuestion: String(normalized.keyInquiryQuestion || ""),
    learningExperiences: String(normalized.learningExperiences || ""),
    learningResources: String(normalized.learningResources || ""),
    assessmentMethods: String(normalized.assessmentMethods || ""),
    reflection: "",
  };
}

// --- TESTS ---

describe("Guardrail 1: Week/Lesson Numbering", () => {
  const makeRow = (w: number, l: number): SchemeRow => ({
    week: w, lesson: l, strand: "", subStrand: "",
    specificLearningOutcome: `SLO ${w}-${l}`, keyInquiryQuestion: "", learningExperiences: "",
    learningResources: "", assessmentMethods: "", reflection: "",
  });

  it("resets lesson numbers each week (5 lessons/week)", () => {
    const bad = Array.from({ length: 12 }, (_, i) => makeRow(1, i + 1));
    const fixed = enforceWeekLessonNumbering(bad, 1, 5);
    expect(fixed[0]).toMatchObject({ week: 1, lesson: 1 });
    expect(fixed[4]).toMatchObject({ week: 1, lesson: 5 });
    expect(fixed[5]).toMatchObject({ week: 2, lesson: 1 });
    expect(fixed[9]).toMatchObject({ week: 2, lesson: 5 });
    expect(fixed[10]).toMatchObject({ week: 3, lesson: 1 });
  });

  it("resets lesson numbers each week (7 lessons/week)", () => {
    const bad = Array.from({ length: 14 }, (_, i) => makeRow(1, i + 1));
    const fixed = enforceWeekLessonNumbering(bad, 1, 7);
    expect(fixed[6]).toMatchObject({ week: 1, lesson: 7 });
    expect(fixed[7]).toMatchObject({ week: 2, lesson: 1 });
  });

  it("respects weekStart offset", () => {
    const rows = Array.from({ length: 5 }, (_, i) => makeRow(1, i + 1));
    const fixed = enforceWeekLessonNumbering(rows, 3, 5);
    expect(fixed[0].week).toBe(3);
    expect(fixed[4].week).toBe(3);
  });
});

describe("Guardrail 2: Strand/SubStrand Override", () => {
  it("overrides AI-generated strand names with exact values", () => {
    const rows: SchemeRow[] = [{
      week: 1, lesson: 1, strand: "Performing & Displaying", subStrand: "Rounds",
      specificLearningOutcome: "", keyInquiryQuestion: "", learningExperiences: "",
      learningResources: "", assessmentMethods: "", reflection: "",
    }];
    const fixed = enforceStrandNames(rows, "2.0 Performing and Displaying", "2.1 Rounds");
    expect(fixed[0].strand).toBe("2.0 Performing and Displaying");
    expect(fixed[0].subStrand).toBe("2.1 Rounds");
  });
});

describe("Guardrail 3: SLO Format Validation", () => {
  it("returns placeholder for empty SLO", () => {
    const result = validateAndFixSLO("");
    expect(result).toContain("a)");
    expect(result).toContain("b)");
    expect(result).toContain("c)");
  });

  it("adds preamble if a/b/c present but preamble missing", () => {
    const slo = "a) Identify animals\nb) Draw animals\nc) Appreciate wildlife";
    const result = validateAndFixSLO(slo);
    expect(result).toContain("By the end of the lesson");
    expect(result).toContain("a) Identify animals");
  });

  it("leaves correct format unchanged", () => {
    const slo = "By the end of the lesson, the learner should be able to:\na) Identify\nb) Draw\nc) Appreciate";
    expect(validateAndFixSLO(slo)).toBe(slo);
  });

  it("restructures numbered list into a/b/c format", () => {
    const slo = "1. Identify animals\n2. Draw animals\n3. Appreciate wildlife";
    const result = validateAndFixSLO(slo);
    expect(result).toContain("a)");
    expect(result).toContain("b)");
    expect(result).toContain("c)");
  });
});

describe("Guardrail 4: Learning Experiences Format (knowledge + skills only)", () => {
  it("returns placeholder with 2 activities for empty experiences", () => {
    const result = validateAndFixExperiences("");
    expect(result).toContain("Learner is guided to:");
    expect(result).toContain("a)");
    expect(result).toContain("b)");
    expect(result).not.toContain("c)");
  });

  it("adds prefix if missing", () => {
    const exp = "a) Discuss topics\nb) Draw items";
    const result = validateAndFixExperiences(exp);
    expect(result).toContain("Learner is guided to:");
  });

  it("strips c) attitude activity if AI included it", () => {
    const exp = "Learner is guided to:\na) Discuss animals\nb) Draw animals\nc) Appreciate wildlife";
    const result = validateAndFixExperiences(exp);
    expect(result).toContain("a) Discuss animals");
    expect(result).toContain("b) Draw animals");
    expect(result).not.toContain("c)");
  });

  it("leaves correct 2-activity format unchanged", () => {
    const exp = "Learner is guided to:\na) Discuss\nb) Draw";
    expect(validateAndFixExperiences(exp)).toBe(exp);
  });
});

describe("Guardrail 6: Key Normalization", () => {
  it("handles snake_case keys from AI", () => {
    const raw = {
      week: 1, lesson: 1, strand: "S", sub_strand: "SS",
      specific_learning_outcome: "SLO text",
      key_inquiry_question: "Q?",
      learning_experiences: "Exp",
      learning_resources: "Res",
      assessment_methods: "Assess",
      reflection: "R",
    };
    const row = normalizeRowKeys(raw);
    expect(row.subStrand).toBe("SS");
    expect(row.specificLearningOutcome).toBe("SLO text");
    expect(row.keyInquiryQuestion).toBe("Q?");
    expect(row.reflection).toBe(""); // always empty
  });

  it("handles missing keys gracefully", () => {
    const raw = { week: 2, lesson: 3 };
    const row = normalizeRowKeys(raw as Record<string, unknown>);
    expect(row.week).toBe(2);
    expect(row.strand).toBe("");
    expect(row.specificLearningOutcome).toBe("");
  });
});
