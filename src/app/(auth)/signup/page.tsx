import type { Metadata } from 'next';
import { SignupForm } from './signup-form';

export const metadata: Metadata = {
  title: 'הרשמה',
};

export default function SignupPage() {
  return <SignupForm />;
}
