import React, { useRef, useState } from 'react';
import { UploadCloud, Plus, FileText, Image as ImageIcon, Camera, FolderOpen, X } from 'lucide-react';
import { useHaptic } from '../hooks/useHaptic';
import { formatBytes } from '../utils/pdfEngine';
import type { FileItem } from '../types';

interface DropZoneProps {
  accept: string;
  multiple?: boolean;
  fileItems: FileItem[];
  onFilesSelected: (files: File[], isAppend: boolean) => void;
  onRemoveFile?: (index: number) => void;
  title?: string;
  subtitle?: string;
  allowCamera?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  accept,
  multiple = false,
  fileItems,
  onFilesSelected,
  onRemoveFile,
  title,
  subtitle,
  allowCamera = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { triggerHaptic } = useHaptic();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    triggerHaptic(20);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesSelected(files, false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, isAppend: boolean) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      triggerHaptic(15);
      onFilesSelected(files, isAppend);
    }
    e.target.value = '';
  };

  const totalSize = fileItems.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="w-full mb-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFileInputChange(e, false)}
      />
      <input
        ref={addMoreInputRef}
        type="file"
        accept={accept}
        multiple={true}
        className="hidden"
        onChange={(e) => handleFileInputChange(e, true)}
      />
      {allowCamera && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileInputChange(e, true)}
        />
      )}

      {/* Drop area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all duration-200 select-none ${
          isDragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow-inner scale-[0.99]'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/70 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-sm'
        }`}
      >
        {/* Top right "Add More" button if multiple is allowed and items exist */}
        {multiple && fileItems.length > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            {allowCamera && (
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-xs hover:bg-emerald-100 transition"
                title="Capture with camera"
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Camera</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => addMoreInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-xs hover:bg-blue-100 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add More</span>
            </button>
          </div>
        )}

        <div className="flex flex-col items-center justify-center pointer-events-none">
          <div className="w-12 h-12 mb-3 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
            <UploadCloud className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h4 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            {title || (multiple ? 'Drag & Drop files here' : 'Drag & Drop your PDF here')}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm">
            {subtitle || 'Files are processed safely in your browser. 100% private.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25 active:scale-95 transition"
            >
              <FolderOpen className="w-4 h-4" />
              <span>{fileItems.length > 0 ? 'Replace File' : multiple ? 'Select Files' : 'Select PDF'}</span>
            </button>
            {allowCamera && fileItems.length === 0 && (
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition active:scale-95"
              >
                <Camera className="w-4 h-4 text-emerald-500" />
                <span>Camera</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Selected files summary badge */}
      {fileItems.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {fileItems.length === 1 ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800/80 shadow-xs max-w-full truncate">
              <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-xs">{fileItems[0].name}</span>
              <span className="text-slate-500 dark:text-slate-400 font-normal shrink-0">
                • {formatBytes(fileItems[0].size)}
                {fileItems[0].pageCount ? ` • ${fileItems[0].pageCount} pages` : ''}
              </span>
              {onRemoveFile && (
                <button
                  type="button"
                  onClick={() => onRemoveFile(0)}
                  className="ml-1 text-slate-400 hover:text-red-500 transition"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/80 shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span>{fileItems.length} files selected</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-normal">
                (Total: {formatBytes(totalSize)})
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
