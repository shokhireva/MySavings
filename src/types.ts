export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  isSpent: boolean;
  createdAt: string;
}
