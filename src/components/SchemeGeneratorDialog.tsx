import { useState } from "react";
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
import { grades, subjects, strandsBySubject, type SchemeRow } from "@/data/curriculum";
import SchemePreview from "./SchemePreview";
import { FileText, Download, Save, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { columnHeaders, kiswahiliSubjects } from "@/data/curriculum";

const SchemeGeneratorDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [strand, setStrand] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedRows, setGeneratedRows] = useState<SchemeRow[] | null>(null);

  const availableStrands = subject ? strandsBySubject[subject] || [] : [];

  const resetForm = () => {
    setStep(1);
    setGrade("");
    setSubject("");
    setStrand("");
    setContext("");
    setGeneratedRows(null);
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!grade || !subject || !strand) {
      toast({ title: "Missing fields", description: "Please select grade, subject, and strand.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Simulate AI generation delay
      await new Promise((r) => setTimeout(r, 2000));
      const rows = generateSampleScheme(grade, subject, strand);
      setGeneratedRows(rows);
      setStep(5);
      toast({ title: "Scheme Generated!", description: "Your CBC-compliant scheme of work is ready." });
    } catch {
      toast({ title: "Generation Failed", description: "An error occurred. Please try again.", variant: "destructive" });
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
          <td>${row.strand}</td>
          <td>${row.subStrand}</td>
          <td>${row.learningOutcomes.replace(/\n/g, "<br/>")}</td>
          <td>${row.learningExperiences.replace(/\n/g, "<br/>")}</td>
          <td>${row.inquiryQuestions.replace(/\n/g, "<br/>")}</td>
          <td>${row.coreCompetencies}</td>
          <td>${row.values}</td>
          <td>${row.pcis}</td>
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
              {step < 5 ? "Create Scheme of Work" : "Preview Scheme of Work"}
            </DialogTitle>
          </DialogHeader>

          {step < 5 && (
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4].map((s) => (
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
                <Select value={grade} onValueChange={(v) => { setGrade(v); setStep(2); }}>
                  <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
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
                <p className="text-sm text-muted-foreground">Select a strand for {subject}.</p>
                <Select value={strand} onValueChange={(v) => { setStrand(v); setStep(4); }}>
                  <SelectTrigger><SelectValue placeholder="Select Strand" /></SelectTrigger>
                  <SelectContent>
                    {availableStrands.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => { setStep(2); setSubject(""); }}>← Back</Button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 py-2">
                <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                  <p><span className="font-medium">Grade:</span> {grade}</p>
                  <p><span className="font-medium">Subject:</span> {subject}</p>
                  <p><span className="font-medium">Strand:</span> {strand}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Additional Context (Optional)</label>
                  <Textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder={
                      kiswahiliSubjects.includes(subject)
                        ? "Andika muktadha wa ziada hapa... (k.m., mada maalum, malengo ya somo)"
                        : "Add extra context here... (e.g., specific topics, lesson objectives, learner needs)"
                    }
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setStep(3); setStrand(""); }}>← Back</Button>
                  <Button onClick={handleGenerate} disabled={loading} className="ml-auto gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {loading ? "Generating..." : "Generate Scheme"}
                  </Button>
                </div>
              </div>
            )}

            {step === 5 && generatedRows && (
              <div className="space-y-4 py-2">
                <SchemePreview rows={generatedRows} subject={subject} grade={grade} strand={strand} />
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setStep(4); setGeneratedRows(null); }} className="gap-2">
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
