'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/auth';
import { useAuthState } from '@/hooks/useAuthState';

export default function Navbar() {
  const router = useRouter();
  const { user, role } = useAuthState();
  const [menuOpen, setMenuOpen] = useState(false);

  const dashboardHref = role === 'admin' ? '/admin/dashboard' : '/dashboard';
  const dashboardLabel = 'Incident Report';

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <nav className="bg-blue-900 text-white shadow-md">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg sm:text-xl font-bold tracking-wide">
            PMGI Incident Report
          </Link>
        </div>

        <button
          type="button"
          className="sm:hidden inline-flex items-center justify-center rounded-md border border-blue-700/60 px-2 py-1 text-xs text-blue-100 hover:bg-blue-800"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
        >
          Menu
        </button>

        <div className="hidden sm:flex items-center gap-4">
          {user && (
            <>
              <Link href={dashboardHref} className="hover:text-blue-200 text-sm">
                {dashboardLabel}
              </Link>
              <Link href="/report" className="hover:text-blue-200 text-sm">
                New Report
              </Link>
              <Link
                href="/housekeeping-guidelines"
                className="hover:text-blue-200 text-sm"
              >
                Housekeeping Guidelines
              </Link>
            </>
          )}
          {user ? (
            <>
              <span className="text-sm text-blue-200 truncate max-w-48">
                {user.email}
              </span>
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
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t border-blue-800 px-4 pb-4">
          <div className="flex flex-col gap-3 pt-3">
            {user && (
              <>
                <Link href={dashboardHref} className="hover:text-blue-200 text-sm">
                  {dashboardLabel}
                </Link>
                <Link href="/report" className="hover:text-blue-200 text-sm">
                  New Report
                </Link>
                <Link
                  href="/housekeeping-guidelines"
                  className="hover:text-blue-200 text-sm"
                >
                  Housekeeping Guidelines
                </Link>
              </>
            )}
            {user ? (
              <>
                <span className="text-xs text-blue-200 break-all">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm w-full"
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
                  className="bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded text-sm text-center"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
