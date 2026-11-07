import React, { useState } from 'react';
import { Download, RotateCcw, Layers, Scissors, Check, CheckCircle2, GripVertical, Trash2 } from 'lucide-react';
import JSZip from 'jszip';
import { DropZone } from '../DropZone';
import { useHaptic } from '../../hooks/useHaptic';
import {
  mergeMultiplePdfs,
  splitPdfPages,
  getPdfInfo,
  renderPdfPageToDataUrl,
  downloadPdfBytes,
  downloadBlob,
  formatBytes,
  parsePageRanges,
  formatPageRangeString,
} from '../../utils/pdfEngine';
import type { FileItem } from '../../types';

interface SplitPageItem {
  pageNum: number;
  dataUrl: string;
  selected: boolean;
}

export const MergeSplitTool: React.FC = () => {
  const [operationMode, setOperationMode] = useState<'merge' | 'split'>('merge');

  // Merge state
  const [mergeFiles, setMergeFiles] = useState<FileItem[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Split state
  const [splitFile, setSplitFile] = useState<FileItem | null>(null);
  const [splitPages, setSplitPages] = useState<SplitPageItem[]>([]);
  const [splitRangeInput, setSplitRangeInput] = useState<string>('');
  const [mergeExtracted, setMergeExtracted] = useState<boolean>(true);
  const [isLoadingPages, setIsLoadingPages] = useState<boolean>(false);

  const { triggerHaptic, successHaptic } = useHaptic();

  // Handle files for Merge
  const handleMergeFiles = async (files: File[], isAppend: boolean) => {
    const valid = files.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (!valid.length) {
      alert('Please upload PDF files to merge.');
      return;
    }

    const items: FileItem[] = [];
    for (const f of valid) {
      const ab = await f.arrayBuffer();
      const info = await getPdfInfo(ab);
      items.push({
        id: Math.random().toString(),
        file: f,
        name: f.name,
        size: f.size,
        arrayBuffer: ab,
        pageCount: info.numPages,
      });
    }

    setMergeFiles((prev) => (isAppend ? [...prev, ...items] : items));
  };

  // Handle file for Split
  const handleSplitFile = async (files: File[]) => {
    const valid = files.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (!valid.length) {
      alert('Please select a PDF file to split.');
      return;
    }

    const f = valid[0];
    try {
      setIsLoadingPages(true);
      const ab = await f.arrayBuffer();
      const { doc, numPages } = await getPdfInfo(ab);

      const pagesList: SplitPageItem[] = [];
      const allNums: number[] = [];
      for (let i = 1; i <= numPages; i++) {
        const { dataUrl } = await renderPdfPageToDataUrl(doc, i, 0.45);
        pagesList.push({
          pageNum: i,
          dataUrl,
          selected: true, // Selected by default
        });
        allNums.push(i);
      }

      setSplitPages(pagesList);
      setSplitRangeInput(formatPageRangeString(allNums));
      setSplitFile({
        id: Math.random().toString(),
        file: f,
        name: f.name,
        size: f.size,
        arrayBuffer: ab,
        pageCount: numPages,
      });
    } catch (err: any) {
      alert('Error loading PDF: ' + err.message);
    } finally {
      setIsLoadingPages(false);
    }
  };

  // Drag reorder in merge list
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
    triggerHaptic(10);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    setMergeFiles((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(draggedIdx, 1);
      updated.splice(idx, 0, moved);
      return updated;
    });
    setDraggedIdx(idx);
  };

  const handleRemoveMergeFile = (idx: number) => {
    setMergeFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Toggle page selection in split mode
  const toggleSplitPage = (idx: number) => {
    triggerHaptic(10);
    setSplitPages((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        selected: !updated[idx].selected,
      };
      const selectedNums = updated.filter((p) => p.selected).map((p) => p.pageNum);
      setSplitRangeInput(formatPageRangeString(selectedNums));
      return updated;
    });
  };

  const handleSplitRangeChange = (val: string) => {
    setSplitRangeInput(val);
    if (!splitFile?.pageCount) return;

    const parsed = new Set(parsePageRanges(val, splitFile.pageCount));
    setSplitPages((prev) =>
      prev.map((p) => ({
        ...p,
        selected: parsed.has(p.pageNum),
      }))
    );
  };

  // Execute Merge
  const handleExecuteMerge = async () => {
    if (mergeFiles.length < 2) {
      alert('Please select at least 2 PDF files to merge.');
      return;
    }
    triggerHaptic(20);

    try {
      const buffers = mergeFiles.map((f) => f.arrayBuffer!);
      const mergedBytes = await mergeMultiplePdfs(buffers);
      successHaptic();
      downloadPdfBytes(mergedBytes, 'PDFMaster_Merged.pdf');
    } catch (err: any) {
      alert('Error merging PDFs: ' + err.message);
    }
  };

  // Execute Split
  const handleExecuteSplit = async () => {
    if (!splitFile?.arrayBuffer) return;
    const selected = splitPages.filter((p) => p.selected).map((p) => p.pageNum);
    if (!selected.length) {
      alert('Please select at least 1 page to extract.');
      return;
    }

    triggerHaptic(20);

    try {
      const { singlePdf, parts } = await splitPdfPages(
        splitFile.arrayBuffer,
        selected,
        mergeExtracted
      );

      successHaptic();
      if (singlePdf) {
        const defaultName = splitFile.name.replace(/\.pdf$/i, '') + '_extracted.pdf';
        downloadPdfBytes(singlePdf, defaultName);
      } else if (parts) {
        if (parts.length === 1) {
          downloadPdfBytes(parts[0].bytes, `${splitFile.name.replace(/\.pdf$/i, '')}_p${parts[0].pageNum}.pdf`);
        } else {
          const zip = new JSZip();
          parts.forEach((p) => {
            zip.file(`page_${p.pageNum}.pdf`, p.bytes);
          });
          const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
          downloadBlob(blob, `${splitFile.name.replace(/\.pdf$/i, '')}_split_pages.zip`);
        }
      }
    } catch (err: any) {
      alert('Error splitting PDF: ' + err.message);
    }
  };

  const handleReset = () => {
    triggerHaptic(15);
    setMergeFiles([]);
    setSplitFile(null);
    setSplitPages([]);
    setSplitRangeInput('');
  };

  const totalMergePages = mergeFiles.reduce((acc, f) => acc + (f.pageCount || 0), 0);
  const totalMergeSize = mergeFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="space-y-6">
      {/* Operation Switch */}
      <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1.5 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            setOperationMode('merge');
          }}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
            operationMode === 'merge'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Merge Multiple PDFs</span>
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            setOperationMode('split');
          }}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
            operationMode === 'split'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>Split PDF Pages</span>
        </button>
      </div>

      {operationMode === 'merge' ? (
        /* ===================== MERGE ===================== */
        <div className="space-y-6">
          <DropZone
            accept="application/pdf"
            multiple={true}
            fileItems={mergeFiles}
            onFilesSelected={handleMergeFiles}
            onRemoveFile={handleRemoveMergeFile}
            title="Upload 2 or More PDFs to Merge"
            subtitle="Combine documents into a single organized file. Drag items to reorder priority."
          />

          {mergeFiles.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-500" />
                    File Sequence Order
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {mergeFiles.length} documents • Total {totalMergePages} pages • {formatBytes(totalMergeSize)}
                  </p>
                </div>
              </div>

              {/* Sortable List of Files */}
              <div className="space-y-2">
                {mergeFiles.map((file, idx) => (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={() => setDraggedIdx(null)}
                    className={`flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 hover:border-blue-400 transition cursor-grab active:cursor-grabbing ${
                      draggedIdx === idx ? 'opacity-40 scale-98 ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-extrabold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <p className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {file.pageCount ? `${file.pageCount} pages • ` : ''}
                          {formatBytes(file.size)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveMergeFile(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                      title="Remove from merge list"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={mergeFiles.length < 2}
                  onClick={handleExecuteMerge}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white shadow-md active:scale-95 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Merge & Download Combined PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-3 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition active:scale-95"
                >
                  <RotateCcw className="w-4 h-4 inline mr-1" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ===================== SPLIT ===================== */
        <div className="space-y-6">
          <DropZone
            accept="application/pdf"
            multiple={false}
            fileItems={splitFile ? [splitFile] : []}
            onFilesSelected={handleSplitFile}
            onRemoveFile={handleReset}
            title="Upload PDF to Split & Extract"
            subtitle="Pick specific pages or enter ranges to extract into a new document or separate pages."
          />

          {splitFile && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-blue-500" />
                  Select Pages to Extract
                </h3>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {splitPages.filter((p) => p.selected).length} of {splitPages.length} Pages Selected
                </span>
              </div>

              {/* Range text input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Selected Pages (e.g. <span className="font-mono text-blue-600">1-3, 5</span>)
                </label>
                <input
                  type="text"
                  value={splitRangeInput}
                  onChange={(e) => handleSplitRangeChange(e.target.value)}
                  placeholder="e.g. 1-3, 5"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Merge option checkbox */}
              <button
                type="button"
                onClick={() => setMergeExtracted(!mergeExtracted)}
                className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-between font-semibold text-xs sm:text-sm transition ${
                  mergeExtracted
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                    : 'border-slate-300 dark:border-slate-700 text-slate-500'
                }`}
              >
                <span>Merge extracted pages into one single PDF</span>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center ${
                    mergeExtracted ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  {mergeExtracted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </button>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={!splitPages.some((p) => p.selected)}
                  onClick={handleExecuteSplit}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white shadow-md active:scale-95 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    Download {mergeExtracted ? 'Single Extracted PDF' : 'Separate Pages (.ZIP)'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-3 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition active:scale-95"
                >
                  <RotateCcw className="w-4 h-4 inline mr-1" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Pages Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                {splitPages.map((p, idx) => (
                  <div
                    key={p.pageNum}
                    onClick={() => toggleSplitPage(idx)}
                    className={`relative rounded-xl border-2 transition-all p-2 bg-white dark:bg-slate-950 cursor-pointer select-none shadow-xs ${
                      p.selected
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-emerald-500/10'
                        : 'border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="relative aspect-[3/4] bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
                      <img src={p.dataUrl} alt={`Page ${p.pageNum}`} className="w-full h-full object-contain pointer-events-none" />

                      {/* Green Check Badge */}
                      {p.selected && (
                        <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="mt-2 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                      Page {p.pageNum}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
