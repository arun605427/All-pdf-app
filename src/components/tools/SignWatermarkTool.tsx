import React, { useState } from 'react';
import { PenTool, Stamp, Download, RotateCcw, Check, Sparkles, Hash, Eye } from 'lucide-react';
import { DropZone } from '../DropZone';
import { SignaturePadModal } from '../SignaturePadModal';
import { useHaptic } from '../../hooks/useHaptic';
import {
  applyWatermarkAndPageNumbers,
  applySignatureToPdf,
  renderPdfPageToDataUrl,
  downloadPdfBytes,
  getPdfInfo,
} from '../../utils/pdfEngine';
import type { FileItem, WatermarkOptions } from '../../types';

export const SignWatermarkTool: React.FC = () => {
  const [activeSubMode, setActiveSubMode] = useState<'watermark' | 'sign'>('watermark');
  const [fileItem, setFileItem] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Watermark Settings
  const [watermarkOpts, setWatermarkOpts] = useState<WatermarkOptions>({
    text: 'CONFIDENTIAL',
    fontSize: 48,
    color: '#94a3b8',
    opacity: 0.35,
    rotationAngle: 45,
    position: 'diagonal',
    includePageNumbers: true,
    pageNumberPosition: 'bottom-center',
    pageNumberFormat: 'page-of-total',
  });

  // Signature Settings
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signPageNum, setSignPageNum] = useState<number>(1);
  const [signPosition, setSignPosition] = useState<'bottom-right' | 'bottom-left' | 'bottom-center'>('bottom-right');
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState<boolean>(false);

  const { triggerHaptic, successHaptic } = useHaptic();

  const handleFilesSelected = async (files: File[]) => {
    if (!files.length) return;
    const file = files[0];
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a valid PDF.');
      return;
    }

    try {
      setIsProcessing(true);
      const ab = await file.arrayBuffer();
      const { doc, numPages } = await getPdfInfo(ab);
      const { dataUrl } = await renderPdfPageToDataUrl(doc, 1, 0.6);

      setFileItem({
        id: Math.random().toString(),
        file,
        name: file.name,
        size: file.size,
        arrayBuffer: ab,
        pageCount: numPages,
      });
      setPreviewUrl(dataUrl);
    } catch (err: any) {
      alert('Error opening PDF: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyWatermark = async () => {
    if (!fileItem?.arrayBuffer) return;
    triggerHaptic(20);
    setIsProcessing(true);

    try {
      const bytes = await applyWatermarkAndPageNumbers(fileItem.arrayBuffer, watermarkOpts);
      successHaptic();
      const defaultName = fileItem.name.replace(/\.pdf$/i, '') + '_watermarked.pdf';
      downloadPdfBytes(bytes, defaultName);
    } catch (err: any) {
      alert('Error adding watermark: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplySignature = async () => {
    if (!fileItem?.arrayBuffer || !signatureDataUrl) {
      alert('Please draw your signature first.');
      return;
    }
    triggerHaptic(20);
    setIsProcessing(true);

    try {
      // Coordinate percentages for standard positions
      let posX = 80;
      let posY = 15;
      if (signPosition === 'bottom-left') {
        posX = 20;
        posY = 15;
      } else if (signPosition === 'bottom-center') {
        posX = 50;
        posY = 15;
      }

      const bytes = await applySignatureToPdf(
        fileItem.arrayBuffer,
        signatureDataUrl,
        signPageNum,
        posX,
        posY,
        0.28
      );
      successHaptic();
      const defaultName = fileItem.name.replace(/\.pdf$/i, '') + '_signed.pdf';
      downloadPdfBytes(bytes, defaultName);
    } catch (err: any) {
      alert('Error signing PDF: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    triggerHaptic(15);
    setFileItem(null);
    setPreviewUrl(null);
    setSignatureDataUrl(null);
  };

  return (
    <div className="space-y-6">
      {/* Submode Selector */}
      <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1.5 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            setActiveSubMode('watermark');
          }}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
            activeSubMode === 'watermark'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Stamp className="w-4 h-4" />
          <span>Watermark & Bates Numbers</span>
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            setActiveSubMode('sign');
          }}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
            activeSubMode === 'sign'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span>Draw & Place Signature</span>
        </button>
      </div>

      <DropZone
        accept="application/pdf"
        multiple={false}
        fileItems={fileItem ? [fileItem] : []}
        onFilesSelected={handleFilesSelected}
        onRemoveFile={handleReset}
        title={activeSubMode === 'watermark' ? 'Upload PDF to Add Watermark' : 'Upload PDF to Sign'}
        subtitle="Protect ownership, stamp official notices, or sign agreements directly from your Android phone."
      />

      {fileItem && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
          {activeSubMode === 'watermark' ? (
            /* ===================== WATERMARK SETTINGS ===================== */
            <div className="space-y-4 text-xs sm:text-sm">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Stamp className="w-4 h-4 text-blue-500" />
                Custom Watermark Setup
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Watermark Text</label>
                  <input
                    type="text"
                    value={watermarkOpts.text}
                    onChange={(e) => setWatermarkOpts({ ...watermarkOpts, text: e.target.value })}
                    placeholder="e.g. CONFIDENTIAL, DRAFT, APPROVED"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Layout Style</label>
                  <select
                    value={watermarkOpts.position}
                    onChange={(e) =>
                      setWatermarkOpts({
                        ...watermarkOpts,
                        position: e.target.value as any,
                        rotationAngle: e.target.value === 'diagonal' ? 45 : 0,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="diagonal">Diagonal Across Page (45°)</option>
                    <option value="center">Center Horizontal</option>
                    <option value="header">Header Top Banner</option>
                    <option value="footer">Footer Bottom Notice</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Color Tone</label>
                  <div className="flex items-center gap-2 pt-1">
                    {[
                      { hex: '#94a3b8', label: 'Silver Gray' },
                      { hex: '#ef4444', label: 'Security Red' },
                      { hex: '#2563eb', label: 'Royal Blue' },
                      { hex: '#10b981', label: 'Emerald' },
                      { hex: '#000000', label: 'Black' },
                    ].map((col) => (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => setWatermarkOpts({ ...watermarkOpts, color: col.hex })}
                        style={{ backgroundColor: col.hex }}
                        className={`w-7 h-7 rounded-full border-2 transition ${
                          watermarkOpts.color === col.hex ? 'border-blue-500 scale-110 shadow-sm' : 'border-transparent'
                        }`}
                        title={col.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Sliders for Size & Opacity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold text-xs text-slate-700 dark:text-slate-300">
                    <span>Font Size</span>
                    <span>{watermarkOpts.fontSize} pt</span>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="110"
                    value={watermarkOpts.fontSize}
                    onChange={(e) =>
                      setWatermarkOpts({ ...watermarkOpts, fontSize: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold text-xs text-slate-700 dark:text-slate-300">
                    <span>Opacity / Transparency</span>
                    <span>{Math.round(watermarkOpts.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={watermarkOpts.opacity}
                    onChange={(e) =>
                      setWatermarkOpts({ ...watermarkOpts, opacity: parseFloat(e.target.value) })
                    }
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Page Numbering Checkbox */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setWatermarkOpts({
                      ...watermarkOpts,
                      includePageNumbers: !watermarkOpts.includePageNumbers,
                    })
                  }
                  className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-between font-semibold transition ${
                    watermarkOpts.includePageNumbers
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      : 'border-slate-300 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-blue-500" />
                    Add Bates / Page Numbers (&quot;Page 1 of {fileItem.pageCount || 'N'}&quot;)
                  </span>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center ${
                      watermarkOpts.includePageNumbers ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    {watermarkOpts.includePageNumbers && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleApplyWatermark}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md active:scale-95 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Watermarked PDF</span>
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
          ) : (
            /* ===================== SIGNATURE SETTINGS ===================== */
            <div className="space-y-4 text-xs sm:text-sm">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-blue-500" />
                Sign Document
              </h3>

              {/* Signature Preview or Drawer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {signatureDataUrl ? (
                    <div className="w-36 h-20 bg-white rounded-xl border border-slate-300 flex items-center justify-center p-2 shadow-xs">
                      <img src={signatureDataUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-36 h-20 bg-slate-200 dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs text-slate-400 font-medium">
                      No Signature
                    </div>
                  )}

                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Touch Signature</h4>
                    <p className="text-xs text-slate-500">
                      {signatureDataUrl ? 'Signature ready to place.' : 'Draw using your phone screen.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSignatureModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition active:scale-95"
                >
                  {signatureDataUrl ? 'Change Signature' : 'Draw New Signature'}
                </button>
              </div>

              {/* Placement settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Page to Sign</label>
                  <select
                    value={signPageNum}
                    onChange={(e) => setSignPageNum(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: fileItem.pageCount || 1 }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        Page {num} {num === fileItem.pageCount ? '(Last Page)' : num === 1 ? '(First Page)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Position Placement</label>
                  <select
                    value={signPosition}
                    onChange={(e) => setSignPosition(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bottom-right">Bottom Right (Standard Signee Block)</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-center">Bottom Center</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={!signatureDataUrl || isProcessing}
                  onClick={handleApplySignature}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white shadow-md active:scale-95 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Signed PDF</span>
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

      {/* Signature Modal */}
      <SignaturePadModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSaveSignature={(dataUrl) => setSignatureDataUrl(dataUrl)}
      />
    </div>
  );
};
