import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import type { LayoutOptions, JpgToPdfSettings, WatermarkOptions } from '../types';

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes >= 1048576) {
    return (bytes / 1048576).toFixed(2) + ' MB';
  }
  return (bytes / 1024).toFixed(1) + ' KB';
}

/**
 * Prompt user on mobile / desktop for preferred file download name
 */
export function promptDownloadName(defaultName: string): string | null {
  const lastDot = defaultName.lastIndexOf('.');
  const base = lastDot > 0 ? defaultName.slice(0, lastDot) : defaultName;
  const ext = lastDot > 0 ? defaultName.slice(lastDot) : '';
  const asked = window.prompt('Enter file name (without extension):', base);
  if (asked === null) return null; // Cancelled
  let cleaned = (asked.trim() || base).replace(/[\\/:*?"<>|]/g, '_');
  if (ext && !cleaned.toLowerCase().endsWith(ext.toLowerCase())) {
    cleaned += ext;
  }
  return cleaned;
}

export function downloadBlob(blob: Blob, defaultName: string) {
  const fileName = promptDownloadName(defaultName);
  if (!fileName) return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

export function downloadPdfBytes(bytes: Uint8Array, defaultName: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
  downloadBlob(blob, defaultName);
}

/**
 * Load PDF with PDF.js and return page count
 */
export async function getPdfInfo(data: ArrayBuffer | Uint8Array, password: string = '') {
  if (!window.pdfjsLib) throw new Error('PDF.js engine is still loading. Please try again.');
  const loadingTask = window.pdfjsLib.getDocument({
    data: data instanceof Uint8Array ? data : new Uint8Array(data),
    password,
  });
  const doc = await loadingTask.promise;
  const numPages = doc.numPages;
  return { doc, numPages };
}

/**
 * Render a single PDF page into a canvas dataURL
 */
export async function renderPdfPageToDataUrl(
  pdfDocOrBytes: any,
  pageNum: number,
  scale: number = 0.8,
  password: string = ''
): Promise<{ dataUrl: string; width: number; height: number }> {
  let doc = pdfDocOrBytes;
  if (pdfDocOrBytes instanceof ArrayBuffer || pdfDocOrBytes instanceof Uint8Array) {
    const info = await getPdfInfo(pdfDocOrBytes, password);
    doc = info.doc;
  }
  const page = await doc.getPage(pageNum);
  const vp = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(vp.width));
  canvas.height = Math.max(1, Math.floor(vp.height));
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport: vp,
    intent: 'display',
  }).promise;

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  // Free canvas memory immediately for low-RAM Android phones
  canvas.width = 0;
  canvas.height = 0;
  return { dataUrl, width: vp.width, height: vp.height };
}

/**
 * Check if a PDF is encrypted or requires password
 */
export async function checkPdfEncrypted(ab: ArrayBuffer): Promise<boolean> {
  if (!window.pdfjsLib) return false;
  try {
    const task = window.pdfjsLib.getDocument({ data: new Uint8Array(ab), password: '' });
    await task.promise;
    return false;
  } catch (err: any) {
    if (
      err?.name === 'PasswordException' ||
      err?.code === 1 ||
      err?.code === 2 ||
      /password|encrypted|NeedPassword/i.test(err?.message || '')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Parse page syntax e.g. "1, 3-5, 8" into array of numbers [1, 3, 4, 5, 8]
 */
export function parsePageRanges(input: string, maxPages?: number): number[] {
  if (!input.trim()) return [];
  const parts = input.split(',').map((p) => p.trim()).filter(Boolean);
  const result: number[] = [];

  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      const num = parseInt(part, 10);
      if (num >= 1 && (!maxPages || num <= maxPages)) {
        result.push(num);
      }
    } else if (/^\d+\s*-\s*\d+$/.test(part)) {
      const [start, end] = part.split('-').map((s) => parseInt(s.trim(), 10));
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          if (i >= 1 && (!maxPages || i <= maxPages)) {
            result.push(i);
          }
        }
      }
    }
  }
  return [...new Set(result)].sort((a, b) => a - b);
}

/**
 * Format numbers array into compact range e.g. [1,2,3,5] -> "1-3,5"
 */
export function formatPageRangeString(pages: number[]): string {
  if (!pages.length) return '';
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === prev + 1) {
      prev = sorted[i];
      continue;
    }
    ranges.push(start === prev ? String(start) : `${start}-${prev}`);
    if (i < sorted.length) {
      start = sorted[i];
      prev = sorted[i];
    }
  }
  return ranges.join(', ');
}

/* =========================================================================
   1. LAYOUT (N-UP / MULTI PAGES PER SHEET)
   ========================================================================= */
export async function applyLayoutPdf(ab: ArrayBuffer, opts: LayoutOptions): Promise<Uint8Array> {
  const src = await PDFDocument.load(ab);
  const dest = await PDFDocument.create();

  const mmToPt = 2.83465;
  const outerMargin = opts.outerMarginMm * mmToPt;
  const innerMargin = opts.innerMarginMm * mmToPt;

  const standardSizes: Record<string, [number, number]> = {
    A0: [2383.94, 3370.39],
    A1: [1683.78, 2383.94],
    A2: [1190.55, 1683.78],
    A3: [841.89, 1190.55],
    A4: [595.28, 841.89],
    A5: [419.53, 595.28],
    A6: [297.64, 419.53],
    Letter: [612, 792],
    Legal: [612, 1008],
    B4: [708.66, 1000.63],
    B5: [498.9, 708.66],
  };

  const gridMap: Record<number, [number, number]> = {
    2: [2, 1],
    3: [3, 1],
    4: [2, 2],
    6: [3, 2],
    8: [4, 2],
    9: [3, 3],
    10: [5, 2],
    12: [4, 3],
    15: [5, 3],
  };

  let [cols, rows] = gridMap[opts.pagesPerSheet] || [2, 1];
  if (opts.readingDirection === 'ttb' && (opts.pagesPerSheet === 2 || opts.pagesPerSheet === 3)) {
    cols = 1;
    rows = opts.pagesPerSheet;
  }

  let dims: [number, number];
  if (opts.pageSize === 'Original') {
    const firstP = src.getPage(0);
    dims = [firstP.getWidth(), firstP.getHeight()];
  } else if (opts.pageSize === 'Custom') {
    const factor = opts.customUnit === 'cm' ? 28.3465 : opts.customUnit === 'inch' ? 72 : 2.83465;
    dims = [opts.customWidth * factor, opts.customHeight * factor];
  } else {
    dims = standardSizes[opts.pageSize] || [595.28, 841.89];
  }

  // Orientation handling
  if (opts.orientation === 'landscape' && dims[0] < dims[1]) {
    dims = [dims[1], dims[0]];
  } else if (opts.orientation === 'portrait' && dims[0] > dims[1]) {
    dims = [dims[1], dims[0]];
  } else if (opts.orientation === 'automatic') {
    const wantLandscape = cols > rows;
    const wantPortrait = rows > cols;
    if (wantLandscape && dims[0] < dims[1]) dims = [dims[1], dims[0]];
    else if (wantPortrait && dims[0] > dims[1]) dims = [dims[1], dims[0]];
  }

  const cellW = (dims[0] - 2 * outerMargin - (cols - 1) * innerMargin) / cols;
  const cellH = (dims[1] - 2 * outerMargin - (rows - 1) * innerMargin) / rows;
  const total = src.getPageCount();
  const pagesPerSheet = opts.pagesPerSheet;

  for (let i = 0; i < total; i += pagesPerSheet) {
    const newPage = dest.addPage([dims[0], dims[1]]);
    const slice = src.getPages().slice(i, i + pagesPerSheet);
    const embedded = await dest.embedPages(slice);

    // Uniform scale calculation for equal sizing
    let sheetScale = Infinity;
    for (let j = 0; j < embedded.length; j++) {
      const natW = embedded[j].width || 1;
      const natH = embedded[j].height || 1;
      const s = Math.min(cellW / natW, cellH / natH);
      if (s < sheetScale) sheetScale = s;
    }
    if (!isFinite(sheetScale) || sheetScale <= 0) sheetScale = 1;

    for (let j = 0; j < embedded.length; j++) {
      let row = 0;
      let col = 0;

      if (opts.readingDirection === 'ttb') {
        col = Math.floor(j / rows);
        row = j % rows;
      } else {
        row = Math.floor(j / cols);
        col = j % cols;
        if (opts.readingDirection === 'rtl') col = cols - 1 - col;
      }

      const cellX = outerMargin + col * (cellW + innerMargin);
      const cellY = dims[1] - outerMargin - (row + 1) * cellH - row * innerMargin;

      const emb = embedded[j];
      const natW = emb.width || 1;
      const natH = emb.height || 1;
      const drawW = natW * sheetScale;
      const drawH = natH * sheetScale;
      const x = cellX + (cellW - drawW) / 2;
      const y = cellY + (cellH - drawH) / 2;

      newPage.drawPage(emb, { x, y, width: drawW, height: drawH });

      if (opts.hasBorder) {
        newPage.drawRectangle({
          x,
          y,
          width: drawW,
          height: drawH,
          borderWidth: 1,
          borderColor: rgb(0.1, 0.1, 0.1),
        });
      }
    }
  }

  return await dest.save();
}

/* =========================================================================
   2. REMOVE & REORDER & ROTATE PAGES
   ========================================================================= */
export async function removeAndReorderPdfPages(
  ab: ArrayBuffer,
  pageOrder: number[], // 1-indexed order of pages to keep
  rotations: Record<number, number> = {} // pageNum -> degrees (90, 180, 270)
): Promise<Uint8Array> {
  const src = await PDFDocument.load(ab);
  const dest = await PDFDocument.create();

  for (const pageNum of pageOrder) {
    const pageIdx = pageNum - 1;
    if (pageIdx >= 0 && pageIdx < src.getPageCount()) {
      const [copied] = await dest.copyPages(src, [pageIdx]);
      const addRot = rotations[pageNum] || 0;
      if (addRot !== 0) {
        const cur = copied.getRotation().angle || 0;
        copied.setRotation(degrees((cur + addRot + 360) % 360));
      }
      dest.addPage(copied);
    }
  }

  return await dest.save();
}

/* =========================================================================
   3. COMPRESS PDF
   ========================================================================= */
export async function compressPdfFile(
  ab: ArrayBuffer,
  qualityOrTarget: number, // < 1 = quality ratio, > 1 = target KB
  isTargetMode: boolean,
  onProgress?: (pct: number, status: string) => void
): Promise<{ bytes: Uint8Array; originalSize: number; newSize: number; skipped?: boolean }> {
  const originalSize = ab.byteLength;
  const { doc, numPages } = await getPdfInfo(ab);

  async function renderPagesAt(q: number, scaleMul: number): Promise<Uint8Array> {
    const newDoc = await PDFDocument.create();
    for (let p = 1; p <= numPages; p++) {
      if (onProgress) {
        const pct = Math.round((p / numPages) * 100);
        onProgress(pct, `Compressing page ${p} of ${numPages}...`);
      }
      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale: scaleMul });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(vp.width));
      canvas.height = Math.max(1, Math.floor(vp.height));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp, intent: 'display' }).promise;
      }
      const dataUrl = canvas.toDataURL('image/jpeg', Math.max(0.15, Math.min(0.92, q)));
      canvas.width = 0;
      canvas.height = 0;

      const base64Data = dataUrl.split(',')[1];
      const binaryString = atob(base64Data);
      const imgBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        imgBytes[i] = binaryString.charCodeAt(i);
      }

      const embeddedJpg = await newDoc.embedJpg(imgBytes);
      const newPage = newDoc.addPage([embeddedJpg.width, embeddedJpg.height]);
      newPage.drawImage(embeddedJpg, {
        x: 0,
        y: 0,
        width: embeddedJpg.width,
        height: embeddedJpg.height,
      });
    }
    return await newDoc.save();
  }

  if (!isTargetMode) {
    const q = qualityOrTarget;
    const scale = q >= 0.8 ? 1.2 : q >= 0.5 ? 0.95 : 0.7;
    let res = await renderPagesAt(q, scale);
    if (res.length >= originalSize) {
      // Try slightly stronger pass if file didn't shrink
      res = await renderPagesAt(Math.min(q, 0.4), 0.7);
    }
    if (res.length >= originalSize) {
      return { bytes: new Uint8Array(ab), originalSize, newSize: originalSize, skipped: true };
    }
    return { bytes: res, originalSize, newSize: res.length };
  }

  // Exact target size binary search (target in KB)
  const targetBytes = Math.min(qualityOrTarget * 1024, originalSize - 1);
  if (targetBytes <= 0 || originalSize <= targetBytes) {
    return { bytes: new Uint8Array(ab), originalSize, newSize: originalSize, skipped: true };
  }

  let lo = 0.15;
  let hi = 0.92;
  let bestUnder: Uint8Array | null = null;

  for (let iter = 0; iter < 4; iter++) {
    const mid = (lo + hi) / 2;
    const scale = mid >= 0.7 ? 1.15 : mid >= 0.45 ? 0.9 : 0.65;
    const bytes = await renderPagesAt(mid, scale);
    if (bytes.length <= targetBytes && bytes.length < originalSize) {
      if (!bestUnder || bytes.length > bestUnder.length) bestUnder = bytes;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  if (bestUnder) {
    return { bytes: bestUnder, originalSize, newSize: bestUnder.length };
  }

  const finalAttempt = await renderPagesAt(0.2, 0.55);
  if (finalAttempt.length < originalSize) {
    return { bytes: finalAttempt, originalSize, newSize: finalAttempt.length };
  }
  return { bytes: new Uint8Array(ab), originalSize, newSize: originalSize, skipped: true };
}

/* =========================================================================
   4. CONVERT JPG TO PDF
   ========================================================================= */
export async function convertJpgToPdf(
  images: string[], // Data URLs
  settings: JpgToPdfSettings
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const q = settings.quality || 0.85;

  const standardSizes: Record<string, [number, number]> = {
    a4: [595.28, 841.89],
    letter: [612, 792],
  };

  let equalW = 0;
  if (settings.pageSize === 'equal-width-ratio') {
    for (const url of images) {
      const img = await loadImageElement(url);
      if (img.naturalWidth > equalW) equalW = img.naturalWidth;
    }
    equalW = Math.min(Math.max(equalW, 100), 595.28);
  }

  for (const url of images) {
    let embedBytes: Uint8Array;
    if (q < 0.98) {
      const img = await loadImageElement(url);
      const maxDim = q <= 0.75 ? 1800 : 3000;
      const sc = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * sc));
      c.height = Math.max(1, Math.round(img.naturalHeight * sc));
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
      }
      const qUrl = c.toDataURL('image/jpeg', q);
      c.width = 0;
      c.height = 0;
      const base64 = qUrl.split(',')[1];
      const binary = atob(base64);
      embedBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) embedBytes[i] = binary.charCodeAt(i);
    } else {
      const resp = await fetch(url);
      embedBytes = new Uint8Array(await resp.arrayBuffer());
    }

    let embedded;
    try {
      embedded = await pdfDoc.embedJpg(embedBytes);
    } catch {
      embedded = await pdfDoc.embedPng(embedBytes);
    }

    const iw = embedded.width;
    const ih = embedded.height;
    const margin = settings.margin;

    let pageW = 595.28;
    let pageH = 841.89;

    if (settings.pageSize === 'a4-fixed') {
      pageW = 595.28;
      pageH = 841.89;
    } else if (settings.pageSize === 'letter-fixed') {
      pageW = 612;
      pageH = 792;
    } else if (settings.pageSize === 'auto') {
      pageW = iw + 2 * margin;
      pageH = ih + 2 * margin;
    } else if (settings.pageSize === 'equal-width-ratio') {
      pageW = equalW + 2 * margin;
      pageH = ih * (equalW / iw) + 2 * margin;
    } else if (settings.pageSize === 'custom') {
      const mmToPt = 72 / 25.4;
      pageW = (settings.customWidthMm || 210) * mmToPt;
      pageH = (settings.customHeightMm || 297) * mmToPt;
    }

    // Orientation
    if (settings.pageSize !== 'auto' && settings.pageSize !== 'equal-width-ratio') {
      if (settings.orientation === 'portrait' && pageW > pageH) {
        [pageW, pageH] = [pageH, pageW];
      } else if (settings.orientation === 'landscape' && pageH > pageW) {
        [pageW, pageH] = [pageH, pageW];
      } else if (settings.orientation === 'auto') {
        if (iw > ih && pageW < pageH) [pageW, pageH] = [pageH, pageW];
        if (ih > iw && pageH < pageW) [pageW, pageH] = [pageH, pageW];
      }
    }

    const maxW = Math.max(10, pageW - 2 * margin);
    const maxH = Math.max(10, pageH - 2 * margin);
    const scale = Math.min(maxW / iw, maxH / ih);
    const drawW = iw * scale;
    const drawH = ih * scale;
    const x = margin + (maxW - drawW) / 2;
    const y = margin + (maxH - drawH) / 2;

    const page = pdfDoc.addPage([pageW, pageH]);
    page.drawImage(embedded, { x, y, width: drawW, height: drawH });
  }

  return await pdfDoc.save();
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

/* =========================================================================
   5. CONVERT PDF TO JPG
   ========================================================================= */
export async function convertPdfToJpg(
  ab: ArrayBuffer,
  quality: 'normal' | 'high' = 'normal',
  onProgress?: (done: number, total: number, pct: number) => void
): Promise<Array<{ name: string; dataUrl: string; blob: Blob }>> {
  const { doc, numPages } = await getPdfInfo(ab);
  const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const scale = quality === 'high' ? (isMobileDevice ? 3.0 : 4.5) : (isMobileDevice ? 2.0 : 2.5);
  const jpegQ = quality === 'high' ? 0.95 : 0.85;

  const results: Array<{ name: string; dataUrl: string; blob: Blob }> = [];

  for (let p = 1; p <= numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(vp.width));
    canvas.height = Math.max(1, Math.floor(vp.height));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
    }
    const dataUrl = canvas.toDataURL('image/jpeg', jpegQ);
    const blob = await (await fetch(dataUrl)).blob();

    canvas.width = 0;
    canvas.height = 0;

    results.push({
      name: `page_${p}.jpg`,
      dataUrl,
      blob,
    });

    if (onProgress) {
      onProgress(p, numPages, Math.round((p / numPages) * 100));
    }
  }

  return results;
}

/* =========================================================================
   6. MERGE MULTIPLE PDFS
   ========================================================================= */
export async function mergeMultiplePdfs(buffers: ArrayBuffer[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();
  for (const buf of buffers) {
    const doc = await PDFDocument.load(buf);
    const copiedPages = await merged.copyPages(doc, doc.getPageIndices());
    copiedPages.forEach((p) => merged.addPage(p));
  }
  return await merged.save();
}

/* =========================================================================
   7. SPLIT PDF
   ========================================================================= */
export async function splitPdfPages(
  ab: ArrayBuffer,
  selectedPages: number[],
  mergeIntoSingle: boolean
): Promise<{ singlePdf?: Uint8Array; parts?: Array<{ pageNum: number; bytes: Uint8Array }> }> {
  const src = await PDFDocument.load(ab);

  if (mergeIntoSingle) {
    const dest = await PDFDocument.create();
    for (const p of selectedPages) {
      const idx = p - 1;
      if (idx >= 0 && idx < src.getPageCount()) {
        const [copied] = await dest.copyPages(src, [idx]);
        dest.addPage(copied);
      }
    }
    const singlePdf = await dest.save();
    return { singlePdf };
  }

  const parts: Array<{ pageNum: number; bytes: Uint8Array }> = [];
  for (const p of selectedPages) {
    const idx = p - 1;
    if (idx >= 0 && idx < src.getPageCount()) {
      const newDoc = await PDFDocument.create();
      const [copied] = await newDoc.copyPages(src, [idx]);
      newDoc.addPage(copied);
      const bytes = await newDoc.save();
      parts.push({ pageNum: p, bytes });
    }
  }
  return { parts };
}

/* =========================================================================
   8. WATERMARK & PAGE NUMBERS (NEW FEATURE)
   ========================================================================= */
export async function applyWatermarkAndPageNumbers(
  ab: ArrayBuffer,
  options: WatermarkOptions
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(ab);
  const helveticaFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const totalPages = doc.getPageCount();

  // Convert hex color to rgb
  const hex = options.color.replace('#', '');
  const r = parseInt(hex.substring(0, 2) || '0', 16) / 255;
  const g = parseInt(hex.substring(2, 4) || '0', 16) / 255;
  const b = parseInt(hex.substring(4, 6) || '0', 16) / 255;

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();

    // 1. Text Watermark
    if (options.text.trim()) {
      const textWidth = helveticaFont.widthOfTextAtSize(options.text, options.fontSize);
      const textHeight = helveticaFont.heightAtSize(options.fontSize);

      let x = (width - textWidth) / 2;
      let y = (height - textHeight) / 2;
      let angle = options.rotationAngle;

      if (options.position === 'header') {
        y = height - 40;
        angle = 0;
      } else if (options.position === 'footer') {
        y = 30;
        angle = 0;
      } else if (options.position === 'diagonal') {
        angle = 45;
      }

      page.drawText(options.text, {
        x,
        y,
        size: options.fontSize,
        font: helveticaFont,
        color: rgb(r, g, b),
        opacity: options.opacity,
        rotate: degrees(angle),
      });
    }

    // 2. Page Numbers
    if (options.includePageNumbers) {
      const pageStr =
        options.pageNumberFormat === 'page-of-total'
          ? `Page ${i + 1} of ${totalPages}`
          : `${i + 1}`;
      const numSize = 10;
      const numWidth = helveticaFont.widthOfTextAtSize(pageStr, numSize);

      let nx = width / 2 - numWidth / 2;
      let ny = 20;

      if (options.pageNumberPosition === 'bottom-right') {
        nx = width - numWidth - 30;
        ny = 20;
      } else if (options.pageNumberPosition === 'top-right') {
        nx = width - numWidth - 30;
        ny = height - 25;
      }

      page.drawText(pageStr, {
        x: nx,
        y: ny,
        size: numSize,
        font: helveticaFont,
        color: rgb(0.2, 0.2, 0.2),
        opacity: 0.85,
      });
    }
  }

  return await doc.save();
}

/* =========================================================================
   9. SIGN / STAMP PDF (NEW FEATURE)
   ========================================================================= */
export async function applySignatureToPdf(
  ab: ArrayBuffer,
  signatureDataUrl: string,
  pageNum: number = 1,
  coordXPercent: number = 50,
  coordYPercent: number = 20,
  widthRatio: number = 0.25
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(ab);
  const pageIdx = Math.max(0, Math.min(pageNum - 1, doc.getPageCount() - 1));
  const page = doc.getPage(pageIdx);
  const { width, height } = page.getSize();

  const pngBytes = await (await fetch(signatureDataUrl)).arrayBuffer();
  const signatureImage = await doc.embedPng(pngBytes);

  const sigWidth = width * widthRatio;
  const sigHeight = sigWidth * (signatureImage.height / signatureImage.width);

  const x = (width * coordXPercent) / 100 - sigWidth / 2;
  const y = (height * coordYPercent) / 100 - sigHeight / 2;

  page.drawImage(signatureImage, {
    x: Math.max(0, Math.min(x, width - sigWidth)),
    y: Math.max(0, Math.min(y, height - sigHeight)),
    width: sigWidth,
    height: sigHeight,
  });

  return await doc.save();
}
