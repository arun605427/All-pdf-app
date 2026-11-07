import React, { useState, useEffect } from 'react';
import {
  Download,
  RotateCcw,
  RotateCw,
  Crop,
  Layers,
  FileText,
  Image as ImageIcon,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
  GripVertical,
} from 'lucide-react';
import JSZip from 'jszip';
import { DropZone } from '../DropZone';
import { ImageCropperModal } from '../ImageCropperModal';
import { useHaptic } from '../../hooks/useHaptic';
import {
  convertJpgToPdf,
  convertPdfToJpg,
  downloadPdfBytes,
  downloadBlob,
  formatBytes,
} from '../../utils/pdfEngine';
import type { FileItem, JpgToPdfSettings } from '../../types';

interface ImageItem {
  id: string;
  name: string;
  size: number;
  dataUrl: string;
  rotation: number;
}

export const ConverterTool: React.FC = () => {
  const [conversionMode, setConversionMode] = useState<'jpg-to-pdf' | 'pdf-to-jpg'>('jpg-to-pdf');

  // JPG -> PDF state
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [jpgSettings, setJpgSettings] = useState<JpgToPdfSettings>({
    quality: 0.85,
    pageSize: 'a4-fixed',
    orientation: 'auto',
    margin: 0,
    customMargin: 20,
    customWidthMm: 210,
    customHeightMm: 297,
    mergeAll: true,
  });
  const [estimatedPdfSize, setEstimatedPdfSize] = useState<number | null>(null);
  const [showAdvancedJpg, setShowAdvancedJpg] = useState(false);
  const [cropperIndex, setCropperIndex] = useState<number | null>(null);
  const [draggedImgIdx, setDraggedImgIdx] = useState<number | null>(null);

  // PDF -> JPG state
  const [pdfFile, setPdfFile] = useState<FileItem | null>(null);
  const [pdfToJpgQuality, setPdfToJpgQuality] = useState<'normal' | 'high'>('normal');
  const [isProcessingPdfToJpg, setIsProcessingPdfToJpg] = useState(false);
  const [pdfToJpgProgress, setPdfToJpgProgress] = useState<{ done: number; total: number; pct: number }>({
    done: 0,
    total: 0,
    pct: 0,
  });

  const { triggerHaptic, successHaptic } = useHaptic();

  // Load JPG / image files
  const handleImagesSelected = async (files: File[], isAppend: boolean) => {
    const validImages = files.filter(
      (f) =>
        f.type.startsWith('image/') ||
        /\.(jpe?g|png|webp|bmp|gif|avif|heic)$/i.test(f.name)
    );
    if (!validImages.length) {
      alert('Please upload image files.');
      return;
    }

    const newItems: ImageItem[] = [];
    for (const f of validImages) {
      const dataUrl = await readFileAsDataUrl(f);
      newItems.push({
        id: Math.random().toString(),
        name: f.name,
        size: f.size,
        dataUrl,
        rotation: 0,
      });
    }

    setImageItems((prev) => (isAppend ? [...prev, ...newItems] : newItems));
  };

  // Load PDF file for PDF -> JPG
  const handlePdfSelected = async (files: File[]) => {
    const valid = files.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (!valid.length) {
      alert('Please select a PDF file.');
      return;
    }
    const f = valid[0];
    setPdfFile({
      id: Math.random().toString(),
      file: f,
      name: f.name,
      size: f.size,
      arrayBuffer: await f.arrayBuffer(),
    });
  };

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  }

  // Calculate estimated PDF size for JPG -> PDF
  useEffect(() => {
    if (conversionMode !== 'jpg-to-pdf' || imageItems.length === 0) {
      setEstimatedPdfSize(null);
      return;
    }
    const qMultiplier = jpgSettings.quality === 1.0 ? 0.95 : jpgSettings.quality === 0.85 ? 0.65 : 0.45;
    const est = imageItems.reduce((acc, img) => acc + img.size * qMultiplier, 1024);
    setEstimatedPdfSize(Math.round(est));
  }, [conversionMode, imageItems, jpgSettings.quality]);

  // Rotate single image 90 degrees
  const handleRotateImage = (index: number) => {
    triggerHaptic(10);
    setImageItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const nextAngle = (item.rotation + 90) % 360;

      // Rotate on canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = nextAngle % 180 === 90 ? img.height : img.width;
        canvas.height = nextAngle % 180 === 90 ? img.width : img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((nextAngle * Math.PI) / 180);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          item.dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          item.rotation = nextAngle;
          setImageItems([...updated]);
        }
      };
      img.src = item.dataUrl;
      return updated;
    });
  };

  const handleApplyCroppedImage = (croppedUrl: string) => {
    if (cropperIndex === null) return;
    setImageItems((prev) => {
      const updated = [...prev];
      updated[cropperIndex] = {
        ...updated[cropperIndex],
        dataUrl: croppedUrl,
      };
      return updated;
    });
    setCropperIndex(null);
  };

  const handleRemoveImage = (index: number) => {
    setImageItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Reordering
  const handleDragStart = (index: number) => {
    setDraggedImgIdx(index);
    triggerHaptic(10);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedImgIdx === null || draggedImgIdx === index) return;
    setImageItems((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(draggedImgIdx, 1);
      updated.splice(index, 0, moved);
      return updated;
    });
    setDraggedImgIdx(index);
  };

  // Convert JPG -> PDF
  const handleConvertJpgToPdf = async () => {
    if (!imageItems.length) return;
    triggerHaptic(20);

    try {
      const urls = imageItems.map((img) => img.dataUrl);

      if (jpgSettings.mergeAll) {
        const bytes = await convertJpgToPdf(urls, jpgSettings);
        successHaptic();
        downloadPdfBytes(bytes, 'PDFMaster_Images.pdf');
      } else {
        const zip = new JSZip();
        for (let i = 0; i < urls.length; i++) {
          const singleBytes = await convertJpgToPdf([urls[i]], jpgSettings);
          const baseName = imageItems[i].name.replace(/\.[^.]+$/, '') || `image_${i + 1}`;
          zip.file(`${baseName}.pdf`, singleBytes);
        }
        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        successHaptic();
        downloadBlob(blob, 'PDFMaster_Images_to_PDFs.zip');
      }
    } catch (err: any) {
      alert('Error creating PDF: ' + err.message);
    }
  };

  // Convert PDF -> JPG
  const handleConvertPdfToJpg = async () => {
    if (!pdfFile?.arrayBuffer) return;
    triggerHaptic(20);
    setIsProcessingPdfToJpg(true);

    try {
      const results = await convertPdfToJpg(
        pdfFile.arrayBuffer,
        pdfToJpgQuality,
        (done, total, pct) => {
          setPdfToJpgProgress({ done, total, pct });
        }
      );

      successHaptic();
      if (results.length === 1) {
        const base = pdfFile.name.replace(/\.pdf$/i, '');
        downloadBlob(results[0].blob, `${base}_page_1.jpg`);
      } else {
        const zip = new JSZip();
        results.forEach((r) => {
          zip.file(r.name, r.blob);
        });
        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        const base = pdfFile.name.replace(/\.pdf$/i, '');
        downloadBlob(blob, `${base}_pages_JPG.zip`);
      }
    } catch (err: any) {
      alert('Error extracting pages to JPG: ' + err.message);
    } finally {
      setIsProcessingPdfToJpg(false);
    }
  };

  const handleReset = () => {
    triggerHaptic(15);
    setImageItems([]);
    setPdfFile(null);
    setEstimatedPdfSize(null);
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1.5 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            setConversionMode('jpg-to-pdf');
          }}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
            conversionMode === 'jpg-to-pdf'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>JPG to PDF</span>
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            setConversionMode('pdf-to-jpg');
          }}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
            conversionMode === 'pdf-to-jpg'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>PDF to JPG</span>
        </button>
      </div>

      {conversionMode === 'jpg-to-pdf' ? (
        /* ===================== JPG TO PDF ===================== */
        <div className="space-y-6">
          <DropZone
            accept="image/*"
            multiple={true}
            allowCamera={true}
            fileItems={imageItems.map((img) => ({
              id: img.id,
              name: img.name,
              size: img.size,
              file: null as any,
            }))}
            onFilesSelected={handleImagesSelected}
            title="Select or Capture Images"
            subtitle="Upload photos, scans, receipts or screenshots. Drag to reorder, crop & convert."
          />

          {imageItems.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-500" />
                  PDF Export Options
                </h3>
                {estimatedPdfSize && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                    Est. Output Size: ~{formatBytes(estimatedPdfSize)}
                  </span>
                )}
              </div>

              {/* Main settings row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Page Sizing</label>
                  <select
                    value={jpgSettings.pageSize}
                    onChange={(e) => setJpgSettings({ ...jpgSettings, pageSize: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="a4-fixed">A4 (Fit & Center) - Recommended</option>
                    <option value="auto">Original Image Dimension</option>
                    <option value="equal-width-ratio">Equal Width (Keep Proportions)</option>
                    <option value="letter-fixed">US Letter (Fit & Center)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Image Quality</label>
                  <select
                    value={jpgSettings.quality}
                    onChange={(e) => setJpgSettings({ ...jpgSettings, quality: parseFloat(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0.72">Normal (Fast, Small PDF)</option>
                    <option value="0.85">High Quality (Balanced)</option>
                    <option value="1.0">Maximum (Original Uncompressed)</option>
                  </select>
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={() => setJpgSettings({ ...jpgSettings, mergeAll: !jpgSettings.mergeAll })}
                    className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-between font-semibold transition ${
                      jpgSettings.mergeAll
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                        : 'border-slate-300 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <span>Merge all into 1 PDF</span>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center ${
                        jpgSettings.mergeAll ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      {jpgSettings.mergeAll && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdvancedJpg(!showAdvancedJpg)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showAdvancedJpg ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span>Advanced Settings (Orientation & Margins)</span>
                </button>

                {showAdvancedJpg && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300">Orientation</label>
                      <select
                        value={jpgSettings.orientation}
                        onChange={(e) => setJpgSettings({ ...jpgSettings, orientation: e.target.value as any })}
                        className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5"
                      >
                        <option value="auto">Auto (Match Image Ratio)</option>
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300">Page Margin</label>
                      <select
                        value={jpgSettings.margin}
                        onChange={(e) => setJpgSettings({ ...jpgSettings, margin: parseFloat(e.target.value) })}
                        className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5"
                      >
                        <option value="0">No Margin (Full Bleed)</option>
                        <option value="18">Small (18 pt)</option>
                        <option value="36">Medium (36 pt)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleConvertJpgToPdf}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md active:scale-95 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    Download {jpgSettings.mergeAll ? 'Combined PDF' : 'Separate PDFs (.ZIP)'} ({imageItems.length} Images)
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

              {/* Image Grid with Crop, Rotate, Drag-Reorder */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 mb-3">
                  Drag cards to change page order. Tap Crop or Rotate to edit individual photos:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {imageItems.map((img, idx) => (
                    <div
                      key={img.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={() => setDraggedImgIdx(null)}
                      className={`relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 shadow-xs group ${
                        draggedImgIdx === idx ? 'opacity-40 scale-95' : ''
                      }`}
                    >
                      {/* Image Thumbnail */}
                      <div className="relative aspect-[3/4] bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
                        <img src={img.dataUrl} alt={img.name} className="w-full h-full object-contain pointer-events-none" />

                        {/* Top Action Overlay buttons */}
                        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-auto">
                          <button
                            type="button"
                            onClick={() => handleRotateImage(idx)}
                            className="p-1 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white shadow-sm transition"
                            title="Rotate 90°"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCropperIndex(idx)}
                            className="p-1 rounded-full bg-purple-600/90 hover:bg-purple-700 text-white shadow-sm transition"
                            title="Crop Image"
                          >
                            <Crop className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="p-1 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white shadow-sm transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-bold flex items-center gap-1 truncate max-w-[85px]">
                          <GripVertical className="w-3 h-3 text-slate-400" />
                          #{idx + 1}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatBytes(img.size)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Modal Cropper */}
          {cropperIndex !== null && imageItems[cropperIndex] && (
            <ImageCropperModal
              isOpen={true}
              imageUrl={imageItems[cropperIndex].dataUrl}
              onClose={() => setCropperIndex(null)}
              onApplyCrop={handleApplyCroppedImage}
            />
          )}
        </div>
      ) : (
        /* ===================== PDF TO JPG ===================== */
        <div className="space-y-6">
          <DropZone
            accept="application/pdf"
            multiple={false}
            fileItems={pdfFile ? [pdfFile] : []}
            onFilesSelected={handlePdfSelected}
            onRemoveFile={handleReset}
            title="Upload PDF to Extract Images"
            subtitle="Converts every page into a crisp, high-resolution JPG image in seconds."
          />

          {pdfFile && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Image Export Settings
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Rendering Resolution</label>
                  <select
                    value={pdfToJpgQuality}
                    onChange={(e) => setPdfToJpgQuality(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="normal">Normal (Fast, Clear - Recommended)</option>
                    <option value="high">High Definition (Ultra Crisp, Larger Size)</option>
                  </select>
                </div>
              </div>

              {/* Progress Bar when rendering */}
              {isProcessingPdfToJpg && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-300">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Rendering page {pdfToJpgProgress.done} of {pdfToJpgProgress.total}...
                    </span>
                    <span>{pdfToJpgProgress.pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-300 rounded-full"
                      style={{ width: `${pdfToJpgProgress.pct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isProcessingPdfToJpg}
                  onClick={handleConvertPdfToJpg}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white shadow-md active:scale-95 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Extract Pages to JPG (.ZIP)</span>
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
      )}
    </div>
  );
};
