'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import AdminGuard from '@/components/AdminGuard';
import { getAllIncidents } from '@/lib/firestore';
import { Incident } from '@/types/incident';

function AdminDashboardContent() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getAllIncidents();
        setIncidents(data);
      } catch (err) {
        console.error('Failed to fetch incidents:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
    if (filterDateFrom) {
      result = result.filter((i) => i.dateOfIncident >= filterDateFrom);
    }
    if (filterDateTo) {
      result = result.filter((i) => i.dateOfIncident <= filterDateTo);
    }
    if (filterLocation) {
      result = result.filter((i) =>
        i.locationOfIncident.toLowerCase().includes(filterLocation.toLowerCase())
      );
    }
    if (filterType) {
      result = result.filter((i) =>
        i.incidentType.toLowerCase().includes(filterType.toLowerCase())
      );
    }
    return result;
  }, [incidents, searchQuery, filterDateFrom, filterDateTo, filterLocation, filterType]);

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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-600">All incident reports.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">Search & Filter</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
          <input
            placeholder="Filter by Type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Incident ID</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Date of Incident</th>
                <th className="px-4 py-3 text-left font-semibold">Location</th>
                <th className="px-4 py-3 text-left font-semibold">Reporter</th>
                <th className="px-4 py-3 text-left font-semibold">Date Reported</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
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
                    <td className="px-4 py-3">{incident.incidentType}</td>
                    <td className="px-4 py-3">{incident.dateOfIncident}</td>
                    <td className="px-4 py-3">{incident.locationOfIncident}</td>
                    <td className="px-4 py-3">{incident.reporterName}</td>
                    <td className="px-4 py-3">{formatDate(incident.createdAt)}</td>
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
