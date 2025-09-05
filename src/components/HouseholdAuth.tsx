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

interface HouseholdMember {
  role: 'owner' | 'member';
  addedAt: Timestamp;
  displayName?: string;
  email?: string;
  photoURL?: string;
  // Financial fields (previously from User interface)
  monthlyIncome: number;
  municipalTaxRate: number;
  color: string;
}

interface HouseholdAuthProps {
  householdId: string;
}

export function HouseholdAuth({ householdId }: HouseholdAuthProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [submittingApplication, setSubmittingApplication] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<
    'none' | 'pending' | 'approved' | 'rejected'
  >('none');
  const [householdExists, setHouseholdExists] = useState<boolean | null>(null);
  const [creatingHousehold, setCreatingHousehold] = useState(false);

  const normalizeSlug = (slug: string): string => {
    return slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  const handleCreateHousehold = async () => {
    if (!user) return;

    setCreatingHousehold(true);
    setError(null);

    try {
      console.log(`🏠 Creating new household: ${householdId}`);

      // Normalize the household slug
      const normalizedSlug = normalizeSlug(householdId);

      // Double-check that household doesn't exist
      const metadataDocRef = doc(db, 'householdMetadata', normalizedSlug);
      const metadataSnap = await getDoc(metadataDocRef);

      if (metadataSnap.exists()) {
        console.log('Household already exists');
        setError(
          'This household already exists. Please choose a different name or apply to join.'
        );
        setHouseholdExists(true);
        return;
      }

      // Create household document with basic category structure FIRST
      const householdDocRef = doc(db, 'households', normalizedSlug);
      const householdData = {
        ownerUid: user.uid,
        name: normalizedSlug,
        createdAt: serverTimestamp(),
        // Initialize with basic empty categories
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

      await setDoc(householdDocRef, householdData);

      // Add current user as owner member SECOND
      const memberDocRef = doc(
        db,
        'households',
        normalizedSlug,
        'members',
        user.uid
      );
      const memberData: HouseholdMember = {
        role: 'owner',
        addedAt: serverTimestamp() as Timestamp,
        displayName: user.displayName || undefined,
        email: user.email || undefined,
        photoURL: user.photoURL || undefined,
        // Financial defaults for new household owner
        monthlyIncome: 0, // Start with 0, user can update this later
        municipalTaxRate: 0.32, // Default Swedish tax rate
        color: '#10B981', // First color in palette - owner always gets green
      };

      await setDoc(memberDocRef, memberData);

      // Create household metadata document LAST (secure, minimal data)
      const metadataData = {
        ownerUid: user.uid,
        name: normalizedSlug,
        createdAt: serverTimestamp(),
      };

      await setDoc(metadataDocRef, metadataData);

      console.log(`✅ Successfully created household ${normalizedSlug}`);
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

  useEffect(() => {
    const checkAuthorization = async () => {
      if (!user) return;

      try {
        console.log(`🔐 Checking authorization for household: ${householdId}`);

        // First check if the household exists using metadata (secure existence check)
        const metadataDocRef = doc(db, 'householdMetadata', householdId);
        const metadataSnap = await getDoc(metadataDocRef);

        if (!metadataSnap.exists()) {
          console.log(`🏠 Household ${householdId} does not exist`);
          setHouseholdExists(false);
          setAuthorized(false);
          setError(null); // Clear any previous error
          return;
        }

        setHouseholdExists(true);

        // Household exists, now check if user is a member
        const memberDocRef = doc(
          db,
          'households',
          householdId,
          'members',
          user.uid
        );

        try {
          const memberSnap = await getDoc(memberDocRef);

          if (memberSnap.exists()) {
            console.log(
              `✅ User ${user.uid} is authorized for household ${householdId}`
            );
            setAuthorized(true);
          } else {
            console.log(
              `❌ User ${user.uid} is not a member of household ${householdId}`
            );
            setAuthorized(false);
            setApplicationStatus('none');
            setError('You are not a member of this household');
          }
        } catch (memberErr) {
          // If we can't read member docs, we're definitely not a member
          console.log(
            `❌ User ${user.uid} cannot access member data for household ${householdId} - not authorized`
          );
          setAuthorized(false);

          // Try to check if user has an existing application
          // Note: This will only work if the user is the applicant or if they're the household owner
          try {
            const applicationDocRef = doc(
              db,
              'households',
              householdId,
              'applications',
              user.uid
            );
            const applicationSnap = await getDoc(applicationDocRef);

            if (applicationSnap.exists()) {
              const appData = applicationSnap.data();
              setApplicationStatus(appData.status || 'pending');
              if (appData.status === 'pending') {
                setError(
                  'Your application to join this household is pending approval'
                );
              } else if (appData.status === 'rejected') {
                setError(
                  'Your application to join this household was rejected'
                );
              }
            } else {
              setApplicationStatus('none');
              setError('You are not a member of this household');
            }
          } catch (appErr) {
            // Can't read application either, just show general error
            setApplicationStatus('none');
            setError('You are not a member of this household');
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

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !applicationMessage.trim()) return;

    setSubmittingApplication(true);
    setError(null);

    try {
      console.log(`📝 Submitting application for household: ${householdId}`);

      // Create application document
      const applicationDocRef = doc(
        db,
        'households',
        householdId,
        'applications',
        user.uid
      );
      const applicationData = {
        userId: user.uid,
        displayName: user.displayName || 'Unknown User',
        email: user.email || 'No email',
        photoURL: user.photoURL || null,
        message: applicationMessage.trim(),
        status: 'pending',
        appliedAt: serverTimestamp(),
        householdId: householdId,
      };

      await setDoc(applicationDocRef, applicationData);

      console.log(
        `✅ Successfully submitted application for household ${householdId}`
      );
      setApplicationStatus('pending');
      setShowApplicationForm(false);
      setError('Your application has been submitted and is pending approval');
    } catch (err) {
      console.error('Error submitting application:', err);
      setError('Failed to submit application');
    } finally {
      setSubmittingApplication(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Required
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
          {/* Show different UI based on whether household exists */}
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
                    Creating household...
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
            <>
              {applicationStatus === 'none' && !showApplicationForm ? (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>
                        Household "{householdId}" exists but you're not a
                        member.
                      </strong>
                    </p>
                  </div>

                  <button
                    onClick={() => setShowApplicationForm(true)}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    📝 Apply to join household
                  </button>

                  <a
                    href="/"
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    ← Back to choose different household
                  </a>
                </div>
              ) : applicationStatus === 'pending' ? (
                <div className="text-center">
                  <div className="inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-yellow-500"
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
                    Application pending approval
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    The household owner will review your application.
                  </p>
                </div>
              ) : applicationStatus === 'rejected' ? (
                <div className="text-center">
                  <div className="inline-flex items-center px-4 py-2 bg-red-100 text-red-800 rounded-md">
                    Application was rejected
                  </div>
                  <button
                    onClick={() => {
                      setApplicationStatus('none');
                      setShowApplicationForm(true);
                      setError(null);
                    }}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Apply again
                  </button>
                </div>
              ) : showApplicationForm ? (
                <form onSubmit={handleSubmitApplication} className="space-y-4">
                  <div>
                    <label
                      htmlFor="applicationMessage"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Why would you like to join this household?
                    </label>
                    <textarea
                      id="applicationMessage"
                      value={applicationMessage}
                      onChange={(e) => setApplicationMessage(e.target.value)}
                      placeholder="Please explain your relationship to this household or why you need access..."
                      rows={3}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={
                        submittingApplication || !applicationMessage.trim()
                      }
                      className="flex-1 justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {submittingApplication
                        ? 'Submitting...'
                        : 'Submit Application'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowApplicationForm(false);
                        setApplicationMessage('');
                        setError(null);
                      }}
                      className="flex-1 justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Back
                    </button>
                  </div>
                </form>
              ) : null}
            </>
          ) : (
            // Loading state while checking household existence
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Checking household status...</p>
            </div>
          )}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="text-sm text-yellow-800">
            <p className="mb-2">
              <strong>🔒 Protected:</strong> This household budget is private
              and secure.
            </p>
            <p>
              <strong>📝 Need access?</strong> Submit an application and the
              household owner will review it.
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
