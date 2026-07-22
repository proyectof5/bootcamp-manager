'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Root page — redirects to /login.
 * Each page of the app will get its own app/[page]/page.tsx as the
 * HTML-to-Next.js migration progresses.
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return null;
}
