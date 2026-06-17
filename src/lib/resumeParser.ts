// Client-side resume text extraction. PDF via pdfjs, DOCX via mammoth.
import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";

(pdfjs as any).GlobalWorkerOptions.workerSrc = pdfWorker;

export type ResumeData = {
  name?: string;
  education?: { degree?: string; institution?: string; year?: string }[];
  skills?: string[];
  technologies?: string[];
  projects?: { name: string; description?: string; tech?: string[] }[];
  experience?: { company?: string; role?: string; duration?: string; description?: string }[];
  certifications?: string[];
};

export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const buf = await file.arrayBuffer();
    const pdf = await (pdfjs as any).getDocument({ data: buf }).promise;
    let out = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      out += content.items.map((it: any) => it.str).join(" ") + "\n\n";
    }
    return out.trim();
  }
  if (name.endsWith(".docx")) {
    const buf = await file.arrayBuffer();
    const r = await mammoth.extractRawText({ arrayBuffer: buf });
    return r.value.trim();
  }
  if (name.endsWith(".txt") || file.type === "text/plain") {
    return (await file.text()).trim();
  }
  throw new Error("Unsupported file. Upload a PDF, DOCX, or TXT resume.");
}

export const emptyResume: ResumeData = {
  name: "",
  education: [],
  skills: [],
  technologies: [],
  projects: [],
  experience: [],
  certifications: [],
};
