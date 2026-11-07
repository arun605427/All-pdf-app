import React, { useState, useEffect } from 'react';
import { Download, RotateCcw, RotateCw, Trash2, CheckCircle2, GripVertical, AlertTriangle } from 'lucide-react';
import { DropZone } from '../DropZone';
import { useHaptic } from '../../hooks/useHaptic';
import {
  getPdfInfo,
  renderPdfPageToDataUrl,
  removeAndReorderPdfPages,
  parsePageRanges,
  formatPageRangeString,
  downloadPdfBytes,
} from '../../utils/pdfEngine';
import type { FileItem } from '../../types';

interface PageThumbnail {
  pageNum: number;
  dataUrl: string;
  isMarkedForRemoval: boolean;
  rotation: number;
}

export const RemovePagesTool: React.FC = () => {
  const [fileItem, setFileItem] = useState<FileItem | null>(null);
  const [pages, setPages] = useState<PageThumbnail[]>([]);
  const [rangeInput, setRangeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const { triggerHaptic, successHaptic } = useHaptic();

  // Load PDF pages and render thumbnails
  const handleFilesSelected = async (files: File[]) => {
    if (!files.length) return;
    const file = files[0];
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please select a valid PDF file.');
      return;
    }

    try {
      setIsLoading(true);
      const ab = await file.arrayBuffer();
      const { doc, numPages } = await getPdfInfo(ab);

      const loadedPages: PageThumbnail[] = [];
      for (let i = 1; i <= numPages; i++) {
        const { dataUrl } = await renderPdfPageToDataUrl(doc, i, 0.45);
        loadedPages.push({
          pageNum: i,
          dataUrl,
          isMarkedForRemoval: false,
          rotation: 0,
        });
      }

      setPages(loadedPages);
      setRangeInput('');
      setFileItem({
        id: Math.random().toString(),
        file,
        name: file.name,
        size: file.size,
        arrayBuffer: ab,
        pageCount: numPages,
      });
    } catch (err: any) {
      alert('Error loading PDF: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle single page removal state
  const togglePageRemoval = (index: number) => {
    triggerHaptic(12);
    setPages((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        isMarkedForRemoval: !updated[index].isMarkedForRemoval,
      };

      // Sync range text input
      const removedNumbers = updated
        .filter((p) => p.isMarkedForRemoval)
        .map((p) => p.pageNum);
      setRangeInput(formatPageRangeString(removedNumbers));
      return updated;
    });
  };

  // Sync text input into thumbnails state
  const handleRangeInputChange = (val: string) => {
    setRangeInput(val);
    if (!fileItem?.pageCount) return;

    const parsedRemoved = new Set(parsePageRanges(val, fileItem.pageCount));
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        isMarkedForRemoval: parsedRemoved.has(p.pageNum),
      }))
    );
  };

  // Rotate single page 90 degrees
  const rotatePage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(10);
    setPages((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        rotation: (updated[index].rotation + 90) % 360,
      };
      return updated;
    });
  };

  // Drag and drop reordering
  const handleDragStart = (index: number) => {
    setDraggedIdx(index);
    triggerHaptic(10);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    setPages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(draggedIdx, 1);
      updated.splice(index, 0, moved);
      return updated;
    });
    setDraggedIdx(index);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  // Process & Download
  const handleProcessDownload = async () => {
    if (!fileItem?.arrayBuffer || pages.length === 0) return;

    const pagesToKeep = pages.filter((p) => !p.isMarkedForRemoval);
    if (pagesToKeep.length === 0) {
      alert('You cannot remove all pages. At least 1 page must remain.');
      return;
    }

    try {
      setIsLoading(true);
      triggerHaptic(20);

      const pageOrder = pagesToKeep.map((p) => p.pageNum);
      const rotations: Record<number, number> = {};
      pagesToKeep.forEach((p) => {
        if (p.rotation !== 0) rotations[p.pageNum] = p.rotation;
      });

      const resultBytes = await removeAndReorderPdfPages(fileItem.arrayBuffer, pageOrder, rotations);
      successHaptic();
      const defaultName = fileItem.name.replace(/\.pdf$/i, '') + '_modified.pdf';
      downloadPdfBytes(resultBytes, defaultName);
    } catch (err: any) {
      alert('Error processing PDF: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    triggerHaptic(15);
    setFileItem(null);
    setPages([]);
    setRangeInput('');
  };

  const keptCount = pages.filter((p) => !p.isMarkedForRemoval).length;
  const removedCount = pages.length - keptCount;

  return (
    <div className="space-y-6">
      <DropZone
        accept="application/pdf"
        multiple={false}
        fileItems={fileItem ? [fileItem] : []}
        onFilesSelected={handleFilesSelected}
        onRemoveFile={handleReset}
        title="Upload PDF to Remove & Reorder Pages"
        subtitle="Tap pages to remove them, drag to change page sequence, or rotate."
      />

      {fileItem && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100">
                Organize Document Pages
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tap any page to delete/keep it. Drag cards to reorder.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Keeping {keptCount} pages
              </span>
              {removedCount > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  Removing {removedCount}
                </span>
              )}
            </div>
          </div>

          {/* Quick Range Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Pages to remove (type numbers e.g. <span className="font-mono text-blue-600">2, 4-6, 8</span>)
            </label>
            <input
              type="text"
              value={rangeInput}
              onChange={(e) => handleRangeInputChange(e.target.value)}
              placeholder="e.g. 2, 4-6, 8"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={keptCount === 0 || isLoading}
              onClick={handleProcessDownload}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white shadow-md active:scale-95 transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Cleaned PDF ({keptCount} Pages)</span>
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

          {/* Page Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            {pages.map((p, idx) => (
              <div
                key={p.pageNum}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                onClick={() => togglePageRemoval(idx)}
                className={`group relative rounded-xl border-2 transition-all p-2 bg-white dark:bg-slate-950 cursor-pointer select-none shadow-xs ${
                  p.isMarkedForRemoval
                    ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 opacity-75'
                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-400'
                } ${draggedIdx === idx ? 'scale-95 opacity-50 ring-2 ring-blue-500' : ''}`}
              >
                {/* Thumbnail Image */}
                <div className="relative aspect-[3/4] bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={p.dataUrl}
                    alt={`Page ${p.pageNum}`}
                    style={{
                      transform: `rotate(${p.rotation}deg)`,
                      transition: 'transform 0.2s',
                    }}
                    className="w-full h-full object-contain pointer-events-none"
                  />

                  {/* Crossed out overlay if marked */}
                  {p.isMarkedForRemoval && (
                    <div className="absolute inset-0 bg-rose-600/25 flex items-center justify-center backdrop-blur-[0.5px]">
                      <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg">
                        <Trash2 className="w-5 h-5 stroke-[2.5]" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer bar */}
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <GripVertical className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100" />
                    P.{p.pageNum}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => rotatePage(idx, e)}
                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 transition"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
