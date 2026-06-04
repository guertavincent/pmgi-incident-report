
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/useAuthState';
import { submitIncident, updateIncidentFiles } from '@/lib/firestore';
import { uploadFile, uploadSignature } from '@/lib/storage';
import { Incident } from '@/types/incident';
import SignaturePad from './SignaturePad';
import PhotoUpload from './PhotoUpload';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const incidentTypeOptions = [
  'Injury',
  'Near Miss',
  'Property Damage',
  'Vehicle',
  'Security',
  'Equipment',
  'Other',
] as const;

const phoneRegex = /^[+()\d\s-]{7,}$/;

const incidentSchema = z.object({
  reporterName: z.string().min(1, 'Required'),
  dateOfIncident: z.string().min(1, 'Required'),
  timeOfIncident: z.string().min(1, 'Required'),
  locationOfIncident: z.string().min(1, 'Required'),
  incidentReportedBy: z.string().min(1, 'Required'),
  phoneNumberOfReporter: z
    .string()
    .min(1, 'Required')
    .regex(phoneRegex, 'Invalid phone number'),
  dateReported: z.string().min(1, 'Required'),
  incidentReportedTo: z.string().min(1, 'Required'),
  phoneWhereReported: z
    .string()
    .min(1, 'Required')
    .regex(phoneRegex, 'Invalid phone number'),
  dateOfIncidentReported: z.string().min(1, 'Required'),
  incidentType: z.enum(incidentTypeOptions, { message: 'Required' }),
  descriptionOfIncident: z.string().min(1, 'Required'),
  peopleInvolved: z.string().min(1, 'Required'),
  correctiveActionTaken: z.string().min(1, 'Required'),
  actionToAvoidFuture: z.string().min(1, 'Required'),
  additionalComments: z.string().optional(),
  correctiveActionApprovedBy: z.string().min(1, 'Required'),
  safetyOfficerInCharge: z.string().min(1, 'Required'),
  correctiveActionImplementedOn: z.string().min(1, 'Required'),
});

type IncidentFormData = z.infer<typeof incidentSchema>;

const formatLabel = (key: string) => key.replace(/([A-Z])/g, ' $1').toUpperCase();

const buildReportRows = (data: IncidentFormData) =>
  Object.entries(data).map(([key, value]) => [formatLabel(key), String(value)]);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getNowTime = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export default function IncidentForm() {
  const router = useRouter();
  const { user } = useAuthState();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [correctiveSigDataUrl, setCorrectiveSigDataUrl] = useState('');
  const [safetySigDataUrl, setSafetySigDataUrl] = useState('');
  const [photo1, setPhoto1] = useState<File | null>(null);
  const [photo2, setPhoto2] = useState<File | null>(null);
  const [photo3, setPhoto3] = useState<File | null>(null);
  const [savePrompt, setSavePrompt] = useState<
    { data: IncidentFormData; incidentDocId: string } | null
  >(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      dateOfIncident: getToday(),
      timeOfIncident: getNowTime(),
      dateReported: getToday(),
      dateOfIncidentReported: getToday(),
      incidentType: 'Other',
    },
  });

  const draftKey = useMemo(
    () => `incidentDraft:${user?.uid ?? 'guest'}`,
    [user?.uid]
  );
  const storedDraft = typeof window === 'undefined' ? null : localStorage.getItem(draftKey);
  const autosaveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!storedDraft) return;
    try {
      const draft = JSON.parse(storedDraft) as Partial<IncidentFormData>;
      reset({
        dateOfIncident: getToday(),
        timeOfIncident: getNowTime(),
        dateReported: getToday(),
        dateOfIncidentReported: getToday(),
        incidentType: 'Other',
        ...draft,
      });
    } catch {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey, reset, storedDraft]);

  const formValues = useWatch({ control });

  useEffect(() => {
    if (autosaveTimer.current) {
      window.clearTimeout(autosaveTimer.current);
    }
    autosaveTimer.current = window.setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(formValues));
    }, 400);

    return () => {
      if (autosaveTimer.current) {
        window.clearTimeout(autosaveTimer.current);
      }
    };
  }, [draftKey, formValues]);

  const onSubmit = useCallback(
    async (data: IncidentFormData) => {
      if (!user) return;
      setSubmitting(true);
      setError('');

      try {
        // Step 1: Submit incident text data to Firestore to get the document ID.
        const incidentDocId = await submitIncident({
          ...data,
          additionalComments: data.additionalComments ?? '',
          submittedBy: user.uid,
          submittedByEmail: user.email || '',
          status: 'Open',
          assignedToName: '',
          assignedToEmail: '',
          comments: [],
        });

        // Step 2: Upload files using the Firestore document ID as the storage path.
        const fileUpdates: Partial<
          Pick<
            Incident,
            | 'sample1Url'
            | 'sample2Url'
            | 'sample3Url'
            | 'correctiveSignatureUrl'
            | 'safetySignatureUrl'
          >
        > = {};

        if (photo1) fileUpdates.sample1Url = await uploadFile(photo1, incidentDocId, 'sample1');
        if (photo2) fileUpdates.sample2Url = await uploadFile(photo2, incidentDocId, 'sample2');
        if (photo3) fileUpdates.sample3Url = await uploadFile(photo3, incidentDocId, 'sample3');
        if (correctiveSigDataUrl)
          fileUpdates.correctiveSignatureUrl = await uploadSignature(
            correctiveSigDataUrl,
            incidentDocId,
            'corrective-sig.png'
          );
        if (safetySigDataUrl)
          fileUpdates.safetySignatureUrl = await uploadSignature(
            safetySigDataUrl,
            incidentDocId,
            'safety-sig.png'
          );

        // Step 3: Update Firestore document with the uploaded file URLs.
        if (Object.keys(fileUpdates).length > 0) {
          await updateIncidentFiles(incidentDocId, fileUpdates);
        }

        localStorage.removeItem(draftKey);
        setSavePrompt({ data, incidentDocId });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to submit incident report');
      } finally {
        setSubmitting(false);
      }
    },
    [user, photo1, photo2, photo3, correctiveSigDataUrl, safetySigDataUrl, draftKey]
  );

  const inputClass =
    'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';
  const labelClass = 'block text-sm font-semibold text-gray-700 mb-1';
  const errorClass = 'text-red-500 text-xs mt-1';
  const sectionClass = 'border border-gray-400 rounded mb-4 overflow-hidden';
  const sectionHeaderClass = 'bg-blue-900 text-white text-sm font-bold px-4 py-2';

  
  const sections = useMemo(
    () => [
      {
        key: 'reporter',
        label: 'Reporter Information',
        fields: [
          'reporterName',
          'dateOfIncident',
          'timeOfIncident',
          'locationOfIncident',
          'incidentReportedBy',
          'phoneNumberOfReporter',
          'dateReported',
          'incidentReportedTo',
          'phoneWhereReported',
          'dateOfIncidentReported',
        ] as const,
      },
      {
        key: 'details',
        label: 'Incident Details',
        fields: [
          'incidentType',
          'descriptionOfIncident',
          'peopleInvolved',
          'correctiveActionTaken',
          'actionToAvoidFuture',
        ] as const,
      },
      {
        key: 'approvals',
        label: 'Approvals & Signatures',
        fields: [
          'correctiveActionApprovedBy',
          'safetyOfficerInCharge',
          'correctiveActionImplementedOn',
        ] as const,
      },
    ],
    []
  );

  const completion = useMemo(() => {
    const isFilled = (value: unknown) =>
      typeof value === 'string' ? value.trim().length > 0 : Boolean(value);

    const totals = sections.map((section) => {
      const total = section.fields.length;
      const filled = section.fields.filter((field) => isFilled(formValues[field])).length;
      return { key: section.key, label: section.label, total, filled };
    });

    const totalFields = totals.reduce((sum, s) => sum + s.total, 0);
    const totalFilled = totals.reduce((sum, s) => sum + s.filled, 0);
    const percent = totalFields === 0 ? 0 : Math.round((totalFilled / totalFields) * 100);

    return { totals, totalFields, totalFilled, percent };
  }, [formValues, sections]);

  const handleDownloadPdf = async (data: IncidentFormData) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const leftMargin = 14;
    const sectionWidth = pageWidth - leftMargin * 2;
    const labelWidth = 70;
    const logoSize = 16;

    const loadLogo = async () => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = '/pmgi-logo.png';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load logo'));
        });
        return img;
      } catch {
        return null;
      }
    };

    doc.setFillColor(26, 54, 104);
    doc.rect(0, 0, pageWidth, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);

    const logoImage = await loadLogo();
    if (logoImage) {
      doc.addImage(logoImage, 'PNG', leftMargin, 4, logoSize, logoSize);
    }

    const titleX = leftMargin + (logoImage ? logoSize + 6 : 0);
    doc.text('PMGI OFFICIAL INCIDENT REPORT', titleX, 15);

    let cursorY = 30;

    const ensureSpace = (minHeight: number) => {
      if (cursorY + minHeight > pageHeight - 12) {
        doc.addPage();
        cursorY = 20;
      }
    };

    const addSectionHeader = (title: string) => {
      ensureSpace(12);
      doc.setFillColor(26, 54, 104);
      doc.rect(leftMargin, cursorY, sectionWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(title, leftMargin + 4, cursorY + 6);
      cursorY += 12;
    };

    const fileToDataUrl = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(new Error('Failed to read image data'));
        reader.readAsDataURL(file);
      });

    const loadImageData = async (source: string | File) => {
      const dataUrl = typeof source === 'string' ? source : await fileToDataUrl(source);
      if (!dataUrl) return null;
      const format = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
      });
      return { dataUrl, format, width: img.width, height: img.height };
    };

    const addSignatureRow = async (leftUrl?: string, rightUrl?: string) => {
      const leftData = leftUrl ? await loadImageData(leftUrl) : null;
      const rightData = rightUrl ? await loadImageData(rightUrl) : null;
      if (!leftData && !rightData) return;

      const gap = 8;
      const maxWidth = (sectionWidth - gap - 8) / 2;
      const maxHeight = 55;

      const leftScale = leftData
        ? Math.min(maxWidth / leftData.width, maxHeight / leftData.height)
        : 1;
      const rightScale = rightData
        ? Math.min(maxWidth / rightData.width, maxHeight / rightData.height)
        : 1;

      const leftW = leftData ? leftData.width * leftScale : 0;
      const leftH = leftData ? leftData.height * leftScale : 0;
      const rightW = rightData ? rightData.width * rightScale : 0;
      const rightH = rightData ? rightData.height * rightScale : 0;
      const rowHeight = Math.max(leftH, rightH, 18);

      ensureSpace(18 + rowHeight + 8);
      doc.setFontSize(10);
      doc.setTextColor(33, 37, 41);
      doc.text('Corrective Action Approver', leftMargin + 2, cursorY + 6);
      doc.text('Safety Officer', leftMargin + maxWidth + gap + 6, cursorY + 6);

      const imgY = cursorY + 10;
      if (leftData) {
        const imgX = leftMargin + 2;
        doc.setDrawColor(220, 220, 220);
        doc.rect(imgX - 1, imgY - 1, leftW + 2, leftH + 2);
        doc.addImage(leftData.dataUrl, leftData.format, imgX, imgY, leftW, leftH);
      }
      if (rightData) {
        const imgX = leftMargin + maxWidth + gap + 4;
        doc.setDrawColor(220, 220, 220);
        doc.rect(imgX - 1, imgY - 1, rightW + 2, rightH + 2);
        doc.addImage(rightData.dataUrl, rightData.format, imgX, imgY, rightW, rightH);
      }

      cursorY = imgY + rowHeight + 8;
    };

    const addPhotoRow = async (
      left?: File,
      middle?: File,
      right?: File
    ) => {
      const leftData = left ? await loadImageData(left) : null;
      const middleData = middle ? await loadImageData(middle) : null;
      const rightData = right ? await loadImageData(right) : null;
      if (!leftData && !middleData && !rightData) return;

      const gap = 6;
      const maxWidth = (sectionWidth - gap * 2 - 8) / 3;
      const maxHeight = 40;

      const scale = (data: { width: number; height: number } | null) =>
        data ? Math.min(maxWidth / data.width, maxHeight / data.height) : 1;

      const leftScale = scale(leftData);
      const middleScale = scale(middleData);
      const rightScale = scale(rightData);

      const leftW = leftData ? leftData.width * leftScale : 0;
      const leftH = leftData ? leftData.height * leftScale : 0;
      const middleW = middleData ? middleData.width * middleScale : 0;
      const middleH = middleData ? middleData.height * middleScale : 0;
      const rightW = rightData ? rightData.width * rightScale : 0;
      const rightH = rightData ? rightData.height * rightScale : 0;
      const rowHeight = Math.max(leftH, middleH, rightH, 18);

      ensureSpace(18 + rowHeight + 8);
      doc.setFontSize(9);
      doc.setTextColor(33, 37, 41);
      if (leftData) doc.text('Photo Evidence 1', leftMargin + 2, cursorY + 6);
      if (middleData) {
        doc.text('Photo Evidence 2', leftMargin + maxWidth + gap + 4, cursorY + 6);
      }
      if (rightData) {
        doc.text(
          'Photo Evidence 3',
          leftMargin + maxWidth * 2 + gap * 2 + 6,
          cursorY + 6
        );
      }

      const imgY = cursorY + 10;
      if (leftData) {
        const imgX = leftMargin + 2;
        doc.setDrawColor(220, 220, 220);
        doc.rect(imgX - 1, imgY - 1, leftW + 2, leftH + 2);
        doc.addImage(leftData.dataUrl, leftData.format, imgX, imgY, leftW, leftH);
      }
      if (middleData) {
        const imgX = leftMargin + maxWidth + gap + 2;
        doc.setDrawColor(220, 220, 220);
        doc.rect(imgX - 1, imgY - 1, middleW + 2, middleH + 2);
        doc.addImage(middleData.dataUrl, middleData.format, imgX, imgY, middleW, middleH);
      }
      if (rightData) {
        const imgX = leftMargin + maxWidth * 2 + gap * 2 + 2;
        doc.setDrawColor(220, 220, 220);
        doc.rect(imgX - 1, imgY - 1, rightW + 2, rightH + 2);
        doc.addImage(rightData.dataUrl, rightData.format, imgX, imgY, rightW, rightH);
      }

      cursorY = imgY + rowHeight + 8;
    };

    autoTable(doc, {
      startY: 30,
      margin: { left: leftMargin, right: leftMargin },
      head: [
        [
          {
            content: 'REPORT DETAILS',
            colSpan: 2,
            styles: { fillColor: [26, 54, 104] },
          },
        ],
      ],
      body: buildReportRows(data),
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 2.5,
        textColor: [33, 37, 41],
        lineColor: [220, 220, 220],
        lineWidth: 0.3,
      },
      headStyles: {
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left',
      },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      columnStyles: {
        0: { cellWidth: labelWidth, fontStyle: 'bold' },
        1: { cellWidth: sectionWidth - labelWidth },
      },
    });

    cursorY = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 30;
    cursorY += 8;

    if (correctiveSigDataUrl || safetySigDataUrl) {
      addSectionHeader('SIGNATURES');
      await addSignatureRow(correctiveSigDataUrl, safetySigDataUrl);
    }

    if (photo1 || photo2 || photo3) {
      addSectionHeader('PHOTO EVIDENCE');
      await addPhotoRow(photo1 ?? undefined, photo2 ?? undefined, photo3 ?? undefined);
    }

    doc.save(`Incident_Report_${data.dateOfIncident}.pdf`);
  };

  const handleDownloadWord = (data: IncidentFormData) => {
    const rows = buildReportRows(data)
      .map(
        ([label, value]) =>
          `<tr><td style="border:1px solid #999;padding:6px;font-weight:bold">${escapeHtml(
            String(label)
          )}</td><td style="border:1px solid #999;padding:6px">${escapeHtml(
            String(value)
          )}</td></tr>`
      )
      .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Incident Report</title></head><body>
      <h2 style="font-family:Arial, sans-serif">PMGI OFFICIAL INCIDENT REPORT</h2>
      <table style="border-collapse:collapse;font-family:Arial, sans-serif;font-size:12px;width:100%">
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;

    const blob = new Blob([html], { type: 'application/msword' });
    downloadBlob(blob, `Incident_Report_${data.dateOfIncident}.doc`);
  };

  const handleSkipSave = () => {
    if (!savePrompt) return;
    router.push(`/dashboard/incidents/${savePrompt.incidentDocId}`);
    setSavePrompt(null);
  };

  const handleSavedAndContinue = () => {
    if (!savePrompt) return;
    router.push(`/dashboard/incidents/${savePrompt.incidentDocId}`);
    setSavePrompt(null);
  };

  const handleClearDraft = () => {
    localStorage.removeItem(draftKey);
    reset({
      dateOfIncident: getToday(),
      timeOfIncident: getNowTime(),
      dateReported: getToday(),
      dateOfIncidentReported: getToday(),
      incidentType: 'Other',
      reporterName: '',
      locationOfIncident: '',
      incidentReportedBy: '',
      phoneNumberOfReporter: '',
      incidentReportedTo: '',
      phoneWhereReported: '',
      descriptionOfIncident: '',
      peopleInvolved: '',
      correctiveActionTaken: '',
      actionToAvoidFuture: '',
      additionalComments: '',
      correctiveActionApprovedBy: '',
      safetyOfficerInCharge: '',
      correctiveActionImplementedOn: '',
    });
  };

  const sectionCount = (key: string) =>
    completion.totals.find((section) => section.key === key);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {storedDraft && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-sm">Draft restored from this device.</span>
          <button
            type="button"
            onClick={handleClearDraft}
            className="text-sm text-blue-900 underline hover:text-blue-700"
          >
            Clear draft
          </button>
        </div>
      )}

      <div className="bg-white border border-blue-100 rounded px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-blue-900">Form completion</p>
          <span className="text-sm text-blue-700">{completion.percent}%</span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-blue-100">
          <div
            className="h-2 rounded-full bg-blue-700 transition-all"
            style={{ width: `${completion.percent}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-blue-700">
          {completion.totals.map((section) => (
            <span
              key={section.key}
              className="rounded-full bg-blue-50 px-3 py-1"
            >
              {section.label}: {section.filled}/{section.total}
            </span>
          ))}
        </div>
      </div>

      {savePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded bg-white p-5 sm:p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900">Save your report</h3>
            <p className="mt-2 text-sm text-gray-600">
              Would you like to download a copy of this incident report?
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleDownloadPdf(savePrompt.data)}
                className="bg-blue-900 text-white px-4 py-2 rounded font-semibold hover:bg-blue-800 w-full sm:w-auto"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => handleDownloadWord(savePrompt.data)}
                className="bg-gray-700 text-white px-4 py-2 rounded font-semibold hover:bg-gray-800 w-full sm:w-auto"
              >
                Download Word
              </button>
              <button
                type="button"
                onClick={handleSkipSave}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded font-semibold hover:bg-gray-300 w-full sm:w-auto"
              >
                Skip
              </button>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleSavedAndContinue}
                className="text-sm text-blue-900 underline hover:text-blue-700"
              >
                Continue to incident reports
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reporter Information */}
      <div className={sectionClass}>
        <div className={`${sectionHeaderClass} flex items-center justify-between`}>
          <span>Reporter Information</span>
          {sectionCount('reporter') && (
            <span className="text-xs text-blue-100">
              {sectionCount('reporter')?.filled}/{sectionCount('reporter')?.total}
            </span>
          )}
        </div>
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Reporter Name *</label>
            <input {...register('reporterName')} className={inputClass} />
            {errors.reporterName && <p className={errorClass}>{errors.reporterName.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Date of Incident *</label>
            <input type="date" {...register('dateOfIncident')} className={inputClass} />
            {errors.dateOfIncident && (
              <p className={errorClass}>{errors.dateOfIncident.message}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Time of Incident *</label>
            <input type="time" {...register('timeOfIncident')} className={inputClass} />
            {errors.timeOfIncident && (
              <p className={errorClass}>{errors.timeOfIncident.message}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Location of Incident *</label>
            <input {...register('locationOfIncident')} className={inputClass} />
            {errors.locationOfIncident && (
              <p className={errorClass}>{errors.locationOfIncident.message}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Incident Reported By *</label>
            <input {...register('incidentReportedBy')} className={inputClass} />
            {errors.incidentReportedBy && (
              <p className={errorClass}>{errors.incidentReportedBy.message}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Phone Number of Reporter *</label>
            <input type="tel" {...register('phoneNumberOfReporter')} className={inputClass} />
            {errors.phoneNumberOfReporter && (
              <p className={errorClass}>{errors.phoneNumberOfReporter.message}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Date Reported *</label>
            <input type="date" {...register('dateReported')} className={inputClass} />
            {errors.dateReported && <p className={errorClass}>{errors.dateReported.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Incident Reported To *</label>
            <input {...register('incidentReportedTo')} className={inputClass} />
            {errors.incidentReportedTo && (
              <p className={errorClass}>{errors.incidentReportedTo.message}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Phone No. Where/Who Incident Reported *</label>
            <input type="tel" {...register('phoneWhereReported')} className={inputClass} />
            {errors.phoneWhereReported && (
              <p className={errorClass}>{errors.phoneWhereReported.message}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Date of Incident Reported *</label>
            <input type="date" {...register('dateOfIncidentReported')} className={inputClass} />
            {errors.dateOfIncidentReported && (
              <p className={errorClass}>{errors.dateOfIncidentReported.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Incident Details */}
      <div className={sectionClass}>
        <div className={`${sectionHeaderClass} flex items-center justify-between`}>
          <span>Incident Details</span>
          {sectionCount('details') && (
            <span className="text-xs text-blue-100">
              {sectionCount('details')?.filled}/{sectionCount('details')?.total}
            </span>
          )}
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          <div>
            <label className={labelClass}>What Kind of Incident? *</label>
            <select {...register('incidentType')} className={inputClass}>
              {incidentTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.incidentType && <p className={errorClass}>{errors.incidentType.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Description of Incident *</label>
            <textarea {...register('descriptionOfIncident')} rows={4} className={inputClass} />
            {errors.descriptionOfIncident && (
              <p className={errorClass}>{errors.descriptionOfIncident.message}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>List of People Involved *</label>
            <textarea {...register('peopleInvolved')} rows={3} className={inputClass} />
            {errors.peopleInvolved && (
              <p className={errorClass}>{errors.peopleInvolved.message}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>
              Corrective Action Taken at the Time of the Incident *
            </label>
            <textarea {...register('correctiveActionTaken')} rows={3} className={inputClass} />
            {errors.correctiveActionTaken && (
              <p className={errorClass}>{errors.correctiveActionTaken.message}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Action Taken to Avoid Future Similar Incident *</label>
            <textarea {...register('actionToAvoidFuture')} rows={3} className={inputClass} />
            {errors.actionToAvoidFuture && (
              <p className={errorClass}>{errors.actionToAvoidFuture.message}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Additional Comments / Remarks</label>
            <textarea {...register('additionalComments')} rows={3} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Photo Uploads */}
      <div className={sectionClass}>
        <div className={sectionHeaderClass}>Photo Evidence</div>
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PhotoUpload label="Sample 1" onFileSelect={(f) => setPhoto1(f)} />
          <PhotoUpload label="Sample 2" onFileSelect={(f) => setPhoto2(f)} />
          <PhotoUpload label="Sample 3" onFileSelect={(f) => setPhoto3(f)} />
        </div>
      </div>

      {/* Approvals */}
      <div className={sectionClass}>
        <div className={`${sectionHeaderClass} flex items-center justify-between`}>
          <span>Approvals & Signatures</span>
          {sectionCount('approvals') && (
            <span className="text-xs text-blue-100">
              {sectionCount('approvals')?.filled}/{sectionCount('approvals')?.total}
            </span>
          )}
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Corrective Action Approved By *</label>
              <input {...register('correctiveActionApprovedBy')} className={inputClass} />
              {errors.correctiveActionApprovedBy && (
                <p className={errorClass}>{errors.correctiveActionApprovedBy.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Safety Officer in Charge *</label>
              <input {...register('safetyOfficerInCharge')} className={inputClass} />
              {errors.safetyOfficerInCharge && (
                <p className={errorClass}>{errors.safetyOfficerInCharge.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Corrective Action Implemented On *</label>
              <input
                type="date"
                {...register('correctiveActionImplementedOn')}
                className={inputClass}
              />
              {errors.correctiveActionImplementedOn && (
                <p className={errorClass}>{errors.correctiveActionImplementedOn.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SignaturePad
              label="Corrective Action Approver Signature"
              onSave={(url) => setCorrectiveSigDataUrl(url)}
              onClear={() => setCorrectiveSigDataUrl('')}
            />
            <SignaturePad
              label="Safety Officer Signature"
              onSave={(url) => setSafetySigDataUrl(url)}
              onClear={() => setSafetySigDataUrl('')}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-900 text-white px-8 py-3 rounded font-semibold hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Submit Incident Report'}
        </button>
      </div>
    </form>
  );
}
