import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import { HouseholdAuth } from './HouseholdAuth';
import { LandingPage } from './LandingPage';

export function AppRouter() {
  return (
    <Routes>
      {/* Landing page */}
      <Route path="/" element={<LandingPage />} />

      {/* Multi-tenant household routes */}
      <Route path="/:householdId" element={<HouseholdWrapper />} />

      {/* Redirect any other paths to landing */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
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
