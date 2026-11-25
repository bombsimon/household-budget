import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const [householdId, setHouseholdId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const generateRandomId = () => {
    const adjectives = [
      'cozy',
      'happy',
      'green',
      'sunny',
      'smart',
      'modern',
      'blue',
      'bright',
    ];
    const nouns = [
      'home',
      'family',
      'house',
      'budget',
      'household',
      'finances',
      'savings',
      'plans',
    ];
    const randomAdjective =
      adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNum = Math.floor(Math.random() * 1000);

    return `${randomAdjective}-${randomNoun}-${randomNum}`;
  };

  const validateHouseholdId = (id: string) => {
    if (id.length < 3) {
      return 'Household ID must be at least 3 characters long';
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return 'Household ID can only contain letters, numbers, hyphens, and underscores';
    }
    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateHouseholdId(householdId);
    if (validationError) {
      setError(validationError);
      return;
    }
    navigate(`/${householdId}`);
  };

  const handleCreateRandom = () => {
    const randomId = generateRandomId();
    navigate(`/${randomId}`);
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full max-w-md flex-col panel p-8">
        <h1 className="text-3xl font-bold tracking-tight">Household Budget</h1>
        <p className="mt-2 text-ink-soft">
          See what is left each month and who owes whom.
        </p>

        <form onSubmit={handleSubmit} className="mt-8">
          <label htmlFor="household-id" className="field-label">
            Household ID
          </label>
          <input
            id="household-id"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={householdId}
            onChange={(event) => {
              setHouseholdId(event.target.value);
              setError('');
            }}
            placeholder="smith-family"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'household-id-error' : undefined}
            className="field"
          />
          {error && (
            <p
              id="household-id-error"
              role="alert"
              className="mt-2 text-sm text-danger-ink"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!householdId.trim()}
            className="btn-primary mt-4 w-full"
          >
            Open budget
          </button>
        </form>

        <button
          type="button"
          onClick={handleCreateRandom}
          className="btn-secondary mt-3"
        >
          Create a household
        </button>
      </div>
    </main>
  );
}
