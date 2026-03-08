import type { Metadata } from 'next';
import Link from 'next/link';
import { validateInviteToken } from './actions';
import { AcceptInviteForm } from './accept-invite-form';

export const metadata: Metadata = {
  title: 'הזמנה לצוות',
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await validateInviteToken(token);

  if (!result.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col gap-4 text-center">
            <div className="rounded-lg bg-red-50 p-4">
              <h2 className="text-lg font-semibold text-red-800 mb-2">הזמנה לא תקינה</h2>
              <p className="text-sm text-red-700">{result.error}</p>
            </div>
            <Link href="/login" className="text-sm text-blue-600 hover:underline">
              חזרה לדף ההתחברות
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { email, accountName } = result.data;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <AcceptInviteForm token={token} email={email} accountName={accountName} />
      </div>
    </div>
  );
}
