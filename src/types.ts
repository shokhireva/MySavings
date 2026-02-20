export type GoalColor =
  | "teal"
  | "purple"
  | "amber"
  | "rose"
  | "sky"
  | "emerald";

export type HistoryEntryType = "add" | "subtract" | "spent";

export interface GoalHistoryEntry {
  id: string;
  date: string;
  amount: number;
  type: HistoryEntryType;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  icon?: string;
  color?: GoalColor;
  isSpent: boolean;
  createdAt: string;
  history?: GoalHistoryEntry[];
}
