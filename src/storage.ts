import type { Goal } from "./types";

const GOALS_KEY = "mysavings_goals";

export function loadGoals(): Goal[] {
  try {
    const data = localStorage.getItem(GOALS_KEY);
    const raw = (data ? JSON.parse(data) : []) as Array<Goal & { categoryId?: string }>;
    return raw.map(({ categoryId: _, ...g }) => ({
      ...g,
      history: g.history ?? [],
    })) as Goal[];
  } catch {
    return [];
  }
}

export function saveGoals(goals: Goal[]): void {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}
