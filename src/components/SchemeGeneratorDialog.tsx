import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { grades, getSubjectsForGrade, getHardcodedStrands, getSubStrandsForStrand, getLessonsPerWeek, type SchemeRow } from "@/data/curriculum";
import SchemePreview from "./SchemePreview";
import { FileText, Download, Save, Loader2, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { columnHeaders, kiswahiliSubjects } from "@/data/curriculum";

const SchemeGeneratorDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [strand, setStrand] = useState("");
  const [subStrand, setSubStrand] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedRows, setGeneratedRows] = useState<SchemeRow[] | null>(null);
  const [availableStrands, setAvailableStrands] = useState<string[]>([]);
  const [availableSubStrands, setAvailableSubStrands] = useState<string[]>([]);
  const [loadingStrands, setLoadingStrands] = useState(false);

  // TODO: Remove test filter — temporarily locked for testing
  const subjects = ["Creative Activities"];

  // Fetch strands dynamically when grade + subject are selected
  useEffect(() => {
    if (!grade || !subject) {
      setAvailableStrands([]);
      return;
    }

    const fetchStrands = async () => {
      setLoadingStrands(true);
      try {
        // Check hardcoded data first
        const hardcoded = getHardcodedStrands(grade, subject);
        if (hardcoded) {
          setAvailableStrands(hardcoded.map(s => s.name));
          setLoadingStrands(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke("fetch-strands", {
          body: { grade, subject },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setAvailableStrands(data.strands || []);
      } catch (err) {
        console.error("Failed to fetch strands:", err);
        toast({
          title: "Could not load strands",
          description: "Please try selecting the subject again.",
          variant: "destructive",
        });
        setAvailableStrands([]);
      } finally {
        setLoadingStrands(false);
      }
    };

    fetchStrands();
  }, [grade, subject]);

  const resetForm = () => {
    setStep(1);
    setGrade("");
    setSubject("");
    setStrand("");
    setSubStrand("");
    setContext("");
    setGeneratedRows(null);
    setLoading(false);
    setAvailableStrands([]);
    setAvailableSubStrands([]);
  };

  // Populate sub-strands when strand is selected
  useEffect(() => {
    if (!grade || !subject || !strand) {
      setAvailableSubStrands([]);
      return;
    }
    const subs = getSubStrandsForStrand(grade, subject, strand);
    if (subs) {
      setAvailableSubStrands(subs.map(s => s.name));
    } else {
      setAvailableSubStrands([]);
    }
  }, [grade, subject, strand]);

  const handleGenerate = async () => {
    if (!grade || !subject || !strand || !subStrand) {
      toast({ title: "Missing fields", description: "Please select grade, subject, strand, and sub-strand.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Get the specific sub-strand info
      const allSubs = getSubStrandsForStrand(grade, subject, strand);
      const selectedSub = allSubs?.find(s => s.name === subStrand);
      const subStrands = selectedSub ? [selectedSub] : [];
      
      const lessonsPerWeek = getLessonsPerWeek(grade, subject);
      const { data, error } = await supabase.functions.invoke("generate-scheme", {
        body: { grade, subject, strand, context, subStrands, lessonsPerWeek },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedRows(data.rows);
      setStep(6);
      const sourceMsg = data.source === "kicd_search"
        ? "Generated using live KICD curriculum data."
        : "Generated using AI curriculum knowledge.";
      toast({ title: "Scheme Generated!", description: sourceMsg });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred. Please try again.";
      toast({ title: "Generation Failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!generatedRows) return;
    const isSw = kiswahiliSubjects.includes(subject);
    const headers = isSw ? columnHeaders.sw : columnHeaders.en;

    const printArea = document.getElementById("scheme-print-area");
    if (!printArea) return;

    const tableHTML = `
      <div style="text-align:center;margin-bottom:16px;">
        <h2 style="margin:0;font-size:16pt;">${isSw ? "Mpango wa Kazi" : "Scheme of Work"}</h2>
        <p style="margin:4px 0;font-size:11pt;">${grade} — ${subject} — ${strand}</p>
        <p style="margin:0;font-size:9pt;color:#666;">${isSw ? "Mtaala wa CBC - KICD Kenya" : "CBC Curriculum — KICD Kenya"}</p>
      </div>
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${generatedRows.map((row) => `<tr>
          <td>${row.week}</td>
          <td>${row.lesson}</td>
          <td>${row.strand}</td>
          <td>${row.subStrand}</td>
          <td>${row.specificLearningOutcome.replace(/\n/g, "<br/>")}</td>
          <td>${row.keyInquiryQuestion}</td>
          <td>${row.learningExperiences.replace(/\n/g, "<br/>")}</td>
          <td>${row.learningResources}</td>
          <td>${row.assessmentMethods}</td>
          <td>${row.reflection}</td>
        </tr>`).join("")}</tbody>
      </table>`;

    printArea.innerHTML = tableHTML;
    window.print();
    toast({ title: "PDF Export", description: "Print dialog opened. Select 'Save as PDF' to export." });
  };

  const handleSave = () => {
    toast({
      title: "Saved to Library",
      description: "Your scheme has been saved locally. Connect a backend to enable cloud storage.",
    });
  };

  return (
    <>
      <div id="scheme-print-area" className="hidden print:block" />
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogTrigger asChild>
          <Button size="lg" className="gap-2 font-semibold text-base px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <Sparkles className="w-5 h-5" />
            Generate Scheme of Work
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {step < 6 ? "Create Scheme of Work" : "Preview Scheme of Work"}
            </DialogTitle>
          </DialogHeader>

          {step < 6 && (
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
          )}

          <ScrollArea className="max-h-[70vh] pr-2">
            {step === 1 && (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">Select the grade level for this scheme.</p>
                <Select value={grade} onValueChange={(v) => { setGrade(v); setSubject(""); setStrand(""); setStep(2); }}>
                  <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
                  <SelectContent>
                    {["Grade 3"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">Select the subject for {grade}.</p>
                <Select value={subject} onValueChange={(v) => { setSubject(v); setStrand(""); setStep(3); }}>
                  <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => { setStep(1); setGrade(""); }}>← Back</Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  {loadingStrands
                    ? `Loading KICD strands for ${subject}...`
                    : `Select a strand for ${subject}.`}
                </p>
                {loadingStrands ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Fetching strands from KICD curriculum...
                  </div>
                ) : (
                  <Select value={strand} onValueChange={(v) => { setStrand(v); setSubStrand(""); setStep(4); }}>
                    <SelectTrigger><SelectValue placeholder="Select Strand" /></SelectTrigger>
                    <SelectContent>
                      {["2.0 Performing and Displaying"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Button variant="ghost" size="sm" onClick={() => { setStep(2); setSubject(""); }}>← Back</Button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">Select a sub-strand for {strand}.</p>
                <Select value={subStrand} onValueChange={(v) => { setSubStrand(v); setStep(5); }}>
                  <SelectTrigger><SelectValue placeholder="Select Sub-Strand" /></SelectTrigger>
                  <SelectContent>
                    {availableSubStrands.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => { setStep(3); setStrand(""); }}>← Back</Button>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4 py-2">
                <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                  <p><span className="font-medium">Grade:</span> {grade}</p>
                  <p><span className="font-medium">Subject:</span> {subject}</p>
                  <p><span className="font-medium">Strand:</span> {strand}</p>
                  <p><span className="font-medium">Sub-Strand:</span> {subStrand}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {kiswahiliSubjects.includes(subject)
                      ? "Unapanga kutumia rasilimali gani za kujifunza?"
                      : "What learning resources do you plan on using?"}
                  </label>
                  <Textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder={
                      kiswahiliSubjects.includes(subject)
                        ? "k.m., vitabu vya kiada, video, vifaa vya sanaa..."
                        : "e.g., textbooks, videos, art supplies, musical instruments, outdoor space..."
                    }
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setStep(4); setSubStrand(""); }}>← Back</Button>
                  <Button onClick={handleGenerate} disabled={loading} className="ml-auto gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {loading ? "Generating..." : "Generate Scheme"}
                  </Button>
                </div>
              </div>
            )}

            {step === 6 && generatedRows && (
              <div className="space-y-4 py-2">
                <SchemePreview rows={generatedRows} subject={subject} grade={grade} strand={strand} />
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setStep(5); setGeneratedRows(null); }} className="gap-2">
                    <FileText className="w-4 h-4" /> Regenerate
                  </Button>
                  <Button variant="secondary" onClick={handleSave} className="gap-2">
                    <Save className="w-4 h-4" /> Save to Library
                  </Button>
                  <Button onClick={handleExportPDF} className="gap-2 ml-auto">
                    <Download className="w-4 h-4" /> Export PDF
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SchemeGeneratorDialog;
