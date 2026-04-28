import AuthGuard from '@/components/AuthGuard';
import IncidentForm from '@/components/IncidentForm';

export default function ReportPage() {
  return (
    <AuthGuard>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="border-b border-gray-300 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-blue-900">PMGI Incident Report</h1>
            <p className="text-sm text-gray-500 mt-1">
              Please fill out all required fields marked with *
            </p>
          </div>
          <IncidentForm />
        </div>
      </div>
    </AuthGuard>
  );
}
