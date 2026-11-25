import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
        setError(
          'That password does not open this household. Check it and try again.'
        );
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
            setAuthorized(false);
            setError('Please re-enter the household password.');
          }
        } else {
          // Need password to access household
          setAuthorized(false);
        }
      } catch (err) {
        console.error('Error checking authorization:', err);
        setError('Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    checkAuthorization();
  }, [householdId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p role="status" className="text-slate-700">
          Looking for {householdId}…
        </p>
      </div>
    );
  }

  if (authorized) {
    return <HouseholdApp householdId={householdId} />;
  }

  const couldNotCheck = householdExists === null;
  const isCreating = householdExists === false;
  const isBusy = creatingHousehold || joiningHousehold;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isCreating) {
      handleCreateHousehold();
    } else {
      handleJoinHousehold();
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md panel p-8">
        <h1 className="page-title break-words">
          {couldNotCheck
            ? 'Could not reach your household'
            : isCreating
              ? `Create ${householdId}`
              : householdId}
        </h1>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-3 ring-1 ring-red-300 text-sm"
          >
            {error}
          </p>
        )}

        {couldNotCheck ? (
          <button
            type="button"
            className="btn-primary mt-4"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4">
            <p className="mb-4 text-sm text-slate-700">
              {isCreating
                ? 'No household has this ID yet. Choose a password to create it. The budget is encrypted with the password, and it cannot be recovered if you lose it.'
                : 'Enter the household password to open the budget.'}
            </p>
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={householdId}
              readOnly
              hidden
            />
            <label htmlFor="password" className="field-label">
              Household password
            </label>
            <input
              type="password"
              id="password"
              autoComplete={isCreating ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field"
              autoFocus
            />
            <button
              type="submit"
              disabled={isBusy || !password.trim()}
              className="btn-primary mt-4 w-full"
            >
              {isBusy
                ? isCreating
                  ? 'Creating…'
                  : 'Opening…'
                : isCreating
                  ? 'Create household'
                  : 'Open budget'}
            </button>
          </form>
        )}

        <Link
          to="/"
          className="mt-6 inline-block py-1 text-sm text-blue-800 underline"
        >
          Use another household ID
        </Link>
      </div>
    </main>
  );
}
