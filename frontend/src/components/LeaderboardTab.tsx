import { Leaderboard } from './Leaderboard';
import { User } from '../firebase';

interface LeaderboardTabProps {
  currentUser: User | null;
}

export function LeaderboardTab({ currentUser }: LeaderboardTabProps) {
  return (
    <div className="glass-panel">
      <Leaderboard currentUser={currentUser} />
    </div>
  );
}
