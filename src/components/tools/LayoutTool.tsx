import React, { useState, useEffect } from 'react';
import { Download, RotateCcw, ChevronRight, ChevronDown, Eye, Loader2, Sparkles, Check } from 'lucide-react';
import { DropZone } from '../DropZone';
import { useHaptic } from '../../hooks/useHaptic';
import {
  applyLayoutPdf,
  renderPdfPageToDataUrl,
  downloadPdfBytes,
  getPdfInfo,
} from '../../utils/pdfEngine';
import type { FileItem, LayoutOptions, PaperSize } from '../../types';

export const LayoutTool: React.FC = () => {
  const [fileItem, setFileItem] = useState<FileItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewPages, setPreviewPages] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [processedBytes, setProcessedBytes] = useState<Uint8Array | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [options, setOptions] = useState<LayoutOptions>({
    pagesPerSheet: 4,
    pageSize: 'A4',
    readingDirection: 'ltr',
    orientation: 'automatic',
    outerMarginMm: 5,
    innerMarginMm: 2,
    hasBorder: true,
    customWidth: 210,
    customHeight: 297,
    customUnit: 'mm',
  });

  const { triggerHaptic, successHaptic } = useHaptic();

  // Handle uploaded PDF
  const handleFilesSelected = async (files: File[]) => {
    if (!files.length) return;
    const file = files[0];
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please select a valid PDF file.');
      return;
    }

    try {
      setPreviewLoading(true);
      const ab = await file.arrayBuffer();
      const info = await getPdfInfo(ab);
      const item: FileItem = {
        id: Math.random().toString(),
        file,
        name: file.name,
        size: file.size,
        arrayBuffer: ab,
        pageCount: info.numPages,
      };
      setFileItem(item);
    } catch (err: any) {
      alert('Error opening PDF: ' + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Generate preview when file or options change
  useEffect(() => {
    if (!fileItem?.arrayBuffer) {
      setPreviewPages([]);
      setProcessedBytes(null);
      return;
    }

    let isMounted = true;
    const debounceTimer = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const bytes = await applyLayoutPdf(fileItem.arrayBuffer!, options);
        if (!isMounted) return;
        setProcessedBytes(bytes);

        // Render preview sheets (up to first 4 sheets for performance on Android)
        const info = await getPdfInfo(bytes);
        const maxToRender = Math.min(info.numPages, 4);
        const rendered: string[] = [];

        for (let i = 1; i <= maxToRender; i++) {
          const { dataUrl } = await renderPdfPageToDataUrl(info.doc, i, 0.7);
          rendered.push(dataUrl);
        }

        if (isMounted) {
          setPreviewPages(rendered);
        }
      } catch (err: any) {
        console.error('Layout generation error:', err);
      } finally {
        if (isMounted) setPreviewLoading(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [fileItem, options]);

  const handleDownload = () => {
    if (!processedBytes || !fileItem) return;
    triggerHaptic(20);
    successHaptic();
    const defaultName = fileItem.name.replace(/\.pdf$/i, '') + '_layout.pdf';
    downloadPdfBytes(processedBytes, defaultName);
  };

  const handleReset = () => {
    triggerHaptic(15);
    setFileItem(null);
    setPreviewPages([]);
    setProcessedBytes(null);
    setOptions({
      pagesPerSheet: 4,
      pageSize: 'A4',
      readingDirection: 'ltr',
      orientation: 'automatic',
      outerMarginMm: 5,
      innerMarginMm: 2,
      hasBorder: true,
      customWidth: 210,
      customHeight: 297,
      customUnit: 'mm',
    });
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <DropZone
        accept="application/pdf"
        multiple={false}
        fileItems={fileItem ? [fileItem] : []}
        onFilesSelected={handleFilesSelected}
        onRemoveFile={handleReset}
        title="Upload PDF for Layout (N-Up)"
        subtitle="Combine 2, 4, 6 or up to 15 pages onto a single sheet for printing or compact view."
      />

      {/* Configuration Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          Layout Configuration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm">
          {/* Pages per sheet */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300">Pages per Sheet</label>
            <select
              value={options.pagesPerSheet}
              onChange={(e) => setOptions({ ...options, pagesPerSheet: parseInt(e.target.value, 10) })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {[2, 3, 4, 6, 8, 9, 10, 12, 15].map((num) => (
                <option key={num} value={num}>
                  {num} Pages
                </option>
              ))}
            </select>
          </div>

          {/* Paper Size */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300">Output Paper Size</label>
            <select
              value={options.pageSize}
              onChange={(e) => setOptions({ ...options, pageSize: e.target.value as PaperSize })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="A4">A4 (Standard 210 × 297 mm)</option>
              <option value="Original">Original Document Size</option>
              <option value="Letter">US Letter (8.5 × 11 in)</option>
              <option value="Legal">Legal</option>
              <option value="A3">A3 (Large)</option>
              <option value="A5">A5 (Compact)</option>
              <option value="Custom">Custom Dimensions...</option>
            </select>
          </div>

          {/* Border Toggle */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300">Page Borders</label>
            <button
              type="button"
              onClick={() => setOptions({ ...options, hasBorder: !options.hasBorder })}
              className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-between font-semibold transition ${
                options.hasBorder
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  : 'border-slate-300 dark:border-slate-700 text-slate-500'
              }`}
            >
              <span>Draw Border Line</span>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center ${
                  options.hasBorder ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                {options.hasBorder && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </button>
          </div>

          {/* Orientation */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300">Orientation</label>
            <select
              value={options.orientation}
              onChange={(e) =>
                setOptions({ ...options, orientation: e.target.value as 'automatic' | 'portrait' | 'landscape' })
              }
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="automatic">Auto Smart Fit</option>
              <option value="portrait">Portrait (Vertical)</option>
              <option value="landscape">Landscape (Horizontal)</option>
            </select>
          </div>
        </div>

        {/* Custom Size Row if Custom Selected */}
        {options.pageSize === 'Custom' && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Width</label>
              <input
                type="number"
                min="1"
                value={options.customWidth}
                onChange={(e) => setOptions({ ...options, customWidth: parseFloat(e.target.value) || 210 })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-bold text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Height</label>
              <input
                type="number"
                min="1"
                value={options.customHeight}
                onChange={(e) => setOptions({ ...options, customHeight: parseFloat(e.target.value) || 297 })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-bold text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Unit</label>
              <select
                value={options.customUnit}
                onChange={(e) => setOptions({ ...options, customUnit: e.target.value as any })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-bold text-xs"
              >
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="inch">inch</option>
              </select>
            </div>
          </div>
        )}

        {/* Advanced Accordion */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span>Advanced Settings (Reading Direction & Margins)</span>
          </button>

          {showAdvanced && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Reading Order</label>
                <select
                  value={options.readingDirection}
                  onChange={(e) => setOptions({ ...options, readingDirection: e.target.value as any })}
                  className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <option value="ltr">Left → Right (Standard)</option>
                  <option value="rtl">Right → Left</option>
                  <option value="ttb">Top → Bottom</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Outer Margin (mm)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={options.outerMarginMm}
                  onChange={(e) => setOptions({ ...options, outerMarginMm: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Inner Spacing (mm)</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={options.innerMarginMm}
                  onChange={(e) => setOptions({ ...options, innerMarginMm: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            disabled={!processedBytes || isProcessing || previewLoading}
            onClick={handleDownload}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white shadow-md active:scale-95 transition"
          >
            {previewLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Preparing Layout...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Layout PDF</span>
              </>
            )}
          </button>
          <button
            type="button"
            disabled={!fileItem}
            onClick={handleReset}
            className="px-4 py-3 rounded-xl font-bold text-sm bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900 disabled:opacity-50 transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4 inline mr-1" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Live Preview Area */}
      {fileItem && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" />
              Live Output Preview
            </h4>
            {previewLoading && (
              <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating preview...
              </span>
            )}
          </div>

          {previewPages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {previewPages.map((url, idx) => (
                <div
                  key={idx}
                  className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shadow-xs p-2 text-center"
                >
                  <img src={url} alt={`Sheet ${idx + 1}`} className="w-full h-auto rounded-lg shadow-sm border" />
                  <p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-400">Sheet {idx + 1}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-slate-400">
              Generating layout preview...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
