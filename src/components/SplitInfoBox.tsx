import type { User } from '../types';
import { IncomeSplitDisplay } from './IncomeSplitDisplay';

interface SplitInfoBoxProps {
  users: User[];
}

export function SplitInfoBox({ users }: SplitInfoBoxProps) {
  return (
    <IncomeSplitDisplay
      users={users}
      title="Shares by current income"
      bgColor="bg-hover"
      textColor="text-ink-soft"
      titleColor="text-ink"
    />
  );
}
