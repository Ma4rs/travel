"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface PhotoUploadDialogProps {
  questTitle: string;
  questId: string;
  onComplete: (questId: string, photoUrl: string) => void;
  onClose: () => void;
}

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const JPEG_QUALITY = 0.85;

function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to resize image"));
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };
    img.src = objectUrl;
  });
}

export default function PhotoUploadDialog({
  questTitle,
  questId,
  onComplete,
  onClose,
}: PhotoUploadDialogProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      prev?.focus();
    };
  }, [onClose]);

  const handleFileSelected = useCallback(
    (file: File) => {
      if (preview) URL.revokeObjectURL(preview);
      setSelectedFile(file);
      setError(null);
      setPreview(URL.createObjectURL(file));
    },
    [preview]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelected(file);
    },
    [handleFileSelected]
  );

  async function handleUpload() {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const resized = await resizeImage(selectedFile);
      const formData = new FormData();
      formData.append("photo", resized, `${questId}.jpg`);
      formData.append("questId", questId);

      const res = await fetch("/api/upload-photo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const { photoUrl } = await res.json();
      onComplete(questId, photoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[1100] flex items-end justify-center sm:items-center outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-upload-title"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-t-2xl bg-card p-6 sm:rounded-2xl">
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-border/50 text-muted hover:text-foreground"
        >
          ✕
        </button>

        <h2 id="photo-upload-title" className="mb-1 text-xl font-bold">Complete Quest</h2>
        <p className="mb-5 text-sm text-muted">
          Upload a photo to complete <strong>{questTitle}</strong>
        </p>

        {preview ? (
          <div className="mb-5">
            <div className="relative overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-64 object-cover rounded-xl"
              />
              <button
                onClick={() => {
                  if (preview) URL.revokeObjectURL(preview);
                  setPreview(null);
                  setSelectedFile(null);
                }}
                aria-label="Remove photo"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-sm text-white hover:bg-black/70"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-5 flex gap-3">
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex flex-1 flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 transition-colors hover:border-primary hover:bg-primary/5"
            >
              <span className="text-3xl" aria-hidden="true">📷</span>
              <span className="text-sm font-medium">Take Photo</span>
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              className="flex flex-1 flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 transition-colors hover:border-primary hover:bg-primary/5"
            >
              <span className="text-3xl" aria-hidden="true">🖼️</span>
              <span className="text-sm font-medium">Gallery</span>
            </button>
          </div>
        )}

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleInputChange}
          className="hidden"
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />

        {error && (
          <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-3 font-medium text-muted transition-colors hover:bg-card-hover"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="flex-1 rounded-xl bg-secondary py-3 font-medium text-white transition-colors hover:bg-secondary/90 disabled:opacity-50"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Uploading...
              </span>
            ) : (
              "Upload & Complete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
