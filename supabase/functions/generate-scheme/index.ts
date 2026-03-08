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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { grade, subject, strand, context, subStrands } = await req.json();

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

    // Build sub-strand context
    let subStrandContext = "";
    let totalLessons = 0;
    if (subStrands && Array.isArray(subStrands) && subStrands.length > 0) {
      totalLessons = (subStrands as SubStrandInfo[]).reduce((sum, ss) => sum + ss.lessons, 0);
      subStrandContext = `\n\nThe EXACT official KICD sub-strands for this strand are:\n${
        (subStrands as SubStrandInfo[]).map(ss => `- "${ss.name}" (${ss.lessons} lessons)`).join("\n")
      }\n\nTotal lessons across all sub-strands: ${totalLessons}

CRITICAL RULES:
1. Generate EXACTLY one row per LESSON — NOT one row per sub-strand.
2. For a sub-strand with N lessons, generate N separate rows, each representing one lesson.
3. Distribute the learning outcomes across lessons progressively — early lessons introduce concepts, later lessons deepen and apply.
4. Each lesson row should have a FOCUSED, SPECIFIC outcome for that single lesson (not the whole sub-strand outcome).
5. The "week" field should increment logically (multiple lessons per week is fine, use lesson numbers 1,2,3 etc within each week).
6. The "strand" field MUST be exactly "${strand}" for every row.
7. The "subStrand" field MUST use the EXACT sub-strand name from the list above.`;
    }

    const systemPrompt = isSw
      ? `Wewe ni mwalimu mtaalamu wa CBC Kenya. Tengeneza mpango wa kazi (scheme of work) kwa muundo wa masomo ya kila somo moja moja.

Jibu LAZIMA liwe JSON array ya objects zenye fields hizi:
- week (number): Nambari ya wiki
- lesson (number): Nambari ya somo ndani ya wiki
- strand (string): Mada kuu
- subStrand (string): Mada ndogo
- specificLearningOutcome (string): Matokeo mahususi ya somo hilo moja — "Mwishoni mwa somo, mwanafunzi aweze..."
- keyInquiryQuestion (string): Swali moja la uchunguzi kwa somo hilo
- learningExperiences (string): Shughuli za ujifunzaji — "Mwanafunzi anaongozwa..." tumia "• " kwa kila shughuli
- learningResources (string): Rasilimali za kujifunza
- assessmentMethods (string): Mbinu za tathmini k.m. maswali ya mdomo, maswali ya maandishi
- reflection (string): Acha tupu ""

Jibu LAZIMA liwe JSON array pekee.`
      : `You are an experienced Kenyan CBC teacher creating a SCHEME OF WORK — a weekly lesson-by-lesson teaching plan.

IMPORTANT: A scheme of work is NOT the curriculum design. The curriculum design gives aggregated outcomes per sub-strand. YOUR job is to BREAK THOSE DOWN into individual lesson plans, distributing content progressively across lessons.

For each INDIVIDUAL LESSON row, generate:
- week (number): Week number (starting from 1)
- lesson (number): Lesson number within that week (1, 2, or 3)
- strand (string): The strand name
- subStrand (string): The sub-strand name
- specificLearningOutcome (string): What the learner should achieve in THIS SINGLE LESSON. Start with "By the end of the lesson the learner should be able to:" then list 2-3 specific, focused outcomes for that one lesson only.
- keyInquiryQuestion (string): ONE thought-provoking question for this specific lesson
- learningExperiences (string): 3-5 practical activities for THIS lesson. Start with "The learner is guided to:" then use bullet points. Include hands-on activities, discussions, digital device usage where appropriate.
- learningResources (string): Specific resources needed (e.g., "Environmental Activities Curriculum design grade 3, Our lives today grade 3, art supplies, digital devices")
- assessmentMethods (string): How to assess this lesson (e.g., "oral questions, written questions, observation")
- reflection (string): Leave as empty string ""

Your response MUST be ONLY a valid JSON array of objects. No other text.`;

    const userPrompt = `Generate a CBC scheme of work (lesson-by-lesson) for:
- Grade: ${grade}
- Subject: ${subject}  
- Strand: ${strand}
${subStrandContext}
${context ? `\nLearning resources available: ${context}` : ""}

IMPORTANT: Generate one row per LESSON, not per sub-strand. Each sub-strand with N lessons needs N separate rows.
Distribute outcomes progressively across lessons. Early lessons = introduce/identify. Middle = practice/discuss. Later = apply/create/advocate.

Return ONLY a valid JSON array.`;

    console.log(`Generating scheme for ${grade} ${subject} - ${strand} (${totalLessons} total lessons across ${subStrands?.length || "unknown"} sub-strands)`);

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

    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let rows: SchemeRow[];
    try {
      rows = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", jsonStr.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "AI returned invalid format. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "AI returned empty scheme. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generated ${rows.length} lesson rows successfully`);

    return new Response(
      JSON.stringify({ rows, source: subStrands ? "hardcoded_context" : "ai_knowledge" }),
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
