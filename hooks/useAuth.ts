'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getStoredToken,
  getStoredUser,
  isTokenExpired,
  clearSession,
  type StoredUser,
} from '@/lib/auth';

interface UseAuthOptions {
  /** If true (default), redirects to /login when there is no valid session. */
  requireAuth?: boolean;
}

interface UseAuthReturn {
  user: StoredUser | null;
  token: string | null;
  isLoading: boolean;
  logout: () => void;
}

/**
 * Hook that reads the JWT/user from localStorage and optionally guards the page.
 *
 * Usage in protected pages:
 *   const { user, token, isLoading } = useAuth();
 *   if (isLoading) return <Spinner />;
 *
 * Usage in pages that must NOT require auth (e.g. login):
 *   const { user } = useAuth({ requireAuth: false });
 */
export function useAuth({ requireAuth = true }: UseAuthOptions = {}): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = getStoredToken();

    if (!storedToken || isTokenExpired(storedToken)) {
      clearSession();
      if (requireAuth) {
        router.replace('/login');
      }
      setIsLoading(false);
      return;
    }

    setToken(storedToken);
    setUser(getStoredUser());
    setIsLoading(false);
  }, [requireAuth, router]);

  const logout = useCallback(() => {
    clearSession();
    router.replace('/login');
  }, [router]);

  return { user, token, isLoading, logout };
}
