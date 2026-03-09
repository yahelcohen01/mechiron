'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/locale-context';

export function LoginForm() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(t.auth.invalidCredentials);
        return;
      }

      router.push('/');
    } catch {
      setError(t.auth.loginError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t.auth.loginTitle}</h2>

      {error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

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
        required
      />

      <Button type="submit" disabled={loading} className="mt-2">
        {loading ? t.auth.loggingIn : t.auth.login}
      </Button>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        {t.auth.noAccount}{' '}
        <Link href="/signup" className="text-blue-600 dark:text-blue-400 hover:underline">
          {t.auth.createAccount}
        </Link>
      </p>
    </form>
  );
}
