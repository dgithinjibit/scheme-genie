const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

interface SubStrandInfo {
  name: string;
  lessons: number;
  learningOutcomes?: string[];
  suggestedExperiences?: string[];
  keyInquiryQuestion?: string;
}

const kiswahiliSubjects = ["Kiswahili"];

function extractJsonArray(raw: string): SchemeRow[] {
  let cleaned = raw.trim();
  // Remove markdown code fences
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  cleaned = cleaned.trim();

  // Find the JSON array boundaries
  const start = cleaned.indexOf("[");
  if (start === -1) throw new Error("No JSON array found in response");

  const end = cleaned.lastIndexOf("]");

  // If we have a complete array, parse directly
  if (end > start) {
    try {
      return JSON.parse(cleaned.substring(start, end + 1));
    } catch {
      // Fall through to recovery
    }
  }

  // Truncated response — try to recover partial array
  console.warn("Response appears truncated, attempting recovery...");
  let partial = cleaned.substring(start);

  // Remove trailing commas and incomplete objects
  // Find the last complete object (ending with })
  const lastBrace = partial.lastIndexOf("}");
  if (lastBrace > 0) {
    let repaired = partial.substring(0, lastBrace + 1);
    // Remove any trailing comma after the last }
    repaired = repaired.replace(/,\s*$/, "");
    // Close the array
    repaired += "]";
    // Fix common issues
    repaired = repaired
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]");

    try {
      const items = JSON.parse(repaired);
      console.warn(`Recovered ${items.length} items from truncated response`);
      return items;
    } catch (e) {
      throw new Error(`Cannot recover truncated JSON: ${e}`);
    }
  }

  throw new Error("No parseable JSON found in response");
}

// ============================================================
// GUARDRAILS: Post-processing validation & sanitization
// These ensure production-quality output regardless of AI quirks
// ============================================================

/** GUARDRAIL 1: Fix week/lesson numbering deterministically. */
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

/** GUARDRAIL 2: Override strand/subStrand with exact requested values. */
function enforceStrandNames(rows: SchemeRow[], strand: string, subStrandName: string): SchemeRow[] {
  return rows.map((row) => ({ ...row, strand, subStrand: subStrandName }));
}

/** GUARDRAIL 3: Validate & fix Specific Learning Outcomes (must have a, b, c for English; dashes for Kiswahili). */
function validateAndFixSLO(slo: string, isSw: boolean): string {
  if (!slo || slo.trim().length === 0) {
    return isSw 
      ? "**Kufikia mwisho wa somo mwanafunzi aweze:**\n-kutambua [maarifa]\n-kutekeleza [ujuzi]\n-kufurahia [mitazamo]"
      : "By the end of the lesson, the learner should be able to:\na) [Knowledge outcome]\nb) [Skills outcome]\nc) [Attitudes/Values outcome]";
  }
  
  if (isSw) {
    // Kiswahili format: should start with **Kufikia mwisho... and use dashes
    const hasHeader = /kufikia mwisho wa somo/i.test(slo);
    const hasDashes = /-ku/.test(slo);
    
    if (hasHeader && hasDashes) {
      return slo.trim();
    }
    
    // Try to fix it
    let fixed = slo;
    if (!hasHeader) {
      fixed = "**Kufikia mwisho wa somo mwanafunzi aweze:**\n" + fixed.trim();
    }
    // Convert a), b), c) to dashes if present
    fixed = fixed.replace(/\n\s*[a-c]\)\s*/gi, '\n-');
    return fixed;
  }
  
  // English format: a), b), c)
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
  console.warn("SLO format could not be auto-fixed:", slo.substring(0, 80));
  return slo;
}

/** GUARDRAIL 4: Validate Learning Experiences (English: "Learner is guided to:" + a,b; Kiswahili: "**Mwanafunzi aweze:-**" + dashes). */
function validateAndFixExperiences(exp: string, isSw: boolean): string {
  if (!exp || exp.trim().length === 0) {
    return isSw
      ? "**Mwanafunzi aweze:-**\n-kujadili [maarifa]\n-kutekeleza [ujuzi]"
      : "Learner is guided to:\na) [Knowledge activity]\nb) [Skills activity]";
  }
  
  if (isSw) {
    // Kiswahili format: should start with **Mwanafunzi aweze:-** and use dashes
    const hasHeader = /mwanafunzi aweze/i.test(exp);
    const hasDashes = /-ku/.test(exp);
    
    if (hasHeader && hasDashes) {
      return exp.trim();
    }
    
    // Try to fix it
    let fixed = exp;
    if (!hasHeader) {
      fixed = "**Mwanafunzi aweze:-**\n" + fixed.trim();
    }
    // Convert a), b), c) to dashes if present
    fixed = fixed.replace(/\n\s*[a-c]\)\s*/gi, '\n-');
    return fixed;
  }
  
  // English format
  const hasGuided = /learner is guided to/i.test(exp);
  const hasA = /a\)/.test(exp);
  const hasB = /b\)/.test(exp);

  // Strip c) if AI included it — attitudes don't get their own activity
  let fixed = exp.replace(/\n\s*c\)[^\n]*/g, "").trim();

  if (hasGuided && hasA && hasB) return fixed;

  if (!hasGuided) fixed = "Learner is guided to:\n" + fixed;
  if (!hasA || !hasB) {
    const lines = fixed.split(/\n|(?<=\.)\s+/).map(l => l.trim()).filter(l => l && !l.toLowerCase().includes("learner is guided"));
    if (lines.length >= 2) {
      return `Learner is guided to:\na) ${lines[0].replace(/^[a-c]\)\s*|^[-•]\s*/i, "")}\nb) ${lines[1].replace(/^[a-c]\)\s*|^[-•]\s*/i, "")}`;
    }
  }
  return fixed;
}

/** GUARDRAIL 5: Fill in empty required fields with sensible defaults. */
function ensureNoEmptyFields(row: SchemeRow, grade: string, subject: string): SchemeRow {
  return {
    ...row,
    strand: row.strand || subject,
    subStrand: row.subStrand || "",
    specificLearningOutcome: row.specificLearningOutcome || "",
    keyInquiryQuestion: row.keyInquiryQuestion || "What have we learned today?",
    learningExperiences: row.learningExperiences || "",
    learningResources: row.learningResources || `${subject} Curriculum Design ${grade.toLowerCase()}`,
    assessmentMethods: row.assessmentMethods || "Oral questions, observation",
    reflection: "",
  };
}

/** GUARDRAIL 6: Normalize AI key variants (snake_case, wrong casing, etc). */
function normalizeRowKeys(raw: Record<string, unknown>): SchemeRow {
  const keyMap: Record<string, string> = {
    specificlearningoutcome: "specificLearningOutcome",
    specificlearningoutcomes: "specificLearningOutcome",
    specific_learning_outcome: "specificLearningOutcome",
    specific_learning_outcomes: "specificLearningOutcome",
    learning_outcome: "specificLearningOutcome",
    keyinquiryquestion: "keyInquiryQuestion",
    keyinquiryquestions: "keyInquiryQuestion",
    key_inquiry_question: "keyInquiryQuestion",
    key_inquiry_questions: "keyInquiryQuestion",
    inquiry_question: "keyInquiryQuestion",
    learningexperiences: "learningExperiences",
    learning_experiences: "learningExperiences",
    learningresources: "learningResources",
    learning_resources: "learningResources",
    assessmentmethods: "assessmentMethods",
    assessment_methods: "assessmentMethods",
    assessment: "assessmentMethods",
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

/**
 * MASTER GUARDRAIL: Apply ALL validations in sequence.
 */
function validateAndSanitizeRows(
  rawRows: unknown[],
  strand: string,
  subStrandName: string,
  grade: string,
  subject: string,
  weekStart: number,
  lessonsPerWeek: number,
  isSw: boolean,
): SchemeRow[] {
  console.log(`Guardrails: processing ${rawRows.length} raw rows...`);
  let rows: SchemeRow[] = rawRows.map(r => normalizeRowKeys(r as Record<string, unknown>));
  rows = enforceStrandNames(rows, strand, subStrandName);
  rows = enforceWeekLessonNumbering(rows, weekStart, lessonsPerWeek);
  rows = rows.map((row) => {
    row = ensureNoEmptyFields(row, grade, subject);
    row.specificLearningOutcome = validateAndFixSLO(row.specificLearningOutcome, isSw);
    row.learningExperiences = validateAndFixExperiences(row.learningExperiences, isSw);
    return row;
  });
  const seen = new Set<string>();
  const deduped = rows.filter((row) => {
    const key = row.specificLearningOutcome.substring(0, 100);
    if (seen.has(key)) {
      console.warn(`Guardrails: removed duplicate row`);
      return false;
    }
    seen.add(key);
    return true;
  });
  const final = enforceWeekLessonNumbering(deduped, weekStart, lessonsPerWeek);
  console.log(`Guardrails: ${final.length} rows passed validation (from ${rawRows.length} raw)`);
  return final;
}

const MAX_LESSONS_PER_BATCH = 5;

async function generateBatch(
  LOVABLE_API_KEY: string,
  grade: string,
  subject: string,
  strand: string,
  subStrand: SubStrandInfo,
  batchLessons: number,
  context: string,
  isSw: boolean,
  weekStart: number,
  lessonsPerWeek: number,
  batchIndex: number,
): Promise<SchemeRow[]> {
  const subStrandName = subStrand.name;
  const totalLessons = subStrand.lessons;

  // Build official KICD context block
  let officialContext = "";
  if (subStrand.learningOutcomes?.length) {
    officialContext += `\n\nOFFICIAL KICD LEARNING OUTCOMES for "${subStrandName}":\n`;
    subStrand.learningOutcomes.forEach((o, i) => {
      officialContext += `  ${String.fromCharCode(97 + i)}) ${o}\n`;
    });
  }
  if (subStrand.keyInquiryQuestion) {
    officialContext += `\nOFFICIAL KEY INQUIRY QUESTION: "${subStrand.keyInquiryQuestion}"\n`;
  }
  if (subStrand.suggestedExperiences?.length) {
    officialContext += `\nOFFICIAL SUGGESTED LEARNING EXPERIENCES:\n`;
    subStrand.suggestedExperiences.forEach(e => {
      officialContext += `  - ${e}\n`;
    });
  }

  const hasOfficialData = !!officialContext;

  // GUARDRAIL 8: Refuse to generate if sub-strand has no official KICD learning outcomes
  // Exception: Kiswahili lower primary uses standardized language-skill sub-strands 
  // (Kusikiliza na Kuzungumza, Kusoma, Kuandika, Sarufi) under thematic Mada — 
  // the Mada name + sub-strand name provide sufficient context for generation.
  const isKiswahiliThematic = isSw && ["Kusikiliza na Kuzungumza", "Kusoma", "Kuandika", "Sarufi"].includes(subStrandName);
  if (!hasOfficialData && !isKiswahiliThematic) {
    console.error(`No official KICD data for sub-strand "${subStrandName}" in ${grade} ${subject}. Refusing to generate.`);
    throw new Error(`NO_OFFICIAL_DATA: No verified KICD curriculum data available for "${subStrandName}". Cannot generate without official learning outcomes.`);
  }
  
  // For Kiswahili thematic topics, inject the Mada context
  if (isKiswahiliThematic && !hasOfficialData) {
    officialContext = `\n\nKICD MADA (Thematic Topic): "${strand}"\nSub-strand skill area: "${subStrandName}"\nThis is a standard Kiswahili language skill area under the given Mada. Generate age-appropriate content for ${grade} learners practicing "${subStrandName}" within the theme of "${strand}".\n`;
  }

  const systemPrompt = isSw
    ? `Wewe ni mtaalamu wa mtaala wa CBC Kenya (KICD). Unatengeneza Mpango wa Kazi rasmi ambao unafuata viwango vya KICD kwa usahihi.

SHARTI MUHIMU: Lazima utumie data rasmi ya KICD iliyotolewa hapa chini PEKEE. USIBUNI, USITENGENEZE, au USIZUSHE matokeo ya kujifunza, majina ya strand, majina ya sub-strand, au maudhui ya mtaala ambayo hayapo katika mfumo wa KICD.

KANUNI MUHIMU:
1. Tengeneza HASA somo ${batchLessons} kwa wanafunzi wa ${grade}.
2. Kila somo liwe FUPI, sahili, na linalofaa umri wa watoto.
3. **MATOKEA MAALUM YANAYOTARAJIWA** — Lazima ianze na "**Kufikia mwisho wa somo mwanafunzi aweze:**" kisha orodhesha matokeo 3-5 kwa kutumia alama ya dashi (-).
   - Tumia VITENZI VYA VITENDO ambavyo vinaweza kupimika tu. Usiwe na maneno kama "kuelewa" au "kujua" — badala yake tumia:
     * MAARIFA (Knowledge): kutambua, kutaja, kuorodhesha, kueleza, kufafanua, kulinganisha, kutofautisha
     * UJUZI (Skills): kutekeleza, kutumia, kujenga, kuonyesha, kusoma, kuandika, kuchora, kuhesabu, kupima, kutatua
     * MITAZAMO (Attitudes): kufurahia, kuheshimu, kuthamini, kushirikiana, kuzingatia, kuendeleza, kutetea
   - Kila tokeo liwe MAHUSUSI sana na linatokana na data rasmi ya KICD ikiwa imetolewa hapa chini.
   
4. **MAPENDEKEZO YA SHUGHULI ZA UFUNZAJI** — Lazima ianze na "**Mwanafunzi aweze:-**" kisha orodhesha shughuli 3-5 kwa kutumia alama ya dashi (-).
   - Shughuli ziwe MAHUSUSI na ZENYE VITENDO: kutathmini, kujadili, kutazama, kuchora, kuimba, kucheza, kuandika, kusoma, kutatua, kuorodhesha
   - Usiwe na maneno kama "kujifunza" — badala yake tumia shughuli zinazoonekana
   - Tumia mapendekezo rasmi ya KICD yaliyo hapa chini kama chanzo
   - Zingatia mazingira mbalimbali ya kujifunza (shuleni, nje, nyumbani)
   
5. **SWALI DADISI** — Tumia swali rasmi la KICD lililotolewa, au unda swali linalofanana. Swali liwe sahili kwa umri wa mtoto.
6. **MAREJELEO** — "${subject} Curriculum Design ${grade.toLowerCase()}" pamoja na rasilimali za mazingira (vifaa vya kidijitali, mazingira ya karibu, chati, vitabu, vitu halisi).
7. **TATHMINI** — Njia za kutathmini: "Kuuliza na kujibu maswali, uchunguzi" au ongeza "zoezi la kuandika, evaluation ya kazi, tathmini ya wenzao".
8. **MAONI** — Daima "".
9. Nambari za wiki zianze kutoka ${weekStart}. Wiki moja = masomo ${lessonsPerWeek}. Nambari za somo ZIANZIE UPYA kila wiki: 1, 2, 3... mpaka ${lessonsPerWeek}, kisha rudi 1 kwa wiki inayofuata.
10. Masomo ${totalLessons} yote yawe na mwelekeo wa kuendelea: TAMBULISHA dhana → ZOEZA ujuzi → TUMIA katika muktadha → KAGUA na tathmini.${officialContext}

Rudisha JSON array pekee ya vitu ${batchLessons}. Hakuna maandishi mengine.`
    : `You are an expert educational consultant specializing in the Kenyan Competency-Based Curriculum (CBC), aligned with the Ministry of Education and KICD (Kenya Institute of Curriculum Development) standards.

YOUR GOAL: Generate detailed, pedagogically sound Schemes of Work that focus on COMPETENCY DEVELOPMENT rather than rote memorization. Output must be structured for official school records.

CRITICAL CONSTRAINT: You MUST ONLY use the official KICD data provided below. NEVER fabricate, invent, or hallucinate learning outcomes, strand names, sub-strand names, or curriculum content. If no official data is provided for a field, leave it generic but DO NOT make up specific curriculum content that does not exist in the KICD framework.

RULES:
1. Generate EXACTLY ${batchLessons} lesson rows for ${grade} learners.
2. Keep everything SIMPLE, age-appropriate, and inclusive of diverse learning needs and environments.
3. **Specific Learning Outcomes** — EXACTLY 3 outcomes per lesson, one from each domain. Use the official KICD outcomes below as source material.
   MANDATORY FORMAT — no other format is acceptable:
   "By the end of the lesson, the learner should be able to:\\na) [Knowledge outcome]\\nb) [Skills outcome]\\nc) [Attitudes/Values outcome]"
   - a) Knowledge (Cognitive): Use MEASURABLE verbs ONLY — Define, List, State, Name, Label, Recall, Identify, Describe, Explain, Summarize, Distinguish, Illustrate. NEVER use "know", "understand", or "be aware of".
   - b) Skills (Psychomotor): Use verbs requiring a TANGIBLE output — Execute, Perform, Construct, Demonstrate, Draw, Write, Sing, Read, Calculate, Measure, Sketch, Solve, Model, Trace, Cut, Colour, Paint. NEVER use "learn to...".
   - c) Attitudes/Values (Affective): Link to OBSERVABLE behaviour — Appreciate, Respect, Value, Practise, Uphold, Collaborate, Persist, Commit, Adhere, Advocate. NEVER use "have a positive attitude".
   Every lesson MUST have exactly a), b), c) — one knowledge, one skill, one attitude. No more, no less.
4. **Learning Experiences**: MUST begin with "Learner is guided to:" followed by EXACTLY 2 lettered activities based on KNOWLEDGE and SKILLS outcomes only. Do NOT include an activity for the attitudes/values outcome — attitudes are developed through the knowledge and skills activities naturally.
   - a) must relate to the KNOWLEDGE outcome (a) — e.g. if SLO a) says "identify locally available materials used as beddings", then experience a) should be "discuss locally available materials used as beddings"
   - b) must relate to the SKILLS outcome (b) — e.g. if SLO b) says "draw items used as beddings", then experience b) should be "draw items used as beddings" or a hands-on activity
   MANDATORY FORMAT — no other format is acceptable:
   "Learner is guided to:\\na) [activity mirroring SLO a - knowledge]\\nb) [activity mirroring SLO b - skills]"
   Use the official suggested experiences below as source material for the activities.
   Activities must account for diverse learning environments.
5. **Key Inquiry Question**: Use the official KICD question provided, or create a closely related child-friendly variant per lesson. Must be age-appropriate.
6. **Learning Resources**: "${subject} Curriculum Design ${grade.toLowerCase()}" plus contextual resources (digital devices, local environment, charts, textbooks, realia). Include locally available materials.
7. **Assessment**: Methods to evaluate learning — "oral questions, observation" or add "written exercise, portfolio, peer assessment" as appropriate. Must match the learning outcome.
8. **Reflection**: always "".
9. Week numbering starts from ${weekStart}. Fit exactly ${lessonsPerWeek} lessons per week. Lesson numbers RESET each week: 1, 2, 3... up to ${lessonsPerWeek}, then back to 1 for the next week. Example: Week 1 has lessons 1,2,3,4,5; Week 2 has lessons 1,2,3,4,5 — NOT lesson 6,7,8.
10. Progress gradually across ${totalLessons} total lessons: INTRODUCE concepts → PRACTISE skills → APPLY in context → REVIEW and assess. Each lesson should build on the previous one.${officialContext}

Return ONLY a valid JSON array of ${batchLessons} objects. No other text.`;

  const batchDesc = batchIndex > 0 ? ` (continuing from lesson ${batchIndex * MAX_LESSONS_PER_BATCH + 1})` : "";
  const userPrompt = `Generate ${batchLessons} lesson rows for:
- Grade: ${grade}, Subject: ${subject}
- Strand: ${strand}
- Sub-strand: ${subStrandName} (${totalLessons} total lessons, this batch: ${batchLessons})${batchDesc}
${context ? `- Additional Resources: ${context}` : ""}

Each row: week, lesson, strand, subStrand, specificLearningOutcome, keyInquiryQuestion, learningExperiences, learningResources, assessmentMethods, reflection.
The "strand" field = "${strand}", the "subStrand" field = "${subStrandName}".
Start week numbering from ${weekStart}.

Return ONLY a JSON array of exactly ${batchLessons} objects.`;

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error(`AI error for ${subStrandName} batch ${batchIndex}:`, aiResponse.status, errorText);
    if (aiResponse.status === 429) throw new Error("RATE_LIMIT");
    throw new Error(`AI generation failed for ${subStrandName} batch ${batchIndex}`);
  }

  const aiData = await aiResponse.json();
  const rawContent = aiData.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error(`AI returned empty response for ${subStrandName} batch ${batchIndex}`);

  const rows = extractJsonArray(rawContent);
  console.log(`Batch ${batchIndex}: generated ${rows.length} rows for ${subStrandName} (expected ${batchLessons})${hasOfficialData ? ' [with official KICD context]' : ''}`);
  return rows;
}

async function generateForSubStrand(
  LOVABLE_API_KEY: string,
  grade: string,
  subject: string,
  strand: string,
  subStrand: SubStrandInfo,
  context: string,
  isSw: boolean,
  weekStart: number,
  lessonsPerWeek: number,
): Promise<{ rows: SchemeRow[]; weeksUsed: number }> {
  const allRows: SchemeRow[] = [];
  let remaining = subStrand.lessons;
  let batchIndex = 0;
  let currentWeek = weekStart;

  while (remaining > 0) {
    const batchSize = Math.min(remaining, MAX_LESSONS_PER_BATCH);
    let rows: SchemeRow[] | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (!rows && attempts < maxAttempts) {
      attempts++;
      try {
        rows = await generateBatch(
          LOVABLE_API_KEY, grade, subject, strand, subStrand,
          batchSize, context, isSw, currentWeek, lessonsPerWeek, batchIndex
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown";
        if (msg === "RATE_LIMIT") throw e; // Don't retry rate limits
        if (msg.startsWith("NO_OFFICIAL_DATA:")) throw e; // Don't retry missing data
        if (attempts >= maxAttempts) throw e;
        // Brief pause before retry
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (rows) {
      allRows.push(...rows);
    }
    remaining -= batchSize;
    batchIndex++;
  }

  // MASTER GUARDRAIL: validate & sanitize all rows
  const fixedRows = validateAndSanitizeRows(allRows, strand, subStrand.name, grade, subject, weekStart, lessonsPerWeek, isSw);

  const totalWeeks = Math.ceil(fixedRows.length / lessonsPerWeek);
  return { rows: fixedRows, weeksUsed: totalWeeks };
}

// Fetch reference schemes from database to enhance AI context
async function fetchReferenceContext(grade: string, subject: string, strand: string): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return "";

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Search for matching references by grade and subject
    const { data: refs } = await supabase
      .from("scheme_references")
      .select("title, description, content_snippet, source_site")
      .or(`grade.ilike.%${grade}%,subject.ilike.%${subject}%`)
      .limit(5);

    if (!refs || refs.length === 0) return "";

    let refContext = "\n\nREFERENCE SCHEMES FROM PROFESSIONAL SOURCES (use as inspiration for tone, structure, and content depth):\n";
    for (const ref of refs) {
      refContext += `\n--- From ${ref.source_site} ---\n`;
      if (ref.title) refContext += `Title: ${ref.title}\n`;
      if (ref.description) refContext += `Description: ${ref.description}\n`;
      if (ref.content_snippet) refContext += `Content: ${ref.content_snippet.slice(0, 500)}\n`;
    }
    return refContext;
  } catch (e) {
    console.error("Error fetching reference context:", e);
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { grade, subject, strand, context, subStrands, lessonsPerWeek = 5 } = await req.json();

    if (!grade || !subject || !strand) {
      return new Response(
        JSON.stringify({ error: "Grade, subject, and strand are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isSw = kiswahiliSubjects.includes(subject);

    // Fetch reference context from scraped schemes
    const referenceContext = await fetchReferenceContext(grade, subject, strand);

    // If we have sub-strands, generate per sub-strand to avoid truncation
    if (subStrands && Array.isArray(subStrands) && subStrands.length > 0) {
      const totalLessons = (subStrands as SubStrandInfo[]).reduce((sum, ss) => sum + ss.lessons, 0);
      console.log(`Generating scheme for ${grade} ${subject} - ${strand} (${totalLessons} total lessons across ${subStrands.length} sub-strands, generating per sub-strand)`);

      const allRows: SchemeRow[] = [];
      let currentWeek = 1;

      for (const ss of subStrands as SubStrandInfo[]) {
        try {
            const enrichedContext = (context || "") + referenceContext;
            const { rows, weeksUsed } = await generateForSubStrand(
              LOVABLE_API_KEY, grade, subject, strand, ss, enrichedContext, isSw, currentWeek, lessonsPerWeek
            );
          allRows.push(...rows);
          currentWeek += weeksUsed;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          if (msg === "RATE_LIMIT") {
            // Return what we have so far
            if (allRows.length > 0) {
              console.warn(`Rate limited after ${allRows.length} rows, returning partial results`);
              return new Response(
                JSON.stringify({ rows: allRows, source: "hardcoded_context", partial: true }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            return new Response(
              JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (msg.startsWith("NO_OFFICIAL_DATA:")) {
            return new Response(
              JSON.stringify({ error: msg.replace("NO_OFFICIAL_DATA: ", "") }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          console.error(`Error generating ${ss.name}: ${msg}`);
        }
      }

      if (allRows.length === 0) {
        return new Response(
          JSON.stringify({ error: "Failed to generate any lesson rows. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Generated ${allRows.length} total lesson rows across all sub-strands`);

      return new Response(
        JSON.stringify({ rows: allRows, source: "hardcoded_context" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GUARDRAIL 7: NEVER generate without official curriculum data.
    // If we reach here, it means no hardcoded sub-strand data exists for this subject/strand.
    console.error(`No official curriculum data available for ${grade} ${subject} - ${strand}. Refusing to generate.`);
    return new Response(
      JSON.stringify({ 
        error: `We don't have verified KICD curriculum data for "${subject}" (${grade}) yet. Generation is only available for subjects with official curriculum data to ensure accuracy. Please select a different subject or check back later.` 
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-scheme error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
