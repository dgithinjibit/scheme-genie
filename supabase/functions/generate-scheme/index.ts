const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SchemeRow {
  strand: string;
  subStrand: string;
  learningOutcomes: string;
  learningExperiences: string;
  inquiryQuestions: string;
  coreCompetencies: string;
  values: string;
  pcis: string;
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

    // Build sub-strand context if available
    let subStrandContext = "";
    if (subStrands && Array.isArray(subStrands) && subStrands.length > 0) {
      subStrandContext = `\n\nThe EXACT official KICD sub-strands for this strand are:\n${
        (subStrands as SubStrandInfo[]).map(ss => `- "${ss.name}" (${ss.lessons} lessons)`).join("\n")
      }\n\nCRITICAL RULES:
1. Generate EXACTLY one row per sub-strand listed above — no more, no less.
2. The "subStrand" field MUST use the EXACT sub-strand name from the list above, followed by the lesson count in parentheses, e.g. "2.1 Rounds (18 lessons)".
3. The "strand" field MUST be exactly "${strand}" for every row.
4. Content must match the KICD CBC curriculum design for ${grade} ${subject} as closely as possible.`;
    }

    const systemPrompt = isSw
      ? `Wewe ni mtaalamu wa mitaala ya CBC Kenya (KICD). Tengeneza mpango wa kazi kwa muundo sahihi wa CBC.
Jibu LAZIMA liwe JSON array ya objects zenye fields hizi hasa:
- strand (string): Mada kuu
- subStrand (string): Mada ndogo na idadi ya masomo k.m. "2.1 Rounds (masomo 18)"
- learningOutcomes (string): Matokeo ya ujifunzaji - tumia "• " kwa kila tokeo
- learningExperiences (string): Shughuli za ujifunzaji - tumia "• " kwa kila shughuli  
- inquiryQuestions (string): Maswali ya uchunguzi - tumia "• " kwa kila swali
- coreCompetencies (string): Stadi kuu zilizofundishwa
- values (string): Maadili yaliyofundishwa
- pcis (string): Masuala ya kisasa yanayohusiana

Jibu LAZIMA liwe JSON array pekee, bila maandishi mengine.`
      : `You are a Kenyan CBC curriculum expert (KICD-aligned). Generate a scheme of work in the exact CBC format.
Your response MUST be a JSON array of objects with exactly these fields:
- strand (string): The strand name exactly as given
- subStrand (string): The sub-strand name with lesson count, e.g. "2.1 Rounds (18 lessons)"
- learningOutcomes (string): Specific "By the end of the sub-strand, the learner should be able to:" statements with a), b), c) etc.
- learningExperiences (string): "The learner is guided to:" followed by bulleted activities using "• "
- inquiryQuestions (string): Key inquiry questions for the sub-strand
- coreCompetencies (string): e.g. Communication and Collaboration, Self-efficacy, Critical Thinking
- values (string): e.g. Unity, Responsibility, Respect, Patriotism
- pcis (string): Pertinent and Contemporary Issues e.g. Safety, Health, Citizenship

Follow the EXACT format from KICD curriculum design documents. Include detailed, specific content for each sub-strand.
Your response MUST be ONLY a valid JSON array, no other text.`;

    const userPrompt = `Generate a CBC-compliant scheme of work for:
- Grade: ${grade}
- Subject: ${subject}
- Strand: ${strand}
${subStrandContext}
${context ? `\nAdditional context from the teacher: ${context}` : ""}

Return ONLY a valid JSON array with one object per sub-strand.`;

    console.log(`Generating scheme for ${grade} ${subject} - ${strand} (${subStrands?.length || "unknown"} sub-strands)`);

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

    console.log(`Generated ${rows.length} scheme rows successfully`);

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
