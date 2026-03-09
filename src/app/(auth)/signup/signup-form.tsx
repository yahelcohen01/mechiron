'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createAccountAndUser } from '../actions';
import { useT } from '@/lib/i18n/locale-context';

export function SignupForm() {
  const t = useT();
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

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        if (authError.code === 'over_email_send_rate_limit') {
          setError(t.auth.rateLimitError);
        } else {
          setError(t.auth.signupError + ': ' + authError.message);
        }
        return;
      }

      if (!authData.user) {
        setError(t.auth.signupError);
        return;
      }

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
      setError(t.auth.unexpectedError);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div className="rounded-lg bg-green-50 dark:bg-green-900/30 p-4">
          <h2 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">{t.auth.signupSuccess}</h2>
          <p className="text-sm text-green-700 dark:text-green-400">
            {t.auth.verificationSent} <strong dir="ltr">{email}</strong>
          </p>
          <p className="text-sm text-green-700 dark:text-green-400 mt-1">
            {t.auth.confirmEmail}
          </p>
        </div>
        <Link href="/login" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          {t.auth.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t.auth.signupTitle}</h2>

      {error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Input
        label={t.auth.companyName}
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        required
      />

      <Input
        label={t.auth.fullName}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />

      <Input
        label={t.auth.email}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        dir="ltr"
        required
      />

      <Input
        label={t.auth.password}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        dir="ltr"
        minLength={6}
        required
      />

      <Button type="submit" disabled={loading} className="mt-2">
        {loading ? t.auth.signingUp : t.auth.signup}
      </Button>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        {t.auth.hasAccount}{' '}
        <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
          {t.auth.login}
        </Link>
      </p>
    </form>
  );
}
