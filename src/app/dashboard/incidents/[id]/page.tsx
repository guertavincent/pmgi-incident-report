'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import AuthGuard from '@/components/AuthGuard';
import { addIncidentComment, getIncident, updateIncident } from '@/lib/firestore';
import { Incident } from '@/types/incident';
import { useAuthState } from '@/hooks/useAuthState';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const searchParams = useSearchParams();
  const id = params.id as string;
  const { user, role } = useAuthState();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'Open' | 'In Review' | 'Resolved'>('Open');
  const [assignedToName, setAssignedToName] = useState('');
  const [assignedToEmail, setAssignedToEmail] = useState('');
  const [commentText, setCommentText] = useState('');
  const [saving, setSaving] = useState(false);
  const downloadOnce = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getIncident(id);
        if (!data) {
          setError('Incident not found');
        } else {
          setIncident(data);
          setStatus((data.status ?? 'Open') as 'Open' | 'In Review' | 'Resolved');
          setAssignedToName(data.assignedToName ?? '');
          setAssignedToEmail(data.assignedToEmail ?? '');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load incident');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleDownloadPdf = async (data: Incident) => {
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

    const fetchDataUrl = async (url: string) => {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(new Error('Failed to read image data'));
        reader.readAsDataURL(blob);
      });
    };

    const loadImageData = async (url: string) => {
      const dataUrl = await fetchDataUrl(url);
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
      left: { label: string; url?: string },
      middle?: { label: string; url?: string },
      right?: { label: string; url?: string }
    ) => {
      const leftData = left.url ? await loadImageData(left.url) : null;
      const middleData = middle?.url ? await loadImageData(middle.url) : null;
      const rightData = right?.url ? await loadImageData(right.url) : null;
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
      if (leftData) doc.text(left.label, leftMargin + 2, cursorY + 6);
      if (middleData && middle) {
        doc.text(middle.label, leftMargin + maxWidth + gap + 4, cursorY + 6);
      }
      if (rightData && right) {
        doc.text(
          right.label,
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

    const rows: Array<[string, string]> = [
      ['REPORTER NAME', data.reporterName || '-'],
      ['DATE OF INCIDENT', data.dateOfIncident || '-'],
      ['TIME OF INCIDENT', data.timeOfIncident || '-'],
      ['LOCATION OF INCIDENT', data.locationOfIncident || '-'],
      ['INCIDENT REPORTED BY', data.incidentReportedBy || '-'],
      ['PHONE NUMBER OF REPORTER', data.phoneNumberOfReporter || '-'],
      ['DATE REPORTED', data.dateReported || '-'],
      ['INCIDENT REPORTED TO', data.incidentReportedTo || '-'],
      ['PHONE NO. WHERE REPORTED', data.phoneWhereReported || '-'],
      ['DATE OF INCIDENT REPORTED', data.dateOfIncidentReported || '-'],
      ['TYPE OF INCIDENT', data.incidentType || '-'],
      ['DESCRIPTION OF INCIDENT', data.descriptionOfIncident || '-'],
      ['PEOPLE INVOLVED', data.peopleInvolved || '-'],
      ['CORRECTIVE ACTION TAKEN', data.correctiveActionTaken || '-'],
      ['ACTION TO AVOID FUTURE INCIDENT', data.actionToAvoidFuture || '-'],
      ['ADDITIONAL COMMENTS', data.additionalComments || '-'],
      ['CORRECTIVE ACTION APPROVED BY', data.correctiveActionApprovedBy || '-'],
      ['SAFETY OFFICER IN CHARGE', data.safetyOfficerInCharge || '-'],
      ['CORRECTIVE ACTION IMPLEMENTED ON', data.correctiveActionImplementedOn || '-'],
    ];

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
      body: rows,
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

    const signatureSection = data.correctiveSignatureUrl || data.safetySignatureUrl;
    if (signatureSection) {
      addSectionHeader('SIGNATURES');
      await addSignatureRow(data.correctiveSignatureUrl, data.safetySignatureUrl);
    }

    const photoSection = data.sample1Url || data.sample2Url || data.sample3Url;
    if (photoSection) {
      ensureSpace(12 + 18 + 40 + 8);
      addSectionHeader('PHOTO EVIDENCE');
      await addPhotoRow(
        { label: 'Photo Evidence 1', url: data.sample1Url },
        { label: 'Photo Evidence 2', url: data.sample2Url },
        { label: 'Photo Evidence 3', url: data.sample3Url }
      );
    }

    const safeId = data.incidentId || data.id || 'Incident_Report';
    doc.save(`${safeId}.pdf`);
  };

  useEffect(() => {
    const shouldDownload = searchParams.get('download') === '1';
    if (!shouldDownload || !incident || downloadOnce.current) return;
    downloadOnce.current = true;
    void handleDownloadPdf(incident);
  }, [incident, searchParams]);

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
          {error || 'Incident not found'}
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-4 text-blue-600 hover:underline text-sm"
        >
          ← Back to Incident Reports
        </button>
      </div>
    );
  }

  const sectionClass = 'bg-white rounded-lg border border-gray-200 overflow-hidden mb-4';
  const headerClass = 'bg-blue-900 text-white text-sm font-bold px-4 py-2';

  const handleSaveWorkflow = async () => {
    if (!incident || role !== 'admin') return;
    setSaving(true);
    try {
      await updateIncident(incident.id as string, {
        status,
        assignedToName: assignedToName.trim(),
        assignedToEmail: assignedToEmail.trim(),
      });
      setIncident({
        ...incident,
        status,
        assignedToName: assignedToName.trim(),
        assignedToEmail: assignedToEmail.trim(),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update incident');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!incident || role !== 'admin' || !user) return;
    const trimmed = commentText.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await addIncidentComment(incident.id as string, {
        authorUid: user.uid,
        authorEmail: user.email || 'admin',
        text: trimmed,
      });
      setIncident({
        ...incident,
        comments: [
          ...(incident.comments ?? []),
          { authorUid: user.uid, authorEmail: user.email || 'admin', text: trimmed, createdAt: null },
        ],
      });
      setCommentText('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
          ← Back to Incident Reports
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-blue-900">
            {incident.incidentId}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800">
              {incident.status ?? 'Open'}
            </span>
            <span className="text-sm text-gray-500">
              Submitted: {formatDate(incident.createdAt)}
            </span>
            {(incident.assignedToName || incident.assignedToEmail) && (
              <span className="text-sm text-gray-500">
                Assigned: {incident.assignedToName || incident.assignedToEmail}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleDownloadPdf(incident)}
          className="bg-blue-900 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-blue-800 w-full sm:w-auto"
        >
          Download PDF
        </button>
      </div>

      {role === 'admin' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Admin workflow</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Open' | 'In Review' | 'Resolved')}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="Open">Open</option>
                <option value="In Review">In Review</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Assigned To (Name)</label>
              <input
                value={assignedToName}
                onChange={(e) => setAssignedToName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Assigned To (Email)</label>
              <input
                value={assignedToEmail}
                onChange={(e) => setAssignedToEmail(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleSaveWorkflow}
              disabled={saving}
              className="bg-blue-900 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-blue-800 disabled:opacity-60"
            >
              Save changes
            </button>
          </div>
        </div>
      )}

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

      <div className={sectionClass}>
        <div className={headerClass}>Comments</div>
        <div className="p-4 space-y-3">
          {(incident.comments ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">No comments yet.</p>
          ) : (
            <div className="space-y-3">
              {(incident.comments ?? []).map((comment, idx) => (
                <div key={`${comment.authorUid}-${idx}`} className="rounded border border-gray-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-600">
                      {comment.authorEmail}
                    </p>
                    <span className="text-xs text-gray-400">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                    {comment.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {role === 'admin' && (
            <div className="mt-3">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Add comment
              </label>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={saving}
                  className="bg-blue-900 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-blue-800 disabled:opacity-60"
                >
                  Add comment
                </button>
              </div>
            </div>
          )}
        </div>
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