'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { acceptInvite } from './actions';

type AcceptInviteFormProps = {
  token: string;
  email: string;
  accountName: string;
};

export function AcceptInviteForm({ token, email, accountName }: AcceptInviteFormProps) {
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        if (authError.code === 'over_email_send_rate_limit') {
          setError('נשלחו יותר מדי אימיילים. יש להמתין מספר דקות ולנסות שוב.');
        } else {
          setError('שגיאה ביצירת חשבון: ' + authError.message);
        }
        return;
      }

      if (!authData.user) {
        setError('שגיאה ביצירת חשבון');
        return;
      }

      // Step 2: Accept invite — creates user record in the inviter's account
      const result = await acceptInvite(token, authData.user.id, fullName);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setEmailSent(true);
    } catch {
      setError('שגיאה לא צפויה, נסה שוב');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div className="rounded-lg bg-green-50 dark:bg-green-900/30 p-4">
          <h2 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">ההרשמה הצליחה!</h2>
          <p className="text-sm text-green-700 dark:text-green-400">
            שלחנו קישור אימות לכתובת <strong dir="ltr">{email}</strong>
          </p>
          <p className="text-sm text-green-700 dark:text-green-400 mt-1">
            יש לאשר את כתובת האימייל כדי להתחבר למערכת.
          </p>
        </div>
        <Link href="/login" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          חזרה לדף ההתחברות
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">הצטרפות ל{accountName}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">הוזמנת להצטרף לצוות. מלא את הפרטים כדי ליצור חשבון.</p>

      {error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Input
        label="אימייל"
        type="email"
        value={email}
        dir="ltr"
        disabled
      />

      <Input
        label="שם מלא"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="ישראל ישראלי"
        required
      />

      <Input
        label="סיסמה"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        dir="ltr"
        minLength={6}
        required
      />

      <Button type="submit" disabled={loading} className="mt-2">
        {loading ? 'נרשם...' : 'הצטרף'}
      </Button>
    </form>
  );
}
