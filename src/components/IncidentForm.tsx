
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

        router.push(`/dashboard/incidents/${incidentDocId}`);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to submit incident report');
      } finally {
        setSubmitting(false);
      }
    },
    [user, photo1, photo2, photo3, correctiveSigDataUrl, safetySigDataUrl, router]
  );

  const inputClass =
    'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';
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

      {/* Reporter Information */}
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
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <PhotoUpload label="Sample 1" onFileSelect={(f) => setPhoto1(f)} />
          <PhotoUpload label="Sample 2" onFileSelect={(f) => setPhoto2(f)} />
          <PhotoUpload label="Sample 3" onFileSelect={(f) => setPhoto3(f)} />
        </div>
      </div>

      {/* Approvals */}
      <div className={sectionClass}>
        <div className={sectionHeaderClass}>Approvals & Signatures</div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
