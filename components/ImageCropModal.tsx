"use client";

import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";

type Props = {
  imageSrc: string;
  aspect?: number; // width/height ratio, e.g. 1 for square, 16/9 for banner
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
};

export default function ImageCropModal({ imageSrc, aspect = 1, onCrop, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  async function handleConfirm() {
    if (!croppedArea) return;

    // Load via <img> so the browser applies EXIF orientation automatically
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = reject;
      image.src = imageSrc;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(croppedArea.width);
    canvas.height = Math.round(croppedArea.height);
    const ctx = canvas.getContext("2d")!;

    ctx.drawImage(
      image,
      Math.round(croppedArea.x),
      Math.round(croppedArea.y),
      Math.round(croppedArea.width),
      Math.round(croppedArea.height),
      0,
      0,
      Math.round(croppedArea.width),
      Math.round(croppedArea.height),
    );

    canvas.toBlob(
      (blob) => { if (blob) onCrop(blob); },
      "image/webp",
      0.85
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
    >
      <div className="relative w-full flex-1" style={{ maxWidth: 600, maxHeight: "70vh" }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { borderRadius: 12 },
          }}
        />
      </div>

      {/* Zoom slider */}
      <div className="mt-4 flex items-center gap-3 px-6" style={{ width: "100%", maxWidth: 400 }}>
        <span className="text-xs" style={{ color: "#86868b" }}>−</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1"
          style={{ accentColor: "#6366f1" }}
        />
        <span className="text-xs" style={{ color: "#86868b" }}>+</span>
      </div>

      {/* Buttons */}
      <div className="mt-4 mb-6 flex items-center gap-3">
        <button
          onClick={onCancel}
          className="rounded-xl px-5 py-2.5 text-sm transition-opacity hover:opacity-80"
          style={{ color: "#86868b" }}
        >
          Avbryt
        </button>
        <button
          onClick={handleConfirm}
          className="rounded-xl px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: "#6366f1", color: "#fff" }}
        >
          Bekreft
        </button>
      </div>
    </div>
  );
}
