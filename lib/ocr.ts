// On-device OCR pipeline: File (image or PDF) -> OCR'd text lines with
// bounding boxes. Fully offline — Tesseract's worker/core/language files and
// pdf.js's worker/cmaps/fonts are all bundled locally (public/tesseract*,
// public/pdfjs, public/tessdata), never fetched from a CDN. Both libraries
// are dynamically imported so they only load when this actually runs, not on
// every page that happens to import this module.
//
// This is best-effort: Tesseract's own layout analysis groups words into
// lines for us, which is far more reliable than hand-rolled bbox clustering,
// but it will still misread messy photos/handwriting. Callers must treat the
// output as a draft for the user to review and correct, never as final data.

export interface OcrLine {
  page: number; // 0-indexed
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OcrProgress {
  page: number; // 1-indexed, for display
  totalPages: number;
  status: string;
  progress: number; // 0..1 within the current status
}

const TESSERACT_WORKER_PATH = "/tesseract/worker.min.js";
const TESSERACT_CORE_PATH = "/tesseract-core";
const TESSERACT_LANG_PATH = "/tessdata";
const PDFJS_WORKER_SRC = "/pdfjs/pdf.worker.min.mjs";
const PDFJS_CMAP_URL = "/pdfjs/cmaps/";
const PDFJS_STANDARD_FONT_URL = "/pdfjs/standard_fonts/";

// Upscaling PDF pages before OCR noticeably improves accuracy (Tesseract's
// own docs recommend high-resolution input); 2x is a reasonable trade-off
// against memory/CPU on a phone.
const PDF_RENDER_SCALE = 2;

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

/** Render every page of a PDF to a canvas. Tesseract itself only accepts
 *  raster images, not PDFs. */
async function pdfToCanvases(file: File): Promise<HTMLCanvasElement[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;

  const data = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({
    data,
    cMapUrl: PDFJS_CMAP_URL,
    cMapPacked: true,
    standardFontDataUrl: PDFJS_STANDARD_FONT_URL,
  }).promise;

  const canvases: HTMLCanvasElement[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, viewport }).promise;
    canvases.push(canvas);
  }
  return canvases;
}

/**
 * Run OCR on an uploaded image or PDF, returning every recognised line
 * (Tesseract's own block/paragraph/line segmentation) with its bounding box
 * and which page it came from. Reports progress per page via `onProgress`.
 */
export async function runOcr(
  file: File,
  onProgress?: (p: OcrProgress) => void,
): Promise<OcrLine[]> {
  const images: (File | HTMLCanvasElement)[] = isPdf(file)
    ? await pdfToCanvases(file)
    : [file];

  const { createWorker } = await import("tesseract.js");
  const totalPages = images.length;
  let currentPage = 1;
  const worker = await createWorker("eng", 1, {
    workerPath: TESSERACT_WORKER_PATH,
    corePath: TESSERACT_CORE_PATH,
    langPath: TESSERACT_LANG_PATH,
    logger: (m) => {
      if (typeof m.progress === "number") {
        onProgress?.({
          page: currentPage,
          totalPages,
          status: m.status,
          progress: m.progress,
        });
      }
    },
  });

  const lines: OcrLine[] = [];
  try {
    for (let i = 0; i < images.length; i++) {
      currentPage = i + 1;
      const { data } = await worker.recognize(images[i], {}, { blocks: true });
      for (const block of data.blocks ?? []) {
        for (const paragraph of block.paragraphs) {
          for (const line of paragraph.lines) {
            const text = line.text.trim();
            if (text) lines.push({ page: i, text, bbox: line.bbox });
          }
        }
      }
    }
  } finally {
    await worker.terminate();
  }

  return lines;
}
