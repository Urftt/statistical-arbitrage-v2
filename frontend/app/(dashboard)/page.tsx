import { redirect } from 'next/navigation';

/** Root path redirects to the Academy teaching flow. */
export default function DashboardRoot() {
  redirect('/academy');
}
