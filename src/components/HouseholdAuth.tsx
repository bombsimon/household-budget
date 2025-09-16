import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { HouseholdApp } from './HouseholdApp';
import { encryptionService } from '../services/encryptionService';
import type { HouseholdData } from '../services/encryptionService';

interface HouseholdAuthProps {
  householdId: string;
}

// Generate a simple user ID for this browser session
const getCurrentUserId = (): string => {
  let userId = localStorage.getItem('household_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('household_user_id', userId);
  }
  return userId;
};

export function HouseholdAuth({ householdId }: HouseholdAuthProps) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [householdExists, setHouseholdExists] = useState<boolean | null>(null);
  const [creatingHousehold, setCreatingHousehold] = useState(false);
  const [joiningHousehold, setJoiningHousehold] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');

  const normalizeSlug = (slug: string): string => {
    return slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleCreateHousehold = async () => {
    if (!password.trim()) return;

    setCreatingHousehold(true);
    setError(null);

    try {
      const normalizedSlug = normalizeSlug(householdId);
      getCurrentUserId();

      // Create initial household data with empty users array
      // Users can be added manually in the Users page
      const initialData = {
        categories: [
          {
            id: 'shared',
            name: 'Household Expenses',
            collapsed: false,
            expenses: [],
          },
        ],
        personalCategories: [],
        personalCategoriesSectionCollapsed: false,
        loans: [],
        assets: [],
        users: [], // Start with empty users - add manually in Users page
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
      };

      // Encrypt and store household data
      const encryptedHouseholdData =
        await encryptionService.encryptHouseholdData(
          initialData,
          password.trim()
        );

      const householdDocRef = doc(db, 'households', normalizedSlug);
      await setDoc(householdDocRef, encryptedHouseholdData);

      // Store password in memory
      encryptionService.setHouseholdPassword(normalizedSlug, password.trim());

      setAuthorized(true);
      setPassword('');
    } catch (err) {
      console.error('Error creating household:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create household: ${errorMessage}`);
      setAuthorized(false);
    } finally {
      setCreatingHousehold(false);
    }
  };

  const handleJoinHousehold = async () => {
    if (!password.trim()) return;

    setJoiningHousehold(true);
    setError(null);

    try {
      // Get household data
      const householdDocRef = doc(db, 'households', householdId);
      const householdSnap = await getDoc(householdDocRef);

      if (!householdSnap.exists()) {
        setError('Household not found');
        setJoiningHousehold(false);
        return;
      }

      const householdData = householdSnap.data() as HouseholdData;

      // Test if password can decrypt the data
      const canDecrypt = await encryptionService.testPassword(
        householdData,
        password.trim()
      );

      if (!canDecrypt) {
        setError('Incorrect password');
        setJoiningHousehold(false);
        return;
      }

      // Store password in memory
      encryptionService.setHouseholdPassword(householdId, password.trim());

      setAuthorized(true);
      setPassword('');
    } catch (error) {
      console.error('Error accessing household:', error);
      setError(
        `Failed to access household: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setJoiningHousehold(false);
    }
  };

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        // Check if the household exists
        const householdDocRef = doc(db, 'households', householdId);
        const householdSnap = await getDoc(householdDocRef);

        if (!householdSnap.exists()) {
          setHouseholdExists(false);
          setAuthorized(false);
          setError(null);
          setLoading(false);
          return;
        }

        setHouseholdExists(true);
        const householdData = householdSnap.data() as HouseholdData;
        getCurrentUserId();

        // Check if we have the password in memory
        if (encryptionService.hasHouseholdPassword(householdId)) {
          // Verify user still exists in household data
          try {
            await encryptionService.decryptHouseholdData(
              householdData,
              encryptionService.getHouseholdPassword(householdId)!
            );

            // Just check if password works - no need to verify user exists
            setAuthorized(true);
          } catch (decryptError) {
            console.error(
              'Failed to decrypt with stored password:',
              decryptError
            );
            encryptionService.clearHouseholdPassword(householdId);
            setShowPasswordPrompt(true);
            setAuthorized(false);
            setError('Please re-enter the household password.');
          }
        } else {
          // Need password to access household
          setShowPasswordPrompt(true);
          setAuthorized(false);

          setError('Enter the household password to access this household.');
        }
      } catch (err) {
        console.error('Error checking authorization:', err);
        setError('Failed to check authorization');
      } finally {
        setLoading(false);
      }
    };

    checkAuthorization();
  }, [householdId]);

  if (loading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  if (authorized) {
    return <HouseholdApp householdId={householdId} />;
  }

  return (
    <div className="h-screen bg-white flex items-center justify-center">
      <div className="max-w-md w-full space-y-6 p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {householdExists === false
              ? 'Create Household'
              : showPasswordPrompt
                ? 'Enter Password'
                : 'Access Required'}
          </h2>
          <p className="text-gray-600">
            Household ID:{' '}
            <span className="font-mono font-semibold">{householdId}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {householdExists === false ? (
            // Household doesn't exist - offer to create
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-800">
                  <strong>Household "{householdId}" doesn't exist yet.</strong>
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Set a password to create it.
                </p>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Household Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter a secure password..."
                />
              </div>

              <button
                onClick={handleCreateHousehold}
                disabled={creatingHousehold || !password.trim()}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {creatingHousehold ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating encrypted household...
                  </>
                ) : (
                  `✨ Create "${householdId}"`
                )}
              </button>

              <a
                href="/"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ← Back to choose different name
              </a>
            </div>
          ) : showPasswordPrompt ? (
            // Household exists - need password
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-800">
                  <strong>
                    Enter the household password to access "{householdId}"
                  </strong>
                </p>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Household Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && password.trim()) {
                      handleJoinHousehold();
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter household password..."
                  autoFocus
                />
              </div>

              <button
                onClick={handleJoinHousehold}
                disabled={joiningHousehold || !password.trim()}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {joiningHousehold ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Verifying password...
                  </>
                ) : (
                  `🔓 Access Household`
                )}
              </button>

              <a
                href="/"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ← Back to choose different household
              </a>
            </div>
          ) : (
            // Loading state while checking household existence
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Checking household status...</p>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="text-sm text-blue-800">
            <p className="mb-2">
              <strong>🔒 Password Protected:</strong> All household data is
              encrypted with your password.
            </p>
            <p className="mb-2">
              <strong>🏠 Simple Sharing:</strong> Share household ID + password
              with family members.
            </p>
            <p className="mb-2">
              <strong>👥 Manual Users:</strong> Add household members in the
              Users page after accessing.
            </p>
            <p>
              <strong>🔐 Secure:</strong> Even we cannot read your data without
              the password.
            </p>
          </div>
        </div>

        <div className="text-center">
          <a
            href="/"
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
