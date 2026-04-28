'use client';

import { useState } from 'react';

interface PhotoUploadProps {
  label: string;
  onFileSelect: (file: File) => void;
}

export default function PhotoUpload({ label, onFileSelect }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFileSelect(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="border border-gray-300 rounded p-3">
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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
