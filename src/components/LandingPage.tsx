import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, ArrowRight } from 'lucide-react';

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
    <div className="h-screen bg-white overflow-y-auto">
      <div className="container mx-auto px-4 py-16 max-w-none">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <div className="bg-white p-4 rounded-full shadow-lg">
              <Home className="w-12 h-12 text-blue-600" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Household Budget Manager
          </h1>

          <p className="text-xl text-gray-600 mb-8">
            Manage your household finances with smart expense splitting, asset
            tracking, and financial insights.
          </p>

          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Access Your Household Budget
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  Enter or Create Household ID
                </label>
                <input
                  type="text"
                  value={householdId}
                  onChange={(e) => {
                    setHouseholdId(e.target.value);
                    setError('');
                  }}
                  placeholder="e.g., smith-family-2025"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={!householdId.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowRight className="w-5 h-5" />
                Go to Budget
              </button>
            </form>

            <div className="text-center">
              <div className="text-gray-500 mb-4">or</div>
              <button
                onClick={handleCreateRandom}
                className="flex items-center justify-center gap-2 mx-auto px-6 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create New Household
              </button>
            </div>
          </div>

          <div className="mt-8 text-sm text-gray-600">
            <p>
              <strong>Tip:</strong> Share your household ID with family members
              to access the same budget from different devices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
