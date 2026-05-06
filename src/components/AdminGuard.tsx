'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/useAuthState';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const { user, role, loading } = useAuthState();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/admin/login');
      return;
    }
    if (role !== 'admin') {
      router.push('/dashboard');
    }
  }, [loading, user, role, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user || role !== 'admin') return null;

  return <>{children}</>;
}
