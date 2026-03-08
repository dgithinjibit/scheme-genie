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
  const exampleRows = `EXAMPLE (Environmental Activities, "Our living environment" sub-strand):
Row 1: week=1, lesson=1, outcome="* identify locally available materials used as beddings\\n* draw items used as beddings", question="What are beddings?", experiences="* identify locally available materials used as beddings\\n* draw items used as beddings"
Row 2: week=1, lesson=2, outcome="* identify locally available materials used as beddings", question="Name items that are used as beddings?", experiences="* discuss locally available materials used as beddings\\n* use digital devices to search for items used as beddings"

PATTERN: Each lesson is SIMPLE, SHORT outcomes (1-3 bullets), 2-4 activities, one child-friendly question.`;

  const systemPrompt = isSw
    ? `Wewe ni mwalimu mtaalamu wa CBC Kenya. Tengeneza mpango wa kazi kwa mada ndogo moja. Kila somo liwe RAHISI na FUPI. Jibu LAZIMA liwe JSON array pekee.`
    : `You are an experienced Kenyan CBC primary school teacher creating a SCHEME OF WORK for ONE sub-strand only.

${exampleRows}

RULES:
1. Generate EXACTLY ${subStrand.lessons} lesson rows for this sub-strand.
2. Keep everything SIMPLE and age-appropriate for ${grade} children.
3. Outcomes: "By the end of the lesson the learner should be able to:" then 1-3 SHORT bullet points with "* " prefix.
4. Key Inquiry Question: ONE short child-friendly question.
5. Learning Experiences: 2-4 simple activities with "* " prefix.
6. Learning Resources: "${subject} Curriculum design ${grade.toLowerCase()}" plus textbooks.
7. Assessment: "oral questions, written questions" or add "observation".
8. Reflection: always "".
9. Week numbering starts from ${weekStart}. Fit 2-3 lessons per week. Lesson numbers 1, 2, 3 within each week.
10. Progress gradually: introduce → practice → apply → review.

Return ONLY a valid JSON array of ${subStrand.lessons} objects. No other text.`;

  const userPrompt = `Generate ${subStrand.lessons} lesson rows for:
- Grade: ${grade}, Subject: ${subject}
- Strand: ${strand}
- Sub-strand: ${subStrand.name} (${subStrand.lessons} lessons)
${context ? `- Resources: ${context}` : ""}

Each row needs: week, lesson, strand, subStrand, specificLearningOutcome, keyInquiryQuestion, learningExperiences, learningResources, assessmentMethods, reflection.
The "strand" field = "${strand}", the "subStrand" field = "${subStrand.name}".
Start week numbering from ${weekStart}.

Return ONLY a JSON array of exactly ${subStrand.lessons} objects.`;

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
    console.error(`AI error for ${subStrand.name}:`, aiResponse.status, errorText);
    if (aiResponse.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    throw new Error(`AI generation failed for ${subStrand.name}`);
  }

  const aiData = await aiResponse.json();
  const rawContent = aiData.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error(`AI returned empty response for ${subStrand.name}`);
  }

  const rows = extractJsonArray(rawContent);
  console.log(`Generated ${rows.length} rows for ${subStrand.name} (expected ${subStrand.lessons})`);

  // Calculate weeks used
  const maxWeek = rows.reduce((max, r) => Math.max(max, r.week || 0), weekStart);
  return { rows, weeksUsed: maxWeek - weekStart + 1 };
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
            LOVABLE_API_KEY, grade, subject, strand, ss, context || "", isSw, currentWeek
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
