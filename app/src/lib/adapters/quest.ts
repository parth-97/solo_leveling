import { DIFFICULTY_NUM, type QuestDifficulty, type Habit, type HabitLog } from '@/types/shared';

/** Converts the API's string difficulty enum to the legacy 1-5 numeric scale. */
export function difficultyToNumber(difficulty: QuestDifficulty): number {
  return DIFFICULTY_NUM[difficulty];
}

/**
 * Derives the legacy `completion: number[]` (binary array, oldest -> newest)
 * from the API's `completionHistory: HabitLog[]` for the last `days` days.
 * Days with no log are treated as not completed (0).
 */
export function completionArrayFromLogs(habit: Pick<Habit, 'completionHistory'>, days = 14): number[] {
  const logs = habit.completionHistory ?? [];
  const byDate = new Map<string, HabitLog>();
  for (const log of logs) byDate.set(log.loggedDate, log);

  const result: number[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const log = byDate.get(iso);
    result.push(log?.completed ? 1 : 0);
  }
  return result;
}
