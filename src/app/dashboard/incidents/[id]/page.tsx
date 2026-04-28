'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import AuthGuard from '@/components/AuthGuard';
import { getIncident } from '@/lib/firestore';
import { Incident } from '@/types/incident';

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="py-2 border-b border-gray-100 last:border-0">
      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-gray-800">{value || '-'}</dd>
    </div>
  );
}

function IncidentDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getIncident(id);
        if (!data) {
          setError('Incident not found');
        } else {
          setIncident(data);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load incident');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const formatDate = (ts: unknown) => {
    if (!ts) return '-';
    try {
      const date =
        ts && typeof ts === 'object' && 'toDate' in ts
          ? (ts as { toDate: () => Date }).toDate()
          : new Date(ts as string);
      return format(date, 'MMM dd, yyyy hh:mm a');
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
          {error || 'Incident not found'}
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-4 text-blue-600 hover:underline text-sm"
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const sectionClass = 'bg-white rounded-lg border border-gray-200 overflow-hidden mb-4';
  const headerClass = 'bg-blue-900 text-white text-sm font-bold px-4 py-2';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">{incident.incidentId}</h1>
          <p className="text-sm text-gray-500">Submitted: {formatDate(incident.createdAt)}</p>
        </div>
      </div>

      <div className={sectionClass}>
        <div className={headerClass}>Reporter Information</div>
        <dl className="px-4 divide-y divide-gray-100">
          <Field label="Reporter Name" value={incident.reporterName} />
          <Field label="Date of Incident" value={incident.dateOfIncident} />
          <Field label="Time of Incident" value={incident.timeOfIncident} />
          <Field label="Location of Incident" value={incident.locationOfIncident} />
          <Field label="Incident Reported By" value={incident.incidentReportedBy} />
          <Field label="Phone Number of Reporter" value={incident.phoneNumberOfReporter} />
          <Field label="Date Reported" value={incident.dateReported} />
          <Field label="Incident Reported To" value={incident.incidentReportedTo} />
          <Field label="Phone No. Where Reported" value={incident.phoneWhereReported} />
          <Field label="Date of Incident Reported" value={incident.dateOfIncidentReported} />
        </dl>
      </div>

      <div className={sectionClass}>
        <div className={headerClass}>Incident Details</div>
        <dl className="px-4 divide-y divide-gray-100">
          <Field label="Type of Incident" value={incident.incidentType} />
          <Field label="Description of Incident" value={incident.descriptionOfIncident} />
          <Field label="People Involved" value={incident.peopleInvolved} />
          <Field label="Corrective Action Taken" value={incident.correctiveActionTaken} />
          <Field label="Action to Avoid Future Incident" value={incident.actionToAvoidFuture} />
          <Field label="Additional Comments" value={incident.additionalComments} />
        </dl>
      </div>

      <div className={sectionClass}>
        <div className={headerClass}>Approvals</div>
        <dl className="px-4 divide-y divide-gray-100">
          <Field
            label="Corrective Action Approved By"
            value={incident.correctiveActionApprovedBy}
          />
          <Field label="Safety Officer in Charge" value={incident.safetyOfficerInCharge} />
          <Field
            label="Corrective Action Implemented On"
            value={incident.correctiveActionImplementedOn}
          />
        </dl>
      </div>

      {(incident.correctiveSignatureUrl || incident.safetySignatureUrl) && (
        <div className={sectionClass}>
          <div className={headerClass}>Signatures</div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {incident.correctiveSignatureUrl && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Corrective Action Approver
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={incident.correctiveSignatureUrl}
                  alt="Corrective Action Signature"
                  className="border border-gray-200 rounded max-h-32"
                />
              </div>
            )}
            {incident.safetySignatureUrl && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Safety Officer
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={incident.safetySignatureUrl}
                  alt="Safety Officer Signature"
                  className="border border-gray-200 rounded max-h-32"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {(incident.sample1Url || incident.sample2Url || incident.sample3Url) && (
        <div className={sectionClass}>
          <div className={headerClass}>Photo Evidence</div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {incident.sample1Url && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Sample 1</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={incident.sample1Url}
                  alt="Sample 1"
                  className="w-full rounded border border-gray-200 object-cover max-h-40"
                />
              </div>
            )}
            {incident.sample2Url && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Sample 2</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={incident.sample2Url}
                  alt="Sample 2"
                  className="w-full rounded border border-gray-200 object-cover max-h-40"
                />
              </div>
            )}
            {incident.sample3Url && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Sample 3</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={incident.sample3Url}
                  alt="Sample 3"
                  className="w-full rounded border border-gray-200 object-cover max-h-40"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function IncidentDetailPage() {
  return (
    <AuthGuard>
      <IncidentDetailContent />
    </AuthGuard>
  );
}
