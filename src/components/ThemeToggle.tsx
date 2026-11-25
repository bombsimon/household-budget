import { Monitor, Moon, Sun } from 'lucide-react';
import { useThemePreference } from '../hooks/useThemePreference';
import { setThemePreference } from '../utils/theme';

const OPTIONS = [
  { preference: 'system', name: 'System', icon: Monitor },
  { preference: 'light', name: 'Light', icon: Sun },
  { preference: 'dark', name: 'Dark', icon: Moon },
] as const;

export function ThemeToggle() {
  const currentPreference = useThemePreference();

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex gap-1 rounded-lg border border-line p-1"
    >
      {OPTIONS.map(({ preference, name, icon: Icon }) => (
        <button
          key={preference}
          type="button"
          aria-label={name}
          title={name}
          aria-pressed={currentPreference === preference}
          onClick={() => setThemePreference(preference)}
          className={`flex min-h-11 flex-1 items-center justify-center rounded lg:min-h-8 ${
            currentPreference === preference
              ? 'bg-accent-tag text-accent-ink-strong'
              : 'text-muted hover:bg-hover'
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
