import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Sites to scrape and their index/sitemap pages
const SOURCES = [
  {
    site: "teacher.co.ke",
    indexUrls: [
      "https://teacher.co.ke/download-2026-schemes-of-work-for-free/",
      "https://teacher.co.ke/upper-primary-materials/",
      "https://teacher.co.ke/download-grade-7-9-junior-secondary-school-materials/",
      "https://teacher.co.ke/download-free-pre-primary-1-2-materials-pp1-pp2/",
    ],
  },
  {
    site: "schemesofwork.com",
    indexUrls: [
      "https://schemesofwork.com/",
    ],
  },
];

// Grade/subject patterns to extract from titles
const GRADE_PATTERNS = [
  /grade\s*(\d+)/i,
  /pp\s*(\d)/i,
  /form\s*(\d)/i,
  /class\s*(\d+)/i,
];

const SUBJECT_KEYWORDS = [
  "Mathematics", "English", "Kiswahili", "Science", "Social Studies",
  "CRE", "Christian Religious Education", "IRE", "Islamic Religious Education",
  "Agriculture", "Creative Activities", "Environmental Activities",
  "Art", "Music", "Physical Education", "Home Science", "Business Studies",
  "Creative Arts", "Language Activities", "Mathematical Activities",
  "HRE", "Hindu Religious Education", "Literacy", "Hygiene", "Nutrition",
];

function extractGrade(text: string): string | null {
  for (const pattern of GRADE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const num = match[1];
      if (text.toLowerCase().includes("pp")) return `PP ${num}`;
      if (text.toLowerCase().includes("form")) return `Form ${num}`;
      return `Grade ${num}`;
    }
  }
  return null;
}

function extractSubject(text: string): string | null {
  const lower = text.toLowerCase();
  for (const subj of SUBJECT_KEYWORDS) {
    if (lower.includes(subj.toLowerCase())) return subj;
  }
  return null;
}

function extractTerm(text: string): string | null {
  const match = text.match(/term\s*(\d)/i);
  return match ? `Term ${match[1]}` : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: { site: string; found: number; inserted: number }[] = [];

    for (const source of SOURCES) {
      let allLinks: string[] = [];

      // Step A: Scrape each index page for links
      for (const indexUrl of source.indexUrls) {
        console.log(`Scraping index: ${indexUrl}`);
        try {
          const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: indexUrl,
              formats: ["links", "markdown"],
              onlyMainContent: true,
            }),
          });

          if (!scrapeRes.ok) {
            console.error(`Firecrawl error for ${indexUrl}: ${scrapeRes.status}`);
            continue;
          }

          const scrapeData = await scrapeRes.json();
          const links = scrapeData.data?.links || scrapeData.links || [];
          // Filter for scheme-related links
          const schemeLinks = links.filter((link: string) => {
            const l = link.toLowerCase();
            return (
              (l.includes("scheme") || l.includes("curriculum") || l.includes("grade") || l.includes("cbc")) &&
              !l.includes("login") && !l.includes("register") && !l.includes("cart")
            );
          });
          allLinks.push(...schemeLinks);
        } catch (e) {
          console.error(`Error scraping ${indexUrl}:`, e);
        }
      }

      // Also try Firecrawl map for sitemaps
      if (source.site === "teacher.co.ke") {
        try {
          console.log(`Mapping ${source.site} for scheme URLs...`);
          const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: `https://${source.site}`,
              search: "scheme of work CBC grade",
              limit: 200,
            }),
          });
          if (mapRes.ok) {
            const mapData = await mapRes.json();
            const mapLinks = mapData.links || [];
            allLinks.push(...mapLinks.filter((l: string) =>
              l.toLowerCase().includes("scheme") || l.toLowerCase().includes("grade")
            ));
          }
        } catch (e) {
          console.error(`Map error for ${source.site}:`, e);
        }
      }

      // Deduplicate
      allLinks = [...new Set(allLinks)];
      console.log(`Found ${allLinks.length} scheme-related links from ${source.site}`);

      // Step B: Visit each link to grab metadata
      let inserted = 0;
      for (const link of allLinks.slice(0, 50)) { // Limit to 50 per site per run
        try {
          // Check if already scraped
          const { data: existing } = await supabase
            .from("scheme_references")
            .select("id")
            .eq("url", link)
            .maybeSingle();

          if (existing) continue;

          // Scrape the page for metadata
          const pageRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: link,
              formats: ["markdown"],
              onlyMainContent: true,
            }),
          });

          if (!pageRes.ok) continue;

          const pageData = await pageRes.json();
          const markdown = pageData.data?.markdown || pageData.markdown || "";
          const metadata = pageData.data?.metadata || pageData.metadata || {};
          const title = metadata.title || "";
          const description = metadata.description || "";

          // Extract structured fields from title/content
          const fullText = `${title} ${description} ${markdown.slice(0, 500)}`;
          const grade = extractGrade(fullText);
          const subject = extractSubject(fullText);
          const term = extractTerm(fullText);

          // Only store if it seems scheme-related
          if (!grade && !subject && !title.toLowerCase().includes("scheme")) continue;

          const { error: insertError } = await supabase
            .from("scheme_references")
            .insert({
              source_site: source.site,
              url: link,
              title: title.slice(0, 500),
              grade,
              subject,
              term,
              description: description.slice(0, 1000),
              content_snippet: markdown.slice(0, 2000),
            });

          if (!insertError) inserted++;
          else console.error(`Insert error for ${link}:`, insertError);

          // Small delay to avoid rate limits
          await new Promise(r => setTimeout(r, 500));
        } catch (e) {
          console.error(`Error processing ${link}:`, e);
        }
      }

      results.push({ site: source.site, found: allLinks.length, inserted });
    }

    console.log("Scraping complete:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("scrape-schemes error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
