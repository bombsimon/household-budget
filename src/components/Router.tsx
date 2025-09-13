import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import { HouseholdAuth } from './HouseholdAuth';
import { LandingPage } from './LandingPage';
import { SignIn } from './SignIn';
import { useAuth } from '../contexts/AuthContext';

export function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <SignIn />;
  }

  return (
    <Routes>
      {/* Landing page */}
      <Route path="/" element={<LandingPage />} />

      {/* Invite redemption routes */}
      <Route path="/invite/:inviteCode" element={<InviteWrapper />} />

      {/* Multi-tenant household routes */}
      <Route path="/:householdId" element={<HouseholdWrapper />} />

      {/* Redirect any other paths to landing */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function InviteWrapper() {
  const { inviteCode } = useParams<{ inviteCode: string }>();

  if (!inviteCode) {
    return <Navigate to="/" />;
  }

  // Validate invite code format (should be 32 hex characters)
  const validInviteCode = /^[a-f0-9]{32}$/i.test(inviteCode);

  if (!validInviteCode) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Invalid Invite Code
          </h1>
          <p className="text-gray-600 mb-4">
            This invite link appears to be malformed or corrupted.
          </p>
          <a href="/" className="text-blue-600 hover:text-blue-800 underline">
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  // For invite redemption, we pass a placeholder household ID
  // The actual household ID will be determined from the invite
  return <HouseholdAuth householdId="invite-redemption" />;
}

function HouseholdWrapper() {
  const { householdId } = useParams<{ householdId: string }>();

  if (!householdId) {
    return <Navigate to="/" />;
  }

  // Validate householdId format (alphanumeric, hyphens, underscores)
  const validHouseholdId = /^[a-zA-Z0-9_-]+$/.test(householdId);

  if (!validHouseholdId) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Invalid Household ID
          </h1>
          <p className="text-gray-600 mb-4">
            Household IDs can only contain letters, numbers, hyphens, and
            underscores.
          </p>
          <a href="/" className="text-blue-600 hover:text-blue-800 underline">
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  return <HouseholdAuth householdId={householdId} />;
}
