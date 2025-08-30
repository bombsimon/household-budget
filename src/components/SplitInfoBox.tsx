import type { User } from '../types';
import { IncomeSplitDisplay } from './IncomeSplitDisplay';

interface SplitInfoBoxProps {
  users: User[];
  splitData: { [userId: string]: number };
}

export function SplitInfoBox({ users, splitData }: SplitInfoBoxProps) {
  return (
    <IncomeSplitDisplay
      users={users}
      splitData={splitData}
      title="Income-Based Split Calculation:"
      bgColor="bg-blue-50"
      textColor="text-blue-700"
      titleColor="text-blue-800"
    />
  );
}
