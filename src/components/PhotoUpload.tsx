'use client';

import { useState } from 'react';

interface PhotoUploadProps {
  label: string;
  onFileSelect: (file: File) => void;
}

export default function PhotoUpload({ label, onFileSelect }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const compressImage = async (file: File) => {
    if (!file.type.startsWith('image/')) return file;

    const imageDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });

    if (!imageDataUrl) return file;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load image'));
      image.src = imageDataUrl;
    });

    const maxWidth = 1600;
    const scale = img.width > maxWidth ? maxWidth / img.width : 1;
    const targetWidth = Math.round(img.width * scale);
    const targetHeight = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.8)
    );

    if (!blob) return file;

    return new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
      type: 'image/jpeg',
    });
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    onFileSelect(compressed);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(compressed);
  };

  return (
    <div className="border border-gray-300 rounded p-3">
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="block w-full text-xs sm:text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      {preview && (
        <div className="mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="max-h-40 max-w-full rounded border border-gray-200 object-contain"
          />
        </div>
      )}
    </div>
  );
}
