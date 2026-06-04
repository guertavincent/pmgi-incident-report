'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import AdminGuard from '@/components/AdminGuard';
import { addIncidentComment, getAllIncidents, updateIncident } from '@/lib/firestore';
import { Incident } from '@/types/incident';
import { useAuthState } from '@/hooks/useAuthState';

function AdminDashboardContent() {
  const { user } = useAuthState();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterType, setFilterType] = useState('');
  const [cardState, setCardState] = useState<
    Record<
      string,
      {
        status: 'Open' | 'In Review' | 'Resolved';
        assignedToName: string;
        assignedToEmail: string;
        commentText: string;
        saving: boolean;
      }
    >
  >({});

  const filtersKey = 'incidentFilters:admin';

  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = localStorage.getItem(filtersKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as {
            dateFrom?: string;
            dateTo?: string;
            location?: string;
            type?: string;
          };
          setFilterDateFrom(parsed.dateFrom ?? '');
          setFilterDateTo(parsed.dateTo ?? '');
          setFilterLocation(parsed.location ?? '');
          setFilterType(parsed.type ?? '');
        } catch {
          localStorage.removeItem(filtersKey);
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getAllIncidents({
          dateFrom: filterDateFrom || undefined,
          dateTo: filterDateTo || undefined,
          type: filterType || undefined,
        });
        setIncidents(data);
        setCardState((prev) => {
          const next = { ...prev };
          data.forEach((incident) => {
            if (!incident.id) return;
            if (!next[incident.id]) {
              next[incident.id] = {
                status: (incident.status ?? 'Open') as 'Open' | 'In Review' | 'Resolved',
                assignedToName: incident.assignedToName ?? '',
                assignedToEmail: incident.assignedToEmail ?? '',
                commentText: '',
                saving: false,
              };
            }
          });
          return next;
        });
      } catch (err) {
        console.error('Failed to fetch incidents:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filterDateFrom, filterDateTo, filterLocation, filterType]);

  const updateCardState = (
    id: string,
    updates: Partial<{
      status: 'Open' | 'In Review' | 'Resolved';
      assignedToName: string;
      assignedToEmail: string;
      commentText: string;
      saving: boolean;
    }>
  ) => {
    setCardState((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...updates },
    }));
  };

  const handleSaveCard = async (incident: Incident) => {
    if (!incident.id) return;
    const state = cardState[incident.id];
    if (!state) return;
    updateCardState(incident.id, { saving: true });
    try {
      await updateIncident(incident.id, {
        status: state.status,
        assignedToName: state.assignedToName.trim(),
        assignedToEmail: state.assignedToEmail.trim(),
      });
    } catch (err) {
      console.error('Failed to update incident:', err);
    } finally {
      updateCardState(incident.id, { saving: false });
    }
  };

  const handleAddCardComment = async (incident: Incident) => {
    if (!incident.id || !user) return;
    const state = cardState[incident.id];
    if (!state) return;
    const trimmed = state.commentText.trim();
    if (!trimmed) return;
    updateCardState(incident.id, { saving: true });
    try {
      await addIncidentComment(incident.id, {
        authorUid: user.uid,
        authorEmail: user.email || 'admin',
        text: trimmed,
      });
      updateCardState(incident.id, { commentText: '' });
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      updateCardState(incident.id, { saving: false });
    }
  };

  useEffect(() => {
    localStorage.setItem(
      filtersKey,
      JSON.stringify({
        dateFrom: filterDateFrom,
        dateTo: filterDateTo,
        location: filterLocation,
        type: filterType,
      })
    );
  }, [filterDateFrom, filterDateTo, filterLocation, filterType]);

  const filtered = useMemo(() => {
    let result = incidents;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.incidentId.toLowerCase().includes(query) ||
          i.reporterName.toLowerCase().includes(query)
      );
    }
    if (filterLocation) {
      result = result.filter((i) =>
        i.locationOfIncident.toLowerCase().includes(filterLocation.toLowerCase())
      );
    }
    if (filterType) {
      result = result.filter((i) => i.incidentType === filterType);
    }
    return result;
  }, [incidents, searchQuery, filterLocation, filterType]);

  const downloadCsv = () => {
    const headers = [
      'Incident ID',
      'Status',
      'Date of Incident',
      'Type',
      'Location',
      'Reporter',
      'Assigned To',
      'Date Reported',
    ];

    const rows = filtered.map((incident) => [
      incident.incidentId,
      incident.status ?? 'Open',
      incident.dateOfIncident,
      incident.incidentType,
      incident.locationOfIncident,
      incident.reporterName,
      incident.assignedToName || incident.assignedToEmail || '',
      formatDate(incident.createdAt),
    ]);

    const escapeCsv = (value: string) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsv(String(value))).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'incident-reports-admin.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (ts: unknown) => {
    if (!ts) return '-';
    try {
      const date =
        ts && typeof ts === 'object' && 'toDate' in ts
          ? (ts as { toDate: () => Date }).toDate()
          : new Date(ts as string);
      return format(date, 'MMM dd, yyyy');
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Loading incidents...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-blue-900">Incident Report</h1>
          <p className="text-sm text-gray-600">All incident reports.</p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          className="border border-blue-900 text-blue-900 px-4 py-2 rounded font-medium hover:bg-blue-50 text-sm"
        >
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">Search & Filter</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            placeholder="Search by Incident ID or Reporter"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="date"
            placeholder="Date From"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="date"
            placeholder="Date To"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            placeholder="Filter by Location"
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Types</option>
            <option value="Injury">Injury</option>
            <option value="Near Miss">Near Miss</option>
            <option value="Property Damage">Property Damage</option>
            <option value="Vehicle">Vehicle</option>
            <option value="Security">Security</option>
            <option value="Equipment">Equipment</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500">
            No incidents found
          </div>
        ) : (
          filtered.map((incident) => (
            <div
              key={incident.id}
              className="bg-white rounded-lg border border-gray-200 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-blue-900">{incident.incidentId}</p>
                  <p className="text-xs text-gray-500">{incident.incidentType}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800">
                  {incident.status ?? 'Open'}
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>
                  <span className="font-semibold text-gray-700">Date:</span>{' '}
                  {incident.dateOfIncident}
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Location:</span>{' '}
                  {incident.locationOfIncident}
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Reporter:</span>{' '}
                  {incident.reporterName}
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Assigned:</span>{' '}
                  {incident.assignedToName || incident.assignedToEmail || '-'}
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Reported:</span>{' '}
                  {formatDate(incident.createdAt)}
                </p>
              </div>
              {incident.id && cardState[incident.id] && (
                <div className="border-t border-gray-200 pt-3 space-y-3">
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs font-semibold text-gray-600">Status</label>
                    <select
                      value={cardState[incident.id].status}
                      onChange={(e) =>
                        updateCardState(incident.id as string, {
                          status: e.target.value as 'Open' | 'In Review' | 'Resolved',
                        })
                      }
                      className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="Open">Open</option>
                      <option value="In Review">In Review</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs font-semibold text-gray-600">Assigned To (Name)</label>
                    <input
                      value={cardState[incident.id].assignedToName}
                      onChange={(e) =>
                        updateCardState(incident.id as string, {
                          assignedToName: e.target.value,
                        })
                      }
                      className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs font-semibold text-gray-600">Assigned To (Email)</label>
                    <input
                      value={cardState[incident.id].assignedToEmail}
                      onChange={(e) =>
                        updateCardState(incident.id as string, {
                          assignedToEmail: e.target.value,
                        })
                      }
                      className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveCard(incident)}
                    disabled={cardState[incident.id].saving}
                    className="bg-blue-900 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-blue-800 disabled:opacity-60"
                  >
                    Save changes
                  </button>
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Add comment</label>
                    <textarea
                      rows={3}
                      value={cardState[incident.id].commentText}
                      onChange={(e) =>
                        updateCardState(incident.id as string, {
                          commentText: e.target.value,
                        })
                      }
                      className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCardComment(incident)}
                      disabled={cardState[incident.id].saving}
                      className="mt-2 w-full bg-gray-800 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-gray-700 disabled:opacity-60"
                    >
                      Add comment
                    </button>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/dashboard/incidents/${incident.id}`}
                  className="inline-flex text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  View details
                </Link>
                <Link
                  href={`/dashboard/incidents/${incident.id}?download=1`}
                  className="inline-flex text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Download PDF
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden sm:block bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Incident ID</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="hidden sm:table-cell px-4 py-3 text-left font-semibold">
                  Date of Incident
                </th>
                <th className="hidden md:table-cell px-4 py-3 text-left font-semibold">
                  Location
                </th>
                <th className="hidden md:table-cell px-4 py-3 text-left font-semibold">
                  Reporter
                </th>
                <th className="hidden lg:table-cell px-4 py-3 text-left font-semibold">
                  Assigned To
                </th>
                <th className="hidden lg:table-cell px-4 py-3 text-left font-semibold">
                  Date Reported
                </th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No incidents found
                  </td>
                </tr>
              ) : (
                filtered.map((incident, idx) => (
                  <tr
                    key={incident.id}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className="px-4 py-3 font-mono font-medium text-blue-700">
                      {incident.incidentId}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800">
                        {incident.status ?? 'Open'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{incident.incidentType}</td>
                    <td className="hidden sm:table-cell px-4 py-3">
                      {incident.dateOfIncident}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3">
                      {incident.locationOfIncident}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3">
                      {incident.reporterName}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3">
                      {incident.assignedToName || incident.assignedToEmail || '-'}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3">
                      {formatDate(incident.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/incidents/${incident.id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-sm text-gray-500 mt-3">
        Showing {filtered.length} of {incidents.length} incidents
      </p>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
}
