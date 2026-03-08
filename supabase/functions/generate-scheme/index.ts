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

const kiswahiliSubjects = ["Kiswahili"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { grade, subject, strand, context } = await req.json();

    if (!grade || !subject || !strand) {
      return new Response(
        JSON.stringify({ error: "Grade, subject, and strand are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isSw = kiswahiliSubjects.includes(subject);

    // Step 1: Try to get live KICD curriculum context via Firecrawl search
    let curriculumContext = "";

    if (context && context.trim().length > 0) {
      // User provided their own context — use it as primary source
      curriculumContext = context.trim();
      console.log("Using user-provided context");
    } else if (FIRECRAWL_API_KEY) {
      // Search for KICD curriculum content
      const searchQuery = `KICD Kenya CBC curriculum design ${grade} ${subject} ${strand} scheme of work`;
      console.log("Searching KICD content:", searchQuery);

      try {
        const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: 5,
            scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
          }),
        });

        const searchData = await searchResponse.json();

        if (searchResponse.ok && searchData.data && searchData.data.length > 0) {
          // Combine relevant content from search results
          curriculumContext = searchData.data
            .map((result: { title?: string; markdown?: string; description?: string }) => {
              const parts = [];
              if (result.title) parts.push(`Title: ${result.title}`);
              if (result.markdown) parts.push(result.markdown.substring(0, 2000));
              else if (result.description) parts.push(result.description);
              return parts.join("\n");
            })
            .join("\n\n---\n\n")
            .substring(0, 8000); // Cap context size

          console.log(`Found ${searchData.data.length} KICD search results`);
        } else {
          console.log("No KICD search results found, generating from AI knowledge");
        }
      } catch (searchErr) {
        console.error("Firecrawl search error:", searchErr);
        // Continue without search context — AI will use its training knowledge
      }
    } else {
      console.log("No Firecrawl API key, generating from AI knowledge");
    }

    // Step 2: Generate scheme using Lovable AI
    const systemPrompt = isSw
      ? `Wewe ni mtaalamu wa mitaala ya CBC Kenya (KICD). Tengeneza mpango wa kazi kwa muundo sahihi wa CBC.
Jibu LAZIMA liwe JSON array ya objects zenye fields hizi hasa:
- strand (string): Mada kuu
- subStrand (string): Mada ndogo/masomo
- learningOutcomes (string): Matokeo ya ujifunzaji - tumia "• " kwa kila tokeo
- learningExperiences (string): Shughuli za ujifunzaji - tumia "• " kwa kila shughuli
- inquiryQuestions (string): Maswali ya uchunguzi - tumia "• " kwa kila swali
- coreCompetencies (string): Stadi kuu zilizofundishwa
- values (string): Maadili yaliyofundishwa
- pcis (string): Masuala ya kisasa yanayohusiana

Tengeneza angalau masomo 3-5 tofauti. Tumia istilahi sahihi za Kiswahili cha Kenya.
Jibu LAZIMA liwe JSON array pekee, bila maandishi mengine.`
      : `You are a Kenyan CBC curriculum expert (KICD-aligned). Generate a scheme of work in the exact CBC format.
Your response MUST be a JSON array of objects with exactly these fields:
- strand (string): Main curriculum topic area
- subStrand (string): Specific lesson topics within the strand
- learningOutcomes (string): Bulleted "I Can" statements - use "• " for each outcome
- learningExperiences (string): Practical hands-on activities - use "• " for each activity
- inquiryQuestions (string): Socratic open-ended questions - use "• " for each question
- coreCompetencies (string): Skills like Communication, Critical Thinking, Creativity
- values (string): Character traits like Integrity, Unity, Responsibility
- pcis (string): Pertinent and Contemporary Issues relevant to the lesson

Generate at least 3-5 distinct lessons/sub-strands. Use accurate KICD Kenya CBC terminology.
Your response MUST be ONLY a valid JSON array, no other text.`;

    const userPrompt = `Generate a CBC-compliant scheme of work for:
- Grade: ${grade}
- Subject: ${subject}
- Strand: ${strand}

${curriculumContext ? `Use the following curriculum reference material to ensure accuracy:\n\n${curriculumContext}` : "Use your knowledge of the KICD Kenya CBC curriculum to generate accurate content."}

Return ONLY a valid JSON array.`;

    console.log("Calling Lovable AI to generate scheme...");

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
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Parse JSON from AI response (strip markdown code fences if present)
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let rows: SchemeRow[];
    try {
      rows = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", jsonStr.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "AI returned invalid format. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate structure
    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "AI returned empty scheme. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generated ${rows.length} scheme rows successfully`);

    return new Response(
      JSON.stringify({ rows, source: curriculumContext ? "kicd_search" : "ai_knowledge" }),
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
