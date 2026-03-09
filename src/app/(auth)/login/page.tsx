import { getDictionary } from '@/lib/i18n/server';
import { LoginForm } from './login-form';

export async function generateMetadata() {
  const t = await getDictionary();
  return { title: t.auth.login };
}

export default function LoginPage() {
  return <LoginForm />;
}
