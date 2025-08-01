import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export const revalidate = 30;

interface Row {
  user_id: string;
  value: number;
}

export default async function Leaderboard() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return <p>Log in to see leaderboard</p>;
  }

  const { data } = await supabase
    .from('scores')
    .select('user_id, value')
    .order('value', { ascending: false })
    .limit(20);

  return (
    <ul>
      {data?.map((row: Row) => (
        <li key={row.user_id}>{row.user_id}: {row.value}</li>
      ))}
    </ul>
  );
}
