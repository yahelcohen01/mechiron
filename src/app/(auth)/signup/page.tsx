import { getDictionary } from '@/lib/i18n/server';
import { SignupForm } from './signup-form';

export async function generateMetadata() {
  const t = await getDictionary();
  return { title: t.auth.signup };
}

export default function SignupPage() {
  return <SignupForm />;
}
