'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogoutButton } from './logout-button';

export function SidebarToggle() {
  const [open, setOpen] = useState(false);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 start-4 z-40 rounded-lg bg-white border border-gray-200 p-2 shadow-sm"
        aria-label="תפריט"
      >
        <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay + slide-in panel */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={close} />
          <aside className="fixed inset-y-0 end-0 w-64 bg-white border-s border-gray-200 flex flex-col p-6 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-xl font-bold text-gray-900">מחירון</h1>
              <button
                type="button"
                onClick={close}
                className="text-gray-500 hover:text-gray-700"
                aria-label="סגור"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-2 flex-1">
              <Link href="/" onClick={close} className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md px-3 py-2 text-sm font-medium transition-colors">
                בקשות הצעת מחיר
              </Link>
              <Link href="/rfq/new" onClick={close} className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md px-3 py-2 text-sm font-medium transition-colors">
                בקשה חדשה
              </Link>
              <Link href="/settings/clients" onClick={close} className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md px-3 py-2 text-sm font-medium transition-colors">
                ניהול לקוחות
              </Link>
              <Link href="/settings/suppliers" onClick={close} className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md px-3 py-2 text-sm font-medium transition-colors">
                ניהול ספקים
              </Link>
              <Link href="/settings/organization" onClick={close} className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md px-3 py-2 text-sm font-medium transition-colors">
                הגדרות ארגון
              </Link>
            </nav>
            <LogoutButton />
          </aside>
        </div>
      )}
    </>
  );
}
