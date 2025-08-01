import { createClient } from '@/lib/supabase';

export const revalidate = 30;

interface Row {
  user_id: string;
  value: number;
}

export default async function Leaderboard() {
  const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;
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
