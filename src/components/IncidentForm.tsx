'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/useAuthState';
import { submitIncident, updateIncidentFiles } from '@/lib/firestore';
import { uploadFile, uploadSignature } from '@/lib/storage';
import { Incident } from '@/types/incident';

// --- PDF LIBRARIES ADDED ---
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import SignaturePad from './SignaturePad';
import PhotoUpload from './PhotoUpload';

const incidentSchema = z.object({
  reporterName: z.string().min(1, 'Required'),
  dateOfIncident: z.string().min(1, 'Required'),
  timeOfIncident: z.string().min(1, 'Required'),
  locationOfIncident: z.string().min(1, 'Required'),
  incidentReportedBy: z.string().min(1, 'Required'),
  phoneNumberOfReporter: z.string().min(1, 'Required'),
  dateReported: z.string().min(1, 'Required'),
  incidentReportedTo: z.string().min(1, 'Required'),
  phoneWhereReported: z.string().min(1, 'Required'),
  dateOfIncidentReported: z.string().min(1, 'Required'),
  incidentType: z.string().min(1, 'Required'),
  descriptionOfIncident: z.string().min(1, 'Required'),
  peopleInvolved: z.string().min(1, 'Required'),
  correctiveActionTaken: z.string().min(1, 'Required'),
  actionToAvoidFuture: z.string().min(1, 'Required'),
  additionalComments: z.string(),
  correctiveActionApprovedBy: z.string().min(1, 'Required'),
  safetyOfficerInCharge: z.string().min(1, 'Required'),
  correctiveActionImplementedOn: z.string().min(1, 'Required'),
});

type IncidentFormData = z.infer<typeof incidentSchema>;

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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
  });

  // --- PDF GENERATION HELPERS START ---
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const addWatermark = (doc: jsPDF) => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setTextColor(220, 220, 220); // Very light gray
      doc.setFontSize(60);
      doc.setFont('helvetica', 'bold');
      doc.saveGraphicsState();
      doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
      doc.text('CONFIDENTIAL', 105, 150, { align: 'center', angle: 45 });
      doc.restoreGraphicsState();
    }
  };

  const handleDownloadPDF = async (data: IncidentFormData) => {
    const doc = new jsPDF();
    const pmgiBlue = [26, 54, 104];

    // Header Background
    doc.setFillColor(26, 54, 104);
    doc.rect(0, 0, 210, 30, 'F');

    // Company Logo (from public folder)
    try {
      doc.addImage('/pmgi-logo.png', 'PNG', 10, 5, 20, 20);
    } catch (e) {
      console.warn("Logo not found in /public/pmgi-logo.png");
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('PROFESSIONAL MAINTENANCE GROUP INC.', 35, 15);
    doc.setFontSize(10);
    doc.text('INCIDENT REPORT SUMMARY', 35, 22);

    // Form Data Table
    (doc as any).autoTable({
      startY: 35,
      head: [[{ content: 'REPORT DETAILS', colSpan: 2, styles: { fillColor: pmgiBlue } }]],
      body: [
        ['Reporter Name', data.reporterName],
        ['Date/Time of Incident', `${data.dateOfIncident} ${data.timeOfIncident}`],
        ['Location', data.locationOfIncident],
        ['Incident Type', data.incidentType],
        ['Description', data.descriptionOfIncident],
        ['People Involved', data.peopleInvolved],
        ['Corrective Action', data.correctiveActionTaken],
      ],
      theme: 'grid',
    });

    // Add Photos
    let currentY = (doc as any).lastAutoTable.finalY + 10;
    const photos = [photo1, photo2, photo3].filter(Boolean) as File[];
    if (photos.length > 0) {
      doc.setTextColor(0, 0, 0);
      doc.text('PHOTO EVIDENCE:', 14, currentY);
      let xOffset = 14;
      for (const p of photos) {
        const b64 = await fileToBase64(p);
        doc.addImage(b64, 'JPEG', xOffset, currentY + 5, 50, 35);
        xOffset += 60;
      }
      currentY += 50;
    }

    // Signatures
    if (currentY > 240) { doc.addPage(); currentY = 20; }
    (doc as any).autoTable({
      startY: currentY,
      head: [[{ content: 'APPROVALS', colSpan: 2, styles: { fillColor: pmgiBlue } }]],
      body: [
        ['Approved By', data.correctiveActionApprovedBy],
        ['Safety Officer', data.safetyOfficerInCharge],
      ],
    });

    const sigY = (doc as any).lastAutoTable.finalY + 5;
    if (correctiveSigDataUrl) doc.addImage(correctiveSigDataUrl, 'PNG', 14, sigY, 40, 15);
    if (safetySigDataUrl) doc.addImage(safetySigDataUrl, 'PNG', 105, sigY, 40, 15);

    addWatermark(doc);
    doc.save(`PMGI_Report_${data.dateOfIncident}.pdf`);
  };
  // --- PDF GENERATION HELPERS END ---

  const onSubmit = useCallback(
    async (data: IncidentFormData) => {
      if (!user) return;
      setSubmitting(true);
      setError('');
      try {
        const incidentDocId = await submitIncident({
          ...data,
          additionalComments: data.additionalComments ?? '',
          submittedBy: user.uid,
          submittedByEmail: user.email || '',
        });

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
        if (correctiveSigDataUrl) fileUpdates.correctiveSignatureUrl = await uploadSignature(correctiveSigDataUrl, incidentDocId, 'corrective-sig.png');
        if (safetySigDataUrl) fileUpdates.safetySignatureUrl = await uploadSignature(safetySigDataUrl, incidentDocId, 'safety-sig.png');

        if (Object.keys(fileUpdates).length > 0) {
          await updateIncidentFiles(incidentDocId, fileUpdates);
        }
        router.push(`/dashboard/incidents/${incidentDocId}`);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to submit incident report');
      } finally {
        setSubmitting(false);
      }
    },
    [user, photo1, photo2, photo3, correctiveSigDataUrl, safetySigDataUrl, router]
  );

  const inputClass = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';
  const labelClass = 'block text-sm font-semibold text-gray-700 mb-1';
  const errorClass = 'text-red-500 text-xs mt-1';
  const sectionClass = 'border border-gray-400 rounded mb-4 overflow-hidden';
  const sectionHeaderClass = 'bg-blue-900 text-white text-sm font-bold px-4 py-2';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* --- ALL ORIGINAL FORM SECTIONS PRESERVED --- */}
      <div className={sectionClass}>
        <div className={sectionHeaderClass}>Reporter Information</div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Reporter Name *</label>
            <input {...register('reporterName')} className={inputClass} />
            {errors.reporterName && <p className={errorClass}>{errors.reporterName.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Date of Incident *</label>
            <input type="date" {...register('dateOfIncident')} className={inputClass} />
            {errors.dateOfIncident && <p className={errorClass}>{errors.dateOfIncident.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Time of Incident *</label>
            <input type="time" {...register('timeOfIncident')} className={inputClass} />
            {errors.timeOfIncident && <p className={errorClass}>{errors.timeOfIncident.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Location of Incident *</label>
            <input {...register('locationOfIncident')} className={inputClass} />
            {errors.locationOfIncident && <p className={errorClass}>{errors.locationOfIncident.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Incident Reported By *</label>
            <input {...register('incidentReportedBy')} className={inputClass} />
            {errors.incidentReportedBy && <p className={errorClass}>{errors.incidentReportedBy.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Phone Number of Reporter *</label>
            <input type="tel" {...register('phoneNumberOfReporter')} className={inputClass} />
            {errors.phoneNumberOfReporter && <p className={errorClass}>{errors.phoneNumberOfReporter.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Date Reported *</label>
            <input type="date" {...register('dateReported')} className={inputClass} />
            {errors.dateReported && <p className={errorClass}>{errors.dateReported.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Incident Reported To *</label>
            <input {...register('incidentReportedTo')} className={inputClass} />
            {errors.incidentReportedTo && <p className={errorClass}>{errors.incidentReportedTo.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Phone No. Where/Who Incident Reported *</label>
            <input type="tel" {...register('phoneWhereReported')} className={inputClass} />
            {errors.phoneWhereReported && <p className={errorClass}>{errors.phoneWhereReported.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Date of Incident Reported *</label>
            <input type="date" {...register('dateOfIncidentReported')} className={inputClass} />
            {errors.dateOfIncidentReported && <p className={errorClass}>{errors.dateOfIncidentReported.message}</p>}
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <div className={sectionHeaderClass}>Incident Details</div>
        <div className="p-4 space-y-4">
          <div>
            <label className={labelClass}>What Kind of Incident? *</label>
            <input {...register('incidentType')} className={inputClass} />
            {errors.incidentType && <p className={errorClass}>{errors.incidentType.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Description of Incident *</label>
            <textarea {...register('descriptionOfIncident')} rows={4} className={inputClass} />
            {errors.descriptionOfIncident && <p className={errorClass}>{errors.descriptionOfIncident.message}</p>}
          </div>
          <div>
            <label className={labelClass}>List of People Involved *</label>
            <textarea {...register('peopleInvolved')} rows={3} className={inputClass} />
            {errors.peopleInvolved && <p className={errorClass}>{errors.peopleInvolved.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Corrective Action Taken *</label>
            <textarea {...register('correctiveActionTaken')} rows={3} className={inputClass} />
            {errors.correctiveActionTaken && <p className={errorClass}>{errors.correctiveActionTaken.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Action To Avoid Future Incident *</label>
            <textarea {...register('actionToAvoidFuture')} rows={3} className={inputClass} />
            {errors.actionToAvoidFuture && <p className={errorClass}>{errors.actionToAvoidFuture.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Additional Comments</label>
            <textarea {...register('additionalComments')} rows={3} className={inputClass} />
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <div className={sectionHeaderClass}>Photo Evidence</div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <PhotoUpload label="Sample 1" onFileSelect={(f) => setPhoto1(f)} />
          <PhotoUpload label="Sample 2" onFileSelect={(f) => setPhoto2(f)} />
          <PhotoUpload label="Sample 3" onFileSelect={(f) => setPhoto3(f)} />
        </div>
      </div>

      <div className={sectionClass}>
        <div className={sectionHeaderClass}>Approvals & Signatures</div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Corrective Action Approved By *</label>
              <input {...register('correctiveActionApprovedBy')} className={inputClass} />
              {errors.correctiveActionApprovedBy && <p className={errorClass}>{errors.correctiveActionApprovedBy.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Safety Officer in Charge *</label>
              <input {...register('safetyOfficerInCharge')} className={inputClass} />
              {errors.safetyOfficerInCharge && <p className={errorClass}>{errors.safetyOfficerInCharge.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Corrective Action Implemented On *</label>
              <input type="date" {...register('correctiveActionImplementedOn')} className={inputClass} />
              {errors.correctiveActionImplementedOn && <p className={errorClass}>{errors.correctiveActionImplementedOn.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SignaturePad label="Corrective Action Approver Signature" onSave={(url) => setCorrectiveSigDataUrl(url)} onClear={() => setCorrectiveSigDataUrl('')} />
            <SignaturePad label="Safety Officer Signature" onSave={(url) => setSafetySigDataUrl(url)} onClear={() => setSafetySigDataUrl('')} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        {/* --- ADDED DOWNLOAD BUTTON --- */}
        <button
          type="button"
          onClick={handleSubmit(handleDownloadPDF)}
          className="bg-gray-600 text-white px-8 py-3 rounded font-semibold hover:bg-gray-700"
        >
          Download PDF
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-900 text-white px-8 py-3 rounded font-semibold hover:bg-blue-800 disabled:opacity-60"
        >
          {submitting ? 'Submitting...' : 'Submit Incident Report'}
        </button>
      </div>
    </form>
  );
}