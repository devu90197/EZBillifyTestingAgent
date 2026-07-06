import { redirect } from 'next/navigation';

// No landing page — go straight to the app (proxy sends unauthenticated users to /login).
export default function Home() {
  redirect('/dashboard');
}
