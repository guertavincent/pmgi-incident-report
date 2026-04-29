'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const SignatureCanvas = dynamic(() => import('react-signature-canvas'), {
  ssr: false,
  loading: () => <div className="w-full h-32 bg-gray-100 animate-pulse rounded" />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

interface SignaturePadProps {
  label: string;
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}

export default function SignaturePad({ label, onSave, onClear }: SignaturePadProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sigRef = useRef<any>(null);
  const [saved, setSaved] = useState(false);

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
    onClear();
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
