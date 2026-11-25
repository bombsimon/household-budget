import type { CSSProperties } from 'react';
import type { User } from '../types';

interface AvatarProps {
  user?: User;
  size?: 'small' | 'medium' | 'large';
}

const SIZES = {
  small: 'h-6 w-6 text-xs ring-2',
  medium: 'h-10 w-10 text-base ring-[3px]',
  large: 'h-14 w-14 text-xl ring-4',
};

export function Avatar({ user, size = 'medium' }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-full bg-surface font-bold text-ink ring-inset ${SIZES[size]}`}
      style={
        {
          '--tw-ring-color': user?.color ?? '#94a3b8',
          backgroundColor: `color-mix(in srgb, ${user?.color ?? '#94a3b8'} 18%, rgb(var(--color-surface)))`,
        } as CSSProperties
      }
    >
      {user?.name.charAt(0).toUpperCase() ?? '?'}
    </span>
  );
}
