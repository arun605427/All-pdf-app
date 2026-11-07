import React, { useState, useEffect, useRef } from 'react';
import { RotateCw, RotateCcw, Check, X, Lock, Unlock, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { useHaptic } from '../hooks/useHaptic';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onApplyCrop: (croppedDataUrl: string) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
  onApplyCrop,
}) => {
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [aspectRatio, setAspectRatio] = useState<string>('free'); // free, 1, 1.333, 0.75, 1.777, 0.562, 1.414, 0.707
  const [lockRatio, setLockRatio] = useState<boolean>(false);
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 40,
    y: 40,
    w: 240,
    h: 240,
  });
  const [customW, setCustomW] = useState<number>(0);
  const [customH, setCustomH] = useState<number>(0);
  const [isEditingSize, setIsEditingSize] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{
    isDragging: boolean;
    mode: string | null; // 'move', 'tl', 'tr', 'bl', 'br', 'tm', 'bm', 'ml', 'mr'
    startX: number;
    startY: number;
    startBox: { x: number; y: number; w: number; h: number };
  }>({
    isDragging: false,
    mode: null,
    startX: 0,
    startY: 0,
    startBox: { x: 0, y: 0, w: 0, h: 0 },
  });

  const { triggerHaptic } = useHaptic();

  // Reset and initialize crop box when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setRotation(0);
    setZoom(1);
    setAspectRatio('free');
    setLockRatio(false);
    setIsEditingSize(false);

    const timer = setTimeout(() => {
      if (containerRef.current) {
        const cw = containerRef.current.clientWidth || 360;
        const ch = containerRef.current.clientHeight || 360;
        const initialSize = Math.min(cw * 0.8, ch * 0.8, 300);
        const newBox = {
          x: Math.max(10, (cw - initialSize) / 2),
          y: Math.max(10, (ch - initialSize) / 2),
          w: initialSize,
          h: initialSize,
        };
        setCropBox(newBox);
        setCustomW(Math.round(newBox.w));
        setCustomH(Math.round(newBox.h));
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, imageUrl]);

  // Adjust crop box when aspect ratio changes
  const applyPresetRatio = (preset: string) => {
    setAspectRatio(preset);
    triggerHaptic(10);
    if (preset === 'free') {
      setLockRatio(false);
      return;
    }
    setLockRatio(true);
    let ratio = 1;
    if (preset === '1') ratio = 1;
    else if (preset === '1.333') ratio = 4 / 3;
    else if (preset === '0.75') ratio = 3 / 4;
    else if (preset === '1.777') ratio = 16 / 9;
    else if (preset === '0.562') ratio = 9 / 16;
    else if (preset === '1.414') ratio = 1.414; // A4 Landscape
    else if (preset === '0.707') ratio = 0.707; // A4 Portrait

    const cw = containerRef.current?.clientWidth || 360;
    const ch = containerRef.current?.clientHeight || 360;
    let nw = cropBox.w;
    let nh = nw / ratio;

    if (nh > ch * 0.9) {
      nh = ch * 0.9;
      nw = nh * ratio;
    }
    if (nw > cw * 0.9) {
      nw = cw * 0.9;
      nh = nw / ratio;
    }

    setCropBox({
      x: Math.max(0, Math.min(cw - nw, (cw - nw) / 2)),
      y: Math.max(0, Math.min(ch - nh, (ch - nh) / 2)),
      w: Math.max(40, nw),
      h: Math.max(40, nh),
    });
  };

  const handlePointerDown = (mode: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    dragRef.current = {
      isDragging: true,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startBox: { ...cropBox },
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging || !dragRef.current.mode) return;
    const { mode, startX, startY, startBox } = dragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const cw = containerRef.current?.clientWidth || 360;
    const ch = containerRef.current?.clientHeight || 360;

    let nx = startBox.x;
    let ny = startBox.y;
    let nw = startBox.w;
    let nh = startBox.h;

    const ratio =
      aspectRatio === '1'
        ? 1
        : aspectRatio === '1.333'
        ? 4 / 3
        : aspectRatio === '0.75'
        ? 3 / 4
        : aspectRatio === '1.777'
        ? 16 / 9
        : aspectRatio === '0.562'
        ? 9 / 16
        : aspectRatio === '1.414'
        ? 1.414
        : aspectRatio === '0.707'
        ? 0.707
        : null;

    if (mode === 'move') {
      nx = Math.max(0, Math.min(cw - nw, startBox.x + dx));
      ny = Math.max(0, Math.min(ch - nh, startBox.y + dy));
    } else {
      if (mode.includes('r')) nw = Math.max(40, startBox.w + dx);
      if (mode.includes('l')) {
        const potentialW = startBox.w - dx;
        if (potentialW >= 40) {
          nw = potentialW;
          nx = startBox.x + dx;
        }
      }
      if (mode.includes('b')) nh = Math.max(40, startBox.h + dy);
      if (mode.includes('t')) {
        const potentialH = startBox.h - dy;
        if (potentialH >= 40) {
          nh = potentialH;
          ny = startBox.y + dy;
        }
      }

      if (ratio && lockRatio) {
        if (mode.includes('r') || mode.includes('l')) {
          nh = nw / ratio;
        } else {
          nw = nh * ratio;
        }
      }

      nx = Math.max(0, Math.min(cw - nw, nx));
      ny = Math.max(0, Math.min(ch - nh, ny));
    }

    setCropBox({ x: nx, y: ny, w: nw, h: nh });
    setCustomW(Math.round(nw));
    setCustomH(Math.round(nh));
  };

  const handlePointerUp = () => {
    dragRef.current.isDragging = false;
    dragRef.current.mode = null;
  };

  const executeCrop = async () => {
    if (!imgRef.current || !containerRef.current) return;
    triggerHaptic(20);

    const img = imgRef.current;
    const container = containerRef.current;

    const natW = img.naturalWidth || 800;
    const natH = img.naturalHeight || 600;

    // First render rotated/zoomed onto a temporary canvas
    const tempCanvas = document.createElement('canvas');
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));

    tempCanvas.width = Math.max(1, Math.round(natW * cos + natH * sin));
    tempCanvas.height = Math.max(1, Math.round(natW * sin + natH * cos));
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate(rad);
    tempCtx.drawImage(img, -natW / 2, -natH / 2);

    // Now calculate crop relative to display scale
    const dispRect = container.getBoundingClientRect();
    const scaleX = tempCanvas.width / (dispRect.width || 1);
    const scaleY = tempCanvas.height / (dispRect.height || 1);

    const cropX = Math.max(0, cropBox.x * scaleX);
    const cropY = Math.max(0, cropBox.y * scaleY);
    const cropW = Math.max(1, Math.min(tempCanvas.width - cropX, cropBox.w * scaleX));
    const cropH = Math.max(1, Math.min(tempCanvas.height - cropY, cropBox.h * scaleY));

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = Math.round(cropW);
    finalCanvas.height = Math.round(cropH);
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) return;

    finalCtx.fillStyle = '#ffffff';
    finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    finalCtx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, 0, 0, finalCanvas.width, finalCanvas.height);

    const croppedDataUrl = finalCanvas.toDataURL('image/jpeg', 0.92);

    tempCanvas.width = 0;
    tempCanvas.height = 0;
    finalCanvas.width = 0;
    finalCanvas.height = 0;

    onApplyCrop(croppedDataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl h-[94vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-600/30 text-blue-400">
                <RefreshCw className="w-4 h-4" />
              </span>
              Crop & Rotate Image
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Central Crop Work Area */}
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden select-none touch-none p-4"
        >
          {/* Base Image */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt="To crop"
            style={{
              transform: `rotate(${rotation}deg) scale(${zoom})`,
              transition: 'transform 0.15s ease-out',
              maxHeight: '100%',
              maxWidth: '100%',
              objectFit: 'contain',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />

          {/* Dimmed Overlay & Crop Box */}
          <div
            style={{
              left: `${cropBox.x}px`,
              top: `${cropBox.y}px`,
              width: `${cropBox.w}px`,
              height: `${cropBox.h}px`,
            }}
            onPointerDown={(e) => handlePointerDown('move', e)}
            className="absolute border-2 border-blue-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] cursor-move touch-none"
          >
            {/* Rule of thirds grid lines */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
              <div className="border-r border-b border-white/60"></div>
              <div className="border-r border-b border-white/60"></div>
              <div className="border-b border-white/60"></div>
              <div className="border-r border-b border-white/60"></div>
              <div className="border-r border-b border-white/60"></div>
              <div className="border-b border-white/60"></div>
              <div className="border-r border-white/60"></div>
              <div className="border-r border-white/60"></div>
              <div></div>
            </div>

            {/* Dimension Badge */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingSize(true);
              }}
              className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-blue-300 border border-slate-700 shadow-md cursor-pointer pointer-events-auto"
            >
              {Math.round(cropBox.w)} × {Math.round(cropBox.h)} px
            </div>

            {/* Corner Handles */}
            <div
              onPointerDown={(e) => handlePointerDown('tl', e)}
              className="absolute -top-2.5 -left-2.5 w-6 h-6 border-t-3 border-l-3 border-blue-400 cursor-nw-resize pointer-events-auto"
            />
            <div
              onPointerDown={(e) => handlePointerDown('tr', e)}
              className="absolute -top-2.5 -right-2.5 w-6 h-6 border-t-3 border-r-3 border-blue-400 cursor-ne-resize pointer-events-auto"
            />
            <div
              onPointerDown={(e) => handlePointerDown('bl', e)}
              className="absolute -bottom-2.5 -left-2.5 w-6 h-6 border-b-3 border-l-3 border-blue-400 cursor-sw-resize pointer-events-auto"
            />
            <div
              onPointerDown={(e) => handlePointerDown('br', e)}
              className="absolute -bottom-2.5 -right-2.5 w-6 h-6 border-b-3 border-r-3 border-blue-400 cursor-se-resize pointer-events-auto"
            />

            {/* Mid Edge Bars */}
            <div
              onPointerDown={(e) => handlePointerDown('tm', e)}
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-blue-400 rounded-xs cursor-n-resize pointer-events-auto"
            />
            <div
              onPointerDown={(e) => handlePointerDown('bm', e)}
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-blue-400 rounded-xs cursor-s-resize pointer-events-auto"
            />
            <div
              onPointerDown={(e) => handlePointerDown('ml', e)}
              className="absolute -left-1.5 top-1/2 -translate-y-1/2 h-8 w-3 bg-blue-400 rounded-xs cursor-w-resize pointer-events-auto"
            />
            <div
              onPointerDown={(e) => handlePointerDown('mr', e)}
              className="absolute -right-1.5 top-1/2 -translate-y-1/2 h-8 w-3 bg-blue-400 rounded-xs cursor-e-resize pointer-events-auto"
            />
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 space-y-3 shrink-0">
          {/* Rotation & Zoom Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setRotation((r) => (r - 90) % 360);
                  triggerHaptic(10);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                title="Rotate 90° Left"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="-180"
                max="180"
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                className="w-24 sm:w-36 accent-blue-500 cursor-pointer"
              />
              <span className="font-mono text-slate-300 w-12 text-center">{rotation}°</span>
              <button
                type="button"
                onClick={() => {
                  setRotation((r) => (r + 90) % 360);
                  triggerHaptic(10);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                title="Rotate 90° Right"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setLockRatio(!lockRatio);
                  triggerHaptic(10);
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-medium transition ${
                  lockRatio ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {lockRatio ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>Lock Ratio</span>
              </button>
            </div>
          </div>

          {/* Preset Buttons & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {[
                { label: 'Free', val: 'free' },
                { label: '1:1', val: '1' },
                { label: '4:3', val: '1.333' },
                { label: '16:9', val: '1.777' },
                { label: 'A4 Port', val: '0.707' },
                { label: 'A4 Land', val: '1.414' },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => applyPresetRatio(p.val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition ${
                    aspectRatio === p.val
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeCrop}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md active:scale-95 transition"
              >
                <Check className="w-4 h-4" />
                <span>Apply Crop</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
