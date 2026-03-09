import Link from 'next/link';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { SidebarNav } from '@/components/sidebar-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogoutButton } from '@/components/logout-button';
import { getDictionary } from '@/lib/i18n/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getDictionary();

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — first in DOM: RIGHT in RTL, LEFT in LTR */}
      <aside className="hidden md:flex w-56 bg-white dark:bg-gray-900 border-e border-gray-200 dark:border-gray-700 flex-col p-6 shrink-0">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          {t.sidebar.appName}
        </h1>
        <SidebarNav />
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 flex flex-col gap-1">
          <Link
            href="/settings/system"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{t.sidebar.systemSettings}</span>
          </Link>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile sticky header */}
        <SidebarToggle />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
