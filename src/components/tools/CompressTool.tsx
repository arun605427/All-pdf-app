import React, { useState } from 'react';
import { Download, RotateCcw, Sparkles, FileArchive, CheckCircle2, ArrowRight, Loader2, X } from 'lucide-react';
import JSZip from 'jszip';
import { DropZone } from '../DropZone';
import { useHaptic } from '../../hooks/useHaptic';
import {
  compressPdfFile,
  renderPdfPageToDataUrl,
  downloadPdfBytes,
  downloadBlob,
  formatBytes,
} from '../../utils/pdfEngine';
import type { FileItem, CompressionPreset } from '../../types';

interface CompressedResult {
  fileItem: FileItem;
  bytes: Uint8Array;
  originalSize: number;
  newSize: number;
  thumbnail: string;
  isOptimizedOnly: boolean;
}

export const CompressTool: React.FC = () => {
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [preset, setPreset] = useState<CompressionPreset>('0.6');
  const [targetKb, setTargetKb] = useState<number>(500);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [progressPct, setProgressPct] = useState<number>(0);
  const [results, setResults] = useState<CompressedResult[]>([]);

  const { triggerHaptic, successHaptic } = useHaptic();

  const handleFilesSelected = async (newFiles: File[], isAppend: boolean) => {
    const validPdfs = newFiles.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (!validPdfs.length) {
      alert('Please upload valid PDF files.');
      return;
    }

    const items: FileItem[] = [];
    for (const f of validPdfs) {
      items.push({
        id: Math.random().toString(),
        file: f,
        name: f.name,
        size: f.size,
        arrayBuffer: await f.arrayBuffer(),
      });
    }

    setFileItems((prev) => (isAppend ? [...prev, ...items] : items));
    setResults([]);
  };

  const handleRemoveFile = (index: number) => {
    setFileItems((prev) => prev.filter((_, i) => i !== index));
    setResults((prev) => prev.filter((_, i) => i !== index));
  };

  const runCompression = async () => {
    if (!fileItems.length) return;
    setIsProcessing(true);
    setProgressPct(0);
    setProgressText('Preparing compression...');
    triggerHaptic(20);

    const compressedResults: CompressedResult[] = [];
    const isTargetMode = preset === 'target';
    const qualityOrTarget = isTargetMode ? targetKb : parseFloat(preset);

    for (let i = 0; i < fileItems.length; i++) {
      const item = fileItems[i];
      setProgressText(`Processing ${i + 1}/${fileItems.length}: ${item.name}`);

      try {
        const { bytes, originalSize, newSize, skipped } = await compressPdfFile(
          item.arrayBuffer!,
          qualityOrTarget,
          isTargetMode,
          (pagePct, status) => {
            const overall = Math.round(((i + pagePct / 100) / fileItems.length) * 100);
            setProgressPct(overall);
            setProgressText(`[${i + 1}/${fileItems.length}] ${status}`);
          }
        );

        // Generate thumbnail of first page
        const { dataUrl } = await renderPdfPageToDataUrl(bytes, 1, 0.4);

        compressedResults.push({
          fileItem: item,
          bytes,
          originalSize,
          newSize,
          thumbnail: dataUrl,
          isOptimizedOnly: !!skipped,
        });
      } catch (err: any) {
        console.error('Error compressing item:', err);
      }
    }

    setResults(compressedResults);
    setIsProcessing(false);
    setProgressText('');
    setProgressPct(100);
    successHaptic();
  };

  const handleDownload = async () => {
    if (!results.length) return;
    triggerHaptic(20);

    if (results.length === 1) {
      const res = results[0];
      const defaultName = res.fileItem.name.replace(/\.pdf$/i, '') + '_compressed.pdf';
      downloadPdfBytes(res.bytes, defaultName);
    } else {
      const zip = new JSZip();
      results.forEach((res) => {
        const name = res.fileItem.name.replace(/\.pdf$/i, '') + '_compressed.pdf';
        zip.file(name, res.bytes);
      });
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      downloadBlob(blob, 'PDFMaster_Compressed_PDFs.zip');
    }
  };

  const handleReset = () => {
    triggerHaptic(15);
    setFileItems([]);
    setResults([]);
    setProgressText('');
    setProgressPct(0);
  };

  const totalOriginal = results.reduce((acc, r) => acc + r.originalSize, 0);
  const totalNew = results.reduce((acc, r) => acc + r.newSize, 0);
  const totalSavedPct = totalOriginal > 0 ? (((totalOriginal - totalNew) / totalOriginal) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <DropZone
        accept="application/pdf"
        multiple={true}
        fileItems={fileItems}
        onFilesSelected={handleFilesSelected}
        onRemoveFile={handleRemoveFile}
        title="Upload PDF(s) to Compress"
        subtitle="Shrink PDF file size with extreme fidelity. Choose presets or an exact target size (KB)."
      />

      {/* Preset and Options Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          Compression Settings
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs sm:text-sm">
          {/* Preset Selector */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300">Compression Preset</label>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as CompressionPreset)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0.9">High Quality (Light Compression)</option>
              <option value="0.6">Balanced (Recommended Default)</option>
              <option value="0.3">Maximum Compression (Smallest Size)</option>
              <option value="target">Exact Target File Size...</option>
            </select>
          </div>

          {/* Target Size Input if preset === 'target' */}
          {preset === 'target' && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <label className="font-bold text-slate-700 dark:text-slate-300">Target File Size (KB)</label>
              <input
                type="number"
                min="50"
                step="50"
                value={targetKb}
                onChange={(e) => setTargetKb(Math.max(20, parseInt(e.target.value, 10) || 500))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 500"
              />
            </div>
          )}
        </div>

        {/* Progress Bar when running */}
        {isProcessing && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-300">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {progressText || 'Compressing documents...'}
              </span>
              <span>{progressPct}%</span>
            </div>
            <div className="w-full h-2 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-300 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {results.length === 0 ? (
            <button
              type="button"
              disabled={!fileItems.length || isProcessing}
              onClick={runCompression}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white shadow-md active:scale-95 transition"
            >
              <FileArchive className="w-4 h-4" />
              <span>Compress {fileItems.length > 0 ? `(${fileItems.length} Files)` : ''}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md active:scale-95 transition"
            >
              <Download className="w-4 h-4" />
              <span>Download {results.length === 1 ? 'Compressed PDF' : 'All PDFs (.ZIP)'}</span>
            </button>
          )}

          <button
            type="button"
            disabled={!fileItems.length}
            onClick={handleReset}
            className="px-4 py-3 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4 inline mr-1" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Results & Comparison Grid */}
      {results.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Compression Completed
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reduced total size from {formatBytes(totalOriginal)} to {formatBytes(totalNew)}
              </p>
            </div>
            {Number(totalSavedPct) > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Saved {totalSavedPct}% Space
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {results.map((res, idx) => {
              const diffPct = (((res.originalSize - res.newSize) / res.originalSize) * 100).toFixed(1);
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 flex flex-col justify-between shadow-xs"
                >
                  <div className="aspect-[4/3] bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex items-center justify-center p-2 mb-3">
                    <img src={res.thumbnail} alt={res.fileItem.name} className="h-full object-contain rounded" />
                  </div>

                  <div className="space-y-1">
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate" title={res.fileItem.name}>
                      {res.fileItem.name}
                    </h5>

                    {res.isOptimizedOnly ? (
                      <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        ✓ Already optimal size (no loss applied)
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="text-slate-400 line-through">{formatBytes(res.originalSize)}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="text-blue-600 dark:text-blue-400 font-bold">{formatBytes(res.newSize)}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px]">
                          (-{diffPct}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
