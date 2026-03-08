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

const MAX_LESSONS_PER_BATCH = 8;

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

  const systemPrompt = isSw
    ? `Wewe ni mtaalamu wa mtaala wa CBC Kenya (KICD). Tengeneza mpango wa kazi kwa mada ndogo moja. Kila somo liwe RAHISI na FUPI. Jibu LAZIMA liwe JSON array pekee.`
    : `You are an expert educational consultant specializing in the Kenyan Competency-Based Curriculum (CBC), aligned with the Ministry of Education and KICD (Kenya Institute of Curriculum Development) standards.

YOUR GOAL: Generate detailed, pedagogically sound Schemes of Work that focus on COMPETENCY DEVELOPMENT rather than rote memorization. Output must be structured for official school records.

RULES:
1. Generate EXACTLY ${batchLessons} lesson rows for ${grade} learners.
2. Keep everything SIMPLE, age-appropriate, and inclusive of diverse learning needs and environments.
3. **Specific Learning Outcomes** — For each lesson, derive 1-3 SHORT measurable outcomes from the official KICD outcomes below. Use the three-domain formula: [Action Verb] + [Subject Matter] + [Context/Standard].
   - Knowledge (Cognitive): Use MEASURABLE verbs ONLY — Define, List, State, Name, Label, Recall, Identify, Describe, Explain, Summarize, Distinguish, Illustrate. NEVER use "know", "understand", or "be aware of".
   - Skills (Psychomotor): Use verbs requiring a TANGIBLE output — Execute, Perform, Construct, Demonstrate, Draw, Write, Sing, Read, Calculate, Measure, Sketch, Solve, Model, Trace, Cut, Colour, Paint. NEVER use "learn to...".
   - Attitudes/Values (Affective): Link to OBSERVABLE behaviour — Appreciate, Respect, Value, Practise, Uphold, Collaborate, Persist, Commit, Adhere, Advocate. NEVER use "have a positive attitude".
   Format: "By the end of the lesson the learner should be able to:" then bullet points with "* " prefix.
4. **Key Inquiry Question**: ${hasOfficialData ? 'Use the official KICD question provided, or create a closely related child-friendly variant per lesson.' : 'ONE open-ended question to stimulate curiosity and critical thinking.'} Must be age-appropriate.
5. **Learning Experiences**: ${hasOfficialData ? 'Select 2-4 STUDENT-CENTERED activities FROM the official suggested experiences below. Distribute them across lessons so all are covered.' : '2-4 student-centered activities (observing, discussing, drawing, role-playing, experimenting) with "* " prefix.'} Activities must account for diverse learning environments.
6. **Learning Resources**: "${subject} Curriculum Design ${grade.toLowerCase()}" plus contextual resources (digital devices, local environment, charts, textbooks, realia). Include locally available materials.
7. **Assessment**: Methods to evaluate learning — "oral questions, observation" or add "written exercise, portfolio, peer assessment" as appropriate. Must match the learning outcome.
8. **Reflection**: always "".
9. Week numbering starts from ${weekStart}. Fit exactly ${lessonsPerWeek} lessons per week. Lesson numbers 1, 2, 3... up to ${lessonsPerWeek} within each week.
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
    const rows = await generateBatch(
      LOVABLE_API_KEY, grade, subject, strand, subStrand,
      batchSize, context, isSw, currentWeek, lessonsPerWeek, batchIndex
    );
    allRows.push(...rows);

    // Advance week based on rows generated
    const maxWeek = rows.reduce((max, r) => Math.max(max, r.week || 0), currentWeek);
    // Check if last row fills the week
    const lastRow = rows[rows.length - 1];
    if (lastRow && lastRow.lesson >= lessonsPerWeek) {
      currentWeek = maxWeek + 1;
    } else {
      currentWeek = maxWeek;
    }

    remaining -= batchSize;
    batchIndex++;
  }

  const maxWeek = allRows.reduce((max, r) => Math.max(max, r.week || 0), weekStart);
  return { rows: allRows, weeksUsed: maxWeek - weekStart + 1 };
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

    // If we have sub-strands, generate per sub-strand to avoid truncation
    if (subStrands && Array.isArray(subStrands) && subStrands.length > 0) {
      const totalLessons = (subStrands as SubStrandInfo[]).reduce((sum, ss) => sum + ss.lessons, 0);
      console.log(`Generating scheme for ${grade} ${subject} - ${strand} (${totalLessons} total lessons across ${subStrands.length} sub-strands, generating per sub-strand)`);

      const allRows: SchemeRow[] = [];
      let currentWeek = 1;

      for (const ss of subStrands as SubStrandInfo[]) {
        try {
          const { rows, weeksUsed } = await generateForSubStrand(
            LOVABLE_API_KEY, grade, subject, strand, ss, context || "", isSw, currentWeek, lessonsPerWeek
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
          console.error(`Error generating ${ss.name}: ${msg}`);
          // Continue with next sub-strand
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

    // Fallback: no sub-strands, single generation
    console.log(`Generating scheme for ${grade} ${subject} - ${strand} (no sub-strand data)`);

    const systemPrompt = isSw
      ? `Wewe ni mwalimu mtaalamu wa CBC Kenya. Tengeneza mpango wa kazi. Jibu LAZIMA liwe JSON array pekee.`
      : `You are an experienced Kenyan CBC teacher creating a scheme of work. Generate 10-15 lesson rows. Return ONLY a JSON array.`;

    const userPrompt = `Generate a CBC scheme of work for ${grade} ${subject} - ${strand}.
${context ? `Resources: ${context}` : ""}
Each row: week, lesson, strand, subStrand, specificLearningOutcome, keyInquiryQuestion, learningExperiences, learningResources, assessmentMethods, reflection.
Return ONLY a valid JSON array.`;

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
      console.error("AI gateway error:", aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;

    if (!rawContent) {
      return new Response(
        JSON.stringify({ error: "AI returned empty response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rows = extractJsonArray(rawContent);

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "AI returned empty scheme. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generated ${rows.length} lesson rows successfully`);

    return new Response(
      JSON.stringify({ rows, source: "ai_knowledge" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-scheme error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
