export type UIState = 'HIDDEN' | 'MINIMIZED' | 'NOTIFICATION' | 'MODAL' | 'UNAUTHENTICATED' | 'TRACKING';

export type ChallengeMode = 'blood_pact' | 'gauntlet';
export type ChallengeStatus = 'active' | 'completed' | 'failed';

export interface ChallengeContract {
  id: string;
  user_id: string;
  mode: ChallengeMode;
  status: ChallengeStatus;
  target_days: number;
  target_problems_per_day: number;
  penalty_cents: number;
  current_day: number;
  problems_solved_today: number;
  total_problems_solved: number;
  started_at: string;
  expires_at: string;
  last_updated_at: string;
}
