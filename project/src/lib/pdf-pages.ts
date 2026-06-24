const PDFJS_VERSION = '5.3.93';
const CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

let pdfjsLib: any = null;

async function loadPdfJs() {
  if (typeof window === 'undefined') throw new Error('pdfjs only runs in browser');
  if (!pdfjsLib) {
    pdfjsLib = await import(/* @vite-ignore */ `${CDN}/pdf.min.mjs`);
    pdfjsLib.GlobalWorkerOptions.workerSrc = `${CDN}/pdf.worker.min.mjs`;
  }
  return pdfjsLib;
}

export async function countPagesFromFile(file: File): Promise<number> {
  if (file.type === 'application/pdf') {
    const lib = await loadPdfJs();
    const buffer = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: buffer }).promise;
    return pdf.numPages;
  }
  return 1;
}

export async function countPagesFromUrl(url: string): Promise<number> {
  const isPdf = url.toLowerCase().includes('.pdf') || url.includes('application%2Fpdf');
  if (!isPdf) return 1;
  const res = await fetch(url);
  if (!res.ok) return 1;
  const buffer = await res.arrayBuffer();
  const lib = await loadPdfJs();
  const pdf = await lib.getDocument({ data: buffer }).promise;
  return pdf.numPages;
}
