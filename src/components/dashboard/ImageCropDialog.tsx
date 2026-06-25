"use client";

import { useState, useRef, useCallback } from "react";

export function ImageCropDialog({
  imageSrc: initialSrc,
  isOpen,
  onConfirm,
  onCancel,
}: {
  imageSrc: string;
  isOpen: boolean;
  onConfirm: (croppedFile: File) => void;
  onCancel: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);

  const handleCrop = useCallback(async () => {
    if (!imgRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imgRef.current;
    const size = Math.min(img.naturalWidth, img.naturalHeight);
    const x = (img.naturalWidth - size) / 2;
    const y = (img.naturalHeight - size) / 2;

    const outputSize = Math.min(size, 1024);
    canvas.width = outputSize;
    canvas.height = outputSize;
    
    ctx.drawImage(
      img,
      x / zoom,
      y / zoom,
      size / zoom,
      size / zoom,
      0,
      0,
      outputSize,
      outputSize
    );

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "profile-picture.jpg", { type: "image/jpeg" });
        onConfirm(file);
      }
    }, "image/jpeg", 0.95);
  }, [zoom, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-wt-surface-1 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Crop Profile Picture</h3>

        <div className="mb-4 flex items-center justify-center bg-wt-surface-2 rounded-lg overflow-hidden h-64 w-64">
          <img
            ref={imgRef}
            src={initialSrc}
            alt="Crop preview"
            style={{ transform: `scale(${zoom})` }}
            className="max-w-full max-h-full"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Zoom: {Math.round(zoom * 100)}%</label>
          <input
            type="range"
            min="1"
            max="3"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={handleCrop}
          >
            Crop & Save
          </button>
          <button
            type="button"
            className="btn-ghost flex-1"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="sr-only" />
    </div>
  );
}
