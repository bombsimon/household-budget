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
      title="Shares by current income"
      bgColor="bg-hover"
      textColor="text-ink-soft"
      titleColor="text-ink"
    />
  );
}
