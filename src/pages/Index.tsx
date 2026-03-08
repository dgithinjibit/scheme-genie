import SchemeGeneratorDialog from "@/components/SchemeGeneratorDialog";
import { BookOpen, CheckCircle, FileDown, Globe } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "CBC Compliant",
    desc: "Generates schemes aligned with KICD Kenya curriculum standards.",
  },
  {
    icon: Globe,
    title: "Kiswahili Support",
    desc: "Full Swahili language support for Kiswahili subject schemes.",
  },
  {
    icon: CheckCircle,
    title: "8-Column Format",
    desc: "Strand, Sub-Strand, Outcomes, Experiences, Questions, Competencies, Values & PCIs.",
  },
  {
    icon: FileDown,
    title: "PDF Export",
    desc: "Export professional landscape-oriented documents ready for official use.",
  },
];

const Index = () => {
  const { toast } = useToast();
  const [scraping, setScraping] = useState(false);

  const handleScrapeSchemes = async () => {
    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-schemes");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const summary = data.results?.map((r: any) => `${r.site}: ${r.inserted} new`).join(", ") || "Done";
      toast({ title: "Scheme Index Updated", description: summary });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Scraping failed";
      toast({ title: "Scrape Failed", description: msg, variant: "destructive" });
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Accent bar */}
      <div className="h-1.5 w-full flex">
        <div className="flex-1 bg-kenya-green" />
        <div className="flex-1 bg-kenya-red" />
        <div className="flex-1 bg-kenya-gold" />
      </div>

      {/* Hero */}
      <header className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-medium text-secondary-foreground">
          🇰🇪 KICD CBC Curriculum Tool
        </div>
        <h1 className="font-serif text-5xl md:text-6xl font-bold tracking-tight text-foreground max-w-3xl leading-tight">
          Schemer
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl">
          Generate professional, CBC-compliant Schemes of Work in seconds. Built for Kenyan teachers, by educators.
        </p>
        <div className="mt-8">
          <SchemeGeneratorDialog />
        </div>
      </header>

      {/* Features */}
      <section className="bg-card border-t border-border px-6 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="text-center space-y-2">
              <div className="mx-auto w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Admin Tools */}
      <section className="px-6 py-4 flex justify-center">
        <Button variant="outline" size="sm" onClick={handleScrapeSchemes} disabled={scraping}>
          {scraping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
          {scraping ? "Indexing Schemes..." : "Update Scheme References"}
        </Button>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground border-t border-border">
        Schemer — CBC Scheme of Work Generator • Aligned with KICD Standards
      </footer>
    </div>
  );
};

export default Index;
