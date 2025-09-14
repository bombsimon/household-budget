import { useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { HouseholdApp } from './HouseholdApp';
import { encryptionService } from '../services/encryptionService';
import { inviteService } from '../services/inviteService';
import { getDefaultMunicipalTaxRate } from '../utils/swedishTaxCalculation';

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
  const [redemptionAttempted, setRedemptionAttempted] = useState(false);

  // Check if this is an invite URL (handle both dev and prod base paths)
  const pathname = window.location.pathname;
  const isInviteUrl = pathname.includes('/invite/');
  const inviteCode = isInviteUrl ? pathname.split('/invite/')[1] : null;

  const normalizeSlug = (slug: string): string => {
    return slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleCreateHousehold = async () => {
    if (!user) return;

    setCreatingHousehold(true);
    setError(null);

    try {
      console.log(`🏠 Creating new household: ${householdId}`);

      const normalizedSlug = normalizeSlug(householdId);

      // 1. FIRST: Create household metadata (required for security rules)
      console.log('📋 Creating household metadata...');
      const metadataDocRef = doc(db, 'householdMetadata', normalizedSlug);
      await setDoc(metadataDocRef, {
        ownerUid: user.uid,
        name: normalizedSlug,
        createdAt: serverTimestamp(),
      });

      // 2. Generate household encryption key
      console.log('🔐 Generating household encryption key...');
      const householdKey = await encryptionService.generateHouseholdKey();
      const userToken = await encryptionService.getCurrentUserToken();

      // 3. Create initial household data
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
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
      };

      // 4. Encrypt and store household data
      console.log('🔒 Encrypting household data...');
      const encryptedData = await encryptionService.encryptData(
        initialData,
        householdKey
      );
      const householdDocRef = doc(db, 'households', normalizedSlug);

      console.log('📄 Creating main household document...');
      await setDoc(householdDocRef, {
        // Encrypted household data
        encryptedData,
        members: [user.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log('✅ Main household document created successfully');

      // 5. Create encrypted member data first (required for key creation security rules)
      console.log('💰 Creating member with encrypted salary data...');
      const memberSensitiveData = {
        monthlyIncome: 0,
        municipalTaxRate: getDefaultMunicipalTaxRate(),
      };

      const encryptedMemberData = await encryptionService.encryptData(
        memberSensitiveData,
        householdKey
      );

      // Store member with encrypted sensitive data
      const memberDocRef = doc(
        db,
        'households',
        normalizedSlug,
        'members',
        user.uid
      );
      const memberData = {
        // Basic info (unencrypted for UI)
        role: 'owner',
        addedAt: serverTimestamp() as Timestamp,
        displayName: user.displayName || undefined,
        email: user.email || undefined,
        photoURL: user.photoURL || undefined,
        color: '#10B981', // Owner always gets green

        // Encrypted sensitive financial data
        encryptedData: encryptedMemberData,
      };

      await setDoc(memberDocRef, memberData);
      console.log('✅ Member document created successfully');

      // 6. Store encrypted household key for the owner (after member exists for security rules)
      console.log('🗝️ Storing encrypted household key...');
      const encryptedKeyInfo =
        await encryptionService.encryptHouseholdKeyForUser(
          householdKey,
          userToken,
          normalizedSlug
        );
      const keyDocRef = doc(db, 'households', normalizedSlug, 'keys', user.uid);
      await setDoc(keyDocRef, encryptedKeyInfo);
      console.log('✅ Encryption key stored successfully');

      console.log(
        `✅ Successfully created encrypted household ${normalizedSlug}`
      );
      setAuthorized(true);
    } catch (err) {
      console.error('Error creating household:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create household: ${errorMessage}`);
      setAuthorized(false);
    } finally {
      setCreatingHousehold(false);
    }
  };

  const handleInviteRedemption = async () => {
    if (!user || !inviteCode || redemptionAttempted) return;

    setRedemptionAttempted(true);
    setLoading(true);
    setError(null);

    try {
      console.log(`🎫 Redeeming invite: ${inviteCode}`);

      // Redeem the invite
      const result = await inviteService.redeemInvite(inviteCode, user.email!);

      if (!result.success || !result.householdKey) {
        setError(result.error || 'Failed to redeem invite');
        setLoading(false);
        return;
      }

      // Get the household ID from the invite
      const invite = await inviteService.getInvite(inviteCode);
      if (!invite) {
        setError('Invite not found');
        setLoading(false);
        return;
      }

      const targetHouseholdId = invite.householdId;

      // Encrypt household key for this user
      const userToken = await encryptionService.getCurrentUserToken();
      const encryptedKeyInfo =
        await encryptionService.encryptHouseholdKeyForUser(
          result.householdKey,
          userToken,
          targetHouseholdId
        );

      // Store encrypted household key for this user
      const keyDocRef = doc(
        db,
        'households',
        targetHouseholdId,
        'keys',
        user.uid
      );
      await setDoc(keyDocRef, encryptedKeyInfo);

      // Create encrypted member data for new member
      const memberSensitiveData = {
        monthlyIncome: 0,
        municipalTaxRate: getDefaultMunicipalTaxRate(),
      };

      const encryptedMemberData = await encryptionService.encryptData(
        memberSensitiveData,
        result.householdKey
      );

      // Add user as household member with encrypted salary data
      const colors = [
        '#3B82F6',
        '#10B981',
        '#F59E0B',
        '#8B5CF6',
        '#EC4899',
        '#06B6D4',
      ];
      const memberDocRef = doc(
        db,
        'households',
        targetHouseholdId,
        'members',
        user.uid
      );
      const memberData = {
        // Basic info (unencrypted for UI)
        role: 'member' as const,
        addedAt: serverTimestamp() as Timestamp,
        displayName: user.displayName || undefined,
        email: user.email || undefined,
        photoURL: user.photoURL || undefined,
        color: colors[Math.floor(Math.random() * colors.length)],

        // Encrypted sensitive financial data
        encryptedData: encryptedMemberData,
      };

      await setDoc(memberDocRef, memberData);

      // SECURITY: Delete the invite immediately after successful redemption
      // to prevent anyone from accessing the encrypted household key
      try {
        await inviteService.deleteInvite(inviteCode);
        console.log(`🗑️ Deleted invite ${inviteCode} for security`);
      } catch (deleteError) {
        console.error('Failed to delete invite after redemption:', deleteError);
        // Don't fail the entire redemption if deletion fails
      }

      console.log(
        `✅ Successfully joined household ${targetHouseholdId} via invite`
      );

      // Redirect to the household (remove /invite/ from URL)
      const basePath = import.meta.env.PROD ? '/household-budget' : '';
      window.history.replaceState({}, '', `${basePath}/${targetHouseholdId}`);

      // Update the householdId prop to point to the actual household
      // Since we can't change props directly, we'll trigger a page reload
      window.location.href = `${basePath}/${targetHouseholdId}`;

      // Update local state
      setHouseholdExists(true);
      setAuthorized(true);
      setLoading(false);
    } catch (error) {
      console.error('Error redeeming invite:', error);
      setError(
        `Failed to join household: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      setRedemptionAttempted(false); // Allow retry on error
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAuthorization = async () => {
      if (!user) return;

      try {
        console.log(`🔐 Checking authorization for household: ${householdId}`);

        // If this is an invite URL, handle invite redemption
        if (isInviteUrl && inviteCode) {
          await handleInviteRedemption();
          return;
        }

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

        // Check if user is a member (by checking if they have a decryption key)
        const keyDocRef = doc(db, 'households', householdId, 'keys', user.uid);
        const keySnap = await getDoc(keyDocRef);

        if (keySnap.exists()) {
          console.log(
            `✅ User ${user.uid} is authorized for household ${householdId}`
          );
          setAuthorized(true);
        } else {
          console.log(
            `❌ User ${user.uid} is not a member of household ${householdId}`
          );
          setAuthorized(false);
          setError(
            'You are not a member of this household. You need an invite to join.'
          );
        }
      } catch (err) {
        console.error('Error checking authorization:', err);
        setError('Failed to check authorization');
      } finally {
        setLoading(false);
      }
    };

    checkAuthorization();
  }, [householdId, user, inviteCode, isInviteUrl]);

  if (loading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isInviteUrl
              ? 'Joining household...'
              : 'Checking access permissions...'}
          </p>
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
            {isInviteUrl ? 'Join Household' : 'Access Required'}
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
                  Would you like to create it?
                </p>
              </div>

              <button
                onClick={handleCreateHousehold}
                disabled={creatingHousehold}
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
          ) : householdExists === true ? (
            // Household exists but user is not a member
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-800">
                  <strong>
                    Household "{householdId}" exists but you're not a member.
                  </strong>
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  You need an invite link to join this household.
                </p>
              </div>

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
              <strong>🔒 Fully Encrypted:</strong> All your household data is
              encrypted end-to-end.
            </p>
            <p className="mb-2">
              <strong>🎫 Join with Invites:</strong> Only household members can
              create invite links.
            </p>
            <p>
              <strong>🔐 Secure Access:</strong> Your data is protected even
              from the app developers.
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
