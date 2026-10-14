/** Builds small sample files of each type in memory, so tests don't need binary files in the repo. */
import JSZip from "jszip";
import * as XLSX from "xlsx";

export async function makeDocx(paragraphs: string[]): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  const body = paragraphs.map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join("");
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

export async function makePptx(slides: { lines: string[]; notes?: string }[]): Promise<Buffer> {
  const zip = new JSZip();
  const para = (t: string) => `<a:p><a:r><a:t>${t}</a:t></a:r></a:p>`;
  slides.forEach((s, i) => {
    const n = i + 1;
    zip.file(`ppt/slides/slide${n}.xml`, `<p:sld xmlns:a="a" xmlns:p="p"><p:txBody>${s.lines.map(para).join("")}</p:txBody></p:sld>`);
    if (s.notes) {
      zip.file(`ppt/slides/_rels/slide${n}.xml.rels`,
        `<Relationships><Relationship Id="rId2" Target="../notesSlides/notesSlide${n}.xml"/></Relationships>`);
      zip.file(`ppt/notesSlides/notesSlide${n}.xml`, `<p:notes xmlns:a="a" xmlns:p="p">${para(s.notes)}${para(String(n))}</p:notes>`);
    }
  });
  return zip.generateAsync({ type: "nodebuffer" });
}

export function makeXlsx(sheets: Record<string, unknown[][]>): Buffer {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/** A valid one-page PDF that says `text` (byte offsets in the xref table are computed, not guessed). */
export function makePdf(text: string): Buffer {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}
