import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOURCES = [
  {
    site: "teacher.co.ke",
    indexUrls: [
      "https://teacher.co.ke/download-2026-schemes-of-work-for-free/",
      "https://teacher.co.ke/upper-primary-materials/",
      "https://teacher.co.ke/download-grade-7-9-junior-secondary-school-materials/",
      "https://teacher.co.ke/download-free-pre-primary-1-2-materials-pp1-pp2/",
    ],
    useMap: true,
    mapSearch: "scheme of work CBC grade",
    waitFor: 0,
  },
  {
    site: "schemesofwork.com",
    indexUrls: [
      "https://schemesofwork.com/",
      "https://schemesofwork.com/schemes-of-work/",
      "https://schemesofwork.com/cbc-schemes-of-work/",
    ],
    useMap: true,
    mapSearch: "scheme of work grade",
    waitFor: 5000, // JS-rendered site needs wait time
  },
];

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

const MAX_PAGES_PER_RUN = 15; // Keep well under 150s timeout
const START_TIME = Date.now();
const TIMEOUT_BUFFER_MS = 120_000; // Stop after 2 min to allow response

function isTimeBudgetExhausted(): boolean {
  return Date.now() - START_TIME > TIMEOUT_BUFFER_MS;
}

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

async function discoverLinks(
  source: typeof SOURCES[number],
  apiKey: string
): Promise<string[]> {
  const allLinks: Set<string> = new Set();

  // Scrape index pages for links
  for (const indexUrl of source.indexUrls) {
    if (isTimeBudgetExhausted()) break;
    console.log(`Scraping index: ${indexUrl}`);
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: indexUrl,
          formats: ["links", "markdown"],
          onlyMainContent: true,
          waitFor: source.waitFor || 0,
        }),
      });
      if (!res.ok) { console.error(`Firecrawl ${res.status} for ${indexUrl}`); continue; }
      const data = await res.json();
      const links: string[] = data.data?.links || data.links || [];
      for (const link of links) {
        const l = link.toLowerCase();
        if (
          (l.includes("scheme") || l.includes("curriculum") || l.includes("grade") || l.includes("cbc")) &&
          !l.includes("login") && !l.includes("register") && !l.includes("cart")
        ) {
          allLinks.add(link);
        }
      }
    } catch (e) {
      console.error(`Error scraping ${indexUrl}:`, e);
    }
  }

  // Use map endpoint for sitemap discovery
  if (source.useMap && !isTimeBudgetExhausted()) {
    try {
      console.log(`Mapping ${source.site}...`);
      const res = await fetch("https://api.firecrawl.dev/v1/map", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: `https://${source.site}`,
          search: source.mapSearch,
          limit: 200,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const links: string[] = data.links || [];
        for (const link of links) {
          const l = link.toLowerCase();
          if (l.includes("scheme") || l.includes("grade") || l.includes("cbc")) {
            allLinks.add(link);
          }
        }
      }
    } catch (e) {
      console.error(`Map error for ${source.site}:`, e);
    }
  }

  return [...allLinks];
}

async function processLink(
  link: string,
  source: typeof SOURCES[number],
  apiKey: string,
  supabase: any
): Promise<boolean> {
  // Check if already scraped
  const { data: existing } = await supabase
    .from("scheme_references")
    .select("id")
    .eq("url", link)
    .maybeSingle();
  if (existing) return false;

  // Scrape page with waitFor for JS sites
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: link,
      formats: ["markdown"],
      onlyMainContent: true,
      waitFor: source.waitFor || 0,
    }),
  });
  if (!res.ok) return false;

  const pageData = await res.json();
  const markdown = pageData.data?.markdown || pageData.markdown || "";
  const metadata = pageData.data?.metadata || pageData.metadata || {};
  const title = metadata.title || "";
  const description = metadata.description || "";

  const fullText = `${title} ${description} ${markdown.slice(0, 500)}`;
  const grade = extractGrade(fullText);
  const subject = extractSubject(fullText);
  const term = extractTerm(fullText);

  if (!grade && !subject && !title.toLowerCase().includes("scheme")) return false;

  // Upsert for idempotency
  const { error } = await supabase
    .from("scheme_references")
    .upsert(
      {
        source_site: source.site,
        url: link,
        title: title.slice(0, 500),
        grade,
        subject,
        term,
        description: description.slice(0, 1000),
        content_snippet: markdown.slice(0, 2000),
      },
      { onConflict: "url" }
    );

  if (error) { console.error(`Upsert error for ${link}:`, error); return false; }
  return true;
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: { site: string; found: number; inserted: number; stopped_early: boolean }[] = [];

    for (const source of SOURCES) {
      if (isTimeBudgetExhausted()) {
        results.push({ site: source.site, found: 0, inserted: 0, stopped_early: true });
        continue;
      }

      const links = await discoverLinks(source, FIRECRAWL_API_KEY);
      console.log(`Found ${links.length} links from ${source.site}`);

      let inserted = 0;
      let stoppedEarly = false;
      for (const link of links.slice(0, MAX_PAGES_PER_RUN)) {
        if (isTimeBudgetExhausted()) { stoppedEarly = true; break; }
        try {
          const ok = await processLink(link, source, FIRECRAWL_API_KEY, supabase);
          if (ok) inserted++;
          await new Promise((r) => setTimeout(r, 300));
        } catch (e) {
          console.error(`Error processing ${link}:`, e);
        }
      }

      results.push({ site: source.site, found: links.length, inserted, stopped_early: stoppedEarly });
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
