import { SchemeRow, columnHeaders, kiswahiliSubjects } from "@/data/curriculum";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface SchemePreviewProps {
  rows: SchemeRow[];
  subject: string;
  grade: string;
  strand: string;
}

const SchemePreview = ({ rows, subject, grade, strand }: SchemePreviewProps) => {
  const isSw = kiswahiliSubjects.includes(subject);
  const headers = isSw ? columnHeaders.sw : columnHeaders.en;

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="font-serif text-lg font-bold text-foreground">
          {isSw ? "Mpango wa Kazi" : "Scheme of Work"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {grade} — {subject} — {strand}
        </p>
        <p className="text-xs text-muted-foreground">
          {isSw ? "Mtaala wa CBC - KICD Kenya" : "CBC Curriculum — KICD Kenya"}
        </p>
      </div>

      <ScrollArea className="w-full rounded-lg border border-border">
        <div className="min-w-[1100px]">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="bg-primary text-primary-foreground px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-muted/50"}>
                  <td className="px-3 py-2 font-medium text-xs align-top border-b border-border">{row.strand}</td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border">{row.subStrand}</td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border whitespace-pre-line">{row.learningOutcomes}</td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border whitespace-pre-line">{row.learningExperiences}</td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border whitespace-pre-line">{row.inquiryQuestions}</td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border">{row.coreCompetencies}</td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border">{row.values}</td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border">{row.pcis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default SchemePreview;
