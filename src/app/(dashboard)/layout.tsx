import Link from 'next/link';
import { LogoutButton } from '@/components/logout-button';
import { SidebarToggle } from '@/components/sidebar-toggle';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile sticky header */}
        <SidebarToggle />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-white border-s border-gray-200 flex-col p-6 shrink-0">
        <h1 className="text-xl font-bold text-gray-900 mb-8">מחירון</h1>
        <nav className="flex flex-col gap-2 flex-1">
          <Link
            href="/"
            className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          >
            בקשות הצעת מחיר
          </Link>
          <Link
            href="/rfq/new"
            className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          >
            בקשה חדשה
          </Link>
          <Link
            href="/settings/clients"
            className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          >
            ניהול לקוחות
          </Link>
          <Link
            href="/settings/suppliers"
            className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          >
            ניהול ספקים
          </Link>
          <Link
            href="/settings/organization"
            className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          >
            הגדרות ארגון
          </Link>
        </nav>
        <LogoutButton />
      </aside>
    </div>
  );
}
