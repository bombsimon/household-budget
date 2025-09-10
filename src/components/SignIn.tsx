import { LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function SignIn() {
  const { signInWithGoogle, loading } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in failed:', error);
      // Could add error state here for user feedback
    }
  };

  return (
    <div className="h-screen bg-white flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-6">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to Household Budget
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage your household finances
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <LogIn className="h-5 w-5 text-blue-500 group-hover:text-blue-400" />
            </span>
            {loading ? 'Loading...' : 'Sign in with Google'}
          </button>
        </div>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                Secure authentication with Firebase
              </span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="text-sm text-blue-800">
            <p className="mb-2">
              <strong>✓ Secure:</strong> Your data is protected with Firebase
              Authentication
            </p>
            <p className="mb-2">
              <strong>✓ Private:</strong> Only you and invited family members
              can access your household budget
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
