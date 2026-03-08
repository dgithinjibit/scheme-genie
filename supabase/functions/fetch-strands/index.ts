const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { grade, subject } = await req.json();

    if (!grade || !subject) {
      return new Response(
        JSON.stringify({ error: "Grade and subject are required" }),
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

    console.log(`Fetching strands for ${grade} - ${subject}`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a KICD Kenya CBC curriculum expert. Return ONLY a JSON array of strand names (strings) for the given grade and subject. Use the exact strand names from the official KICD curriculum designs. No additional text, just the JSON array.`,
          },
          {
            role: "user",
            content: `List all the strands from the official KICD CBC curriculum design for ${grade} ${subject} in Kenya. Return ONLY a JSON array of strings.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to fetch strands" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    let rawContent = aiData.choices?.[0]?.message?.content?.trim() || "";

    // Strip markdown code fences
    if (rawContent.startsWith("```")) {
      rawContent = rawContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let strands: string[];
    try {
      strands = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse strands:", rawContent);
      return new Response(
        JSON.stringify({ error: "Invalid response format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(strands) || strands.length === 0) {
      return new Response(
        JSON.stringify({ error: "No strands found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${strands.length} strands for ${grade} ${subject}`);

    return new Response(
      JSON.stringify({ strands }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-strands error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
