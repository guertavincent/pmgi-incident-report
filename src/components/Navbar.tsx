'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/auth';
import { useAuthState } from '@/hooks/useAuthState';

export default function Navbar() {
  const router = useRouter();
  const { user } = useAuthState();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <nav className="bg-blue-900 text-white px-6 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-xl font-bold tracking-wide">
          PMGI Incident Report
        </Link>
        {user && (
          <>
            <Link href="/dashboard" className="hover:text-blue-200 text-sm">
              Dashboard
            </Link>
            <Link href="/report" className="hover:text-blue-200 text-sm">
              New Report
            </Link>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-sm text-blue-200">{user.email}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:text-blue-200 text-sm">
              Login
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-sm"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
