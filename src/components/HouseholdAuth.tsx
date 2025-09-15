import { useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { HouseholdApp } from './HouseholdApp';
import { encryptionService } from '../services/encryptionService';
import { getDefaultMunicipalTaxRate } from '../utils/swedishTaxCalculation';
import type { HouseholdData } from '../services/encryptionService';

interface HouseholdAuthProps {
  householdId: string;
}

export function HouseholdAuth({ householdId }: HouseholdAuthProps) {
  const { user } = useAuth();
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
    if (!user || !password.trim()) return;

    setCreatingHousehold(true);
    setError(null);

    try {
      console.log(`🏠 Creating new household: ${householdId}`);

      const normalizedSlug = normalizeSlug(householdId);

      // 1. Create household metadata (required for security rules)
      console.log('📋 Creating household metadata...');
      const metadataDocRef = doc(db, 'householdMetadata', normalizedSlug);
      await setDoc(metadataDocRef, {
        ownerUid: user.uid,
        name: normalizedSlug,
        createdAt: serverTimestamp(),
      });

      // 2. Create initial household data
      const initialData = {
        categories: [
          {
            id: 'shared',
            name: 'Household Expenses',
            collapsed: false,
            expenses: [],
          },
          {
            id: `personal-${user.uid}`,
            name: `Personal - ${user.displayName || user.email?.split('@')[0] || 'User'}`,
            collapsed: false,
            expenses: [],
          },
        ],
        personalCategories: [],
        personalCategoriesSectionCollapsed: false,
        loans: [],
        assets: [],
        users: [
          {
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            photoURL: user.photoURL || '',
            color: '#10B981', // Owner always gets green
            monthlyIncome: 0,
            municipalTaxRate: getDefaultMunicipalTaxRate(),
          },
        ],
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
      };

      // 3. Encrypt and store household data
      console.log('🔒 Encrypting household data...');
      const encryptedHouseholdData =
        await encryptionService.encryptHouseholdData(
          initialData,
          password.trim(),
          [user.uid]
        );

      const householdDocRef = doc(db, 'households', normalizedSlug);
      await setDoc(householdDocRef, encryptedHouseholdData);

      // 4. Store password in memory
      encryptionService.setHouseholdPassword(normalizedSlug, password.trim());

      console.log(
        `✅ Successfully created encrypted household ${normalizedSlug}`
      );
      setAuthorized(true);
      setPassword(''); // Clear password input
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
    if (!user || !password.trim()) return;

    setJoiningHousehold(true);
    setError(null);

    try {
      console.log(`🎫 Joining household: ${householdId}`);

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

      // Decrypt household data to add user if not already a member
      const decryptedData = await encryptionService.decryptHouseholdData(
        householdData,
        password.trim()
      );

      // Check if user is already in the users array
      const existingUser = decryptedData.users?.find(
        (u: any) => u.id === user.uid
      );
      let needsUpdate = false;

      if (!existingUser) {
        // Add new user to the household
        const colors = [
          '#EF4444',
          '#F59E0B',
          '#10B981',
          '#3B82F6',
          '#8B5CF6',
          '#EC4899',
        ];
        const usedColors = decryptedData.users?.map((u: any) => u.color) || [];
        const availableColors = colors.filter(
          (color) => !usedColors.includes(color)
        );
        const newUserColor = availableColors[0] || colors[0];

        const newUser = {
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          photoURL: user.photoURL || '',
          color: newUserColor,
          monthlyIncome: 0,
          municipalTaxRate: getDefaultMunicipalTaxRate(),
        };

        decryptedData.users = [...(decryptedData.users || []), newUser];

        // Add personal expense category for the new user
        const personalCategoryName = `Personal - ${newUser.name}`;
        const personalCategory = {
          id: `personal-${user.uid}`,
          name: personalCategoryName,
          collapsed: false,
          expenses: [],
        };

        decryptedData.categories = [
          ...(decryptedData.categories || []),
          personalCategory,
        ];

        needsUpdate = true;
        console.log(`👤 Added new user to household: ${newUser.name}`);
        console.log(
          `📝 Created personal expense category: ${personalCategoryName}`
        );
      }

      // Add user to members array if not already there
      if (!householdData.members.includes(user.uid)) {
        decryptedData.members = [...(householdData.members || []), user.uid];
        needsUpdate = true;
      }

      // Save updated data if changes were made
      if (needsUpdate) {
        const updatedEncryptedData =
          await encryptionService.encryptHouseholdData(
            decryptedData,
            password.trim(),
            decryptedData.members || householdData.members
          );

        await setDoc(householdDocRef, updatedEncryptedData, { merge: true });
        console.log(`💾 Updated household data with new member`);
      }

      // Store password in memory
      encryptionService.setHouseholdPassword(householdId, password.trim());

      console.log(`✅ Successfully joined household ${householdId}`);
      setAuthorized(true);
      setPassword(''); // Clear password input
    } catch (error) {
      console.error('Error joining household:', error);
      setError(
        `Failed to join household: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setJoiningHousehold(false);
    }
  };

  useEffect(() => {
    const checkAuthorization = async () => {
      if (!user) return;

      try {
        console.log(`🔐 Checking authorization for household: ${householdId}`);

        // Check if the household exists using metadata
        const metadataDocRef = doc(db, 'householdMetadata', householdId);
        const metadataSnap = await getDoc(metadataDocRef);

        if (!metadataSnap.exists()) {
          console.log(`🏠 Household ${householdId} does not exist`);
          setHouseholdExists(false);
          setAuthorized(false);
          setError(null);
          setLoading(false);
          return;
        }

        setHouseholdExists(true);

        // Check if user is a member by checking household data
        const householdDocRef = doc(db, 'households', householdId);
        const householdSnap = await getDoc(householdDocRef);

        if (!householdSnap.exists()) {
          setError('Household data not found');
          setLoading(false);
          return;
        }

        const householdData = householdSnap.data() as HouseholdData;

        // Check if we have the password in memory
        if (encryptionService.hasHouseholdPassword(householdId)) {
          console.log(
            `✅ User ${user.uid} has password for household ${householdId}`
          );
          setAuthorized(true);
        } else {
          // Need password to access household
          console.log(`🔑 Password needed for ${householdId}`);
          setShowPasswordPrompt(true);
          setAuthorized(false);

          if (householdData.members.includes(user.uid)) {
            setError('Enter the household password to access your data.');
          } else {
            setError(
              'You are not a member of this household. Enter the household password to join.'
            );
          }
        }
      } catch (err) {
        console.error('Error checking authorization:', err);
        setError('Failed to check authorization');
      } finally {
        setLoading(false);
      }
    };

    checkAuthorization();
  }, [householdId, user]);

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
