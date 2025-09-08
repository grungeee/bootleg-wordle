import Leaderboard from '@/components/Leaderboard';

export const dynamic = 'force-dynamic';

export default function LeaderboardPage() {
  return (
    <div>
      <h1 className="text-xl">Leaderboard</h1>
      <Leaderboard />
    </div>
  );
}
