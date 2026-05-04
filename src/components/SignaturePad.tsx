'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import Image from 'next/image';

interface SignatureCanvasProps {
  penColor?: string;
  canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
}

interface SignatureCanvasHandle {
  isEmpty(): boolean;
  toDataURL(type?: string): string;
  clear(): void;
}

const SignatureCanvas = dynamic(() => import('react-signature-canvas'), {
  ssr: false,
  loading: () => <div className="w-full h-32 bg-gray-100 animate-pulse rounded" />,
}) as ComponentType<SignatureCanvasProps & { ref?: React.Ref<SignatureCanvasHandle> }>;

interface SignaturePadProps {
  label: string;
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}

export default function SignaturePad({ label, onSave, onClear }: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvasHandle>(null);
  const [saved, setSaved] = useState(false);
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string>('');

  const handleSave = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      const dataUrl = sigRef.current.toDataURL('image/png');
      onSave(dataUrl);
      setSaved(true);
    }
  };

  const handleClear = () => {
    if (sigRef.current) {
      sigRef.current.clear();
    }
    setSaved(false);
    setUploadedDataUrl('');
    onClear();
  };

  const handleUpload = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      setUploadedDataUrl(result);
      onSave(result);
      setSaved(true);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="border border-gray-300 rounded p-2">
      <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
      <div className="border border-gray-200 bg-white rounded">
        <SignatureCanvas
          ref={sigRef}
          penColor="black"
          canvasProps={{
            width: 400,
            height: 128,
            className: 'w-full',
            style: { touchAction: 'none' },
          }}
        />
      </div>
      <div className="mt-2">
        <label className="text-xs font-medium text-gray-600">Upload signature image</label>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => handleUpload(event.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-xs text-gray-700 file:mr-3 file:rounded file:border-0 file:bg-gray-200 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-gray-700 hover:file:bg-gray-300"
        />
        {uploadedDataUrl && (
          <div className="mt-2 h-24 w-full rounded border border-gray-200 overflow-hidden">
            <Image
              src={uploadedDataUrl}
              alt="Uploaded signature preview"
              width={400}
              height={96}
              className="h-24 w-full object-contain"
            />
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Save Signature
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-1 bg-gray-400 text-white text-sm rounded hover:bg-gray-500"
        >
          Clear
        </button>
        {saved && <span className="text-green-600 text-sm self-center">✓ Saved</span>}
      </div>
    </div>
  );
}
