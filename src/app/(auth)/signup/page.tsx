'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createAccountAndUser } from '../actions';

export default function SignupPage() {
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
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

      // Step 2: Create account + user records
      const result = await createAccountAndUser(
        authData.user.id,
        companyName,
        fullName,
        email
      );

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
        <div className="rounded-lg bg-green-50 p-4">
          <h2 className="text-lg font-semibold text-green-800 mb-2">ההרשמה הצליחה!</h2>
          <p className="text-sm text-green-700">
            שלחנו קישור אימות לכתובת <strong dir="ltr">{email}</strong>
          </p>
          <p className="text-sm text-green-700 mt-1">
            יש לאשר את כתובת האימייל כדי להתחבר למערכת.
          </p>
        </div>
        <Link href="/login" className="text-sm text-blue-600 hover:underline">
          חזרה לדף ההתחברות
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-gray-900">הרשמה</h2>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      <Input
        label="שם חברה"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder="שם החברה שלך"
        required
      />

      <Input
        label="שם מלא"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="ישראל ישראלי"
        required
      />

      <Input
        label="אימייל"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        dir="ltr"
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
        {loading ? 'נרשם...' : 'הרשמה'}
      </Button>

      <p className="text-center text-sm text-gray-600">
        יש לך חשבון?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">
          התחבר
        </Link>
      </p>
    </form>
  );
}
