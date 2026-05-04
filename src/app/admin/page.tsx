'use client';

import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';

export default function AdminPage() {
  return (
    <AdminGuard>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">Admin Panel</h1>
            <p className="text-sm text-gray-600">
              Admin-only area for managing incident reports.
            </p>
          </div>
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-sm text-gray-700">
            Add admin tools here (user management, exports, approvals, and audit logs).
          </p>
        </div>
      </div>
    </AdminGuard>
  );
}
