import { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  UserPlus,
  Check,
  X,
  Clock,
  User as UserIcon,
  Mail,
} from 'lucide-react';

interface Application {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: Timestamp;
  householdId: string;
}

interface HouseholdMember {
  role: 'owner' | 'member';
  addedAt: Timestamp;
  displayName?: string;
  email?: string;
  photoURL?: string;
  // Financial fields
  monthlyIncome: number;
  municipalTaxRate: number;
  color: string;
}

interface ApplicationManagerProps {
  householdId: string;
  isOwner: boolean;
}

export function ApplicationManager({
  householdId,
  isOwner,
}: ApplicationManagerProps) {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingAppId, setProcessingAppId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwner || !user) {
      setLoading(false);
      return;
    }

    console.log(`📋 Loading applications for household: ${householdId}`);

    // Listen to applications in real-time
    const applicationsRef = collection(
      db,
      'households',
      householdId,
      'applications'
    );
    const q = query(applicationsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const apps: Application[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          apps.push({
            id: doc.id,
            userId: data.userId,
            displayName: data.displayName,
            email: data.email,
            photoURL: data.photoURL,
            message: data.message,
            status: data.status || 'pending',
            appliedAt: data.appliedAt,
            householdId: data.householdId,
          });
        });

        // Sort by application date, newest first
        apps.sort((a, b) => b.appliedAt.toMillis() - a.appliedAt.toMillis());

        console.log(`📋 Loaded ${apps.length} applications`);
        setApplications(apps);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading applications:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [householdId, isOwner, user]);

  // Predefined color palette for users
  const USER_COLORS = [
    '#10B981', // Green
    '#3B82F6', // Blue
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#EC4899', // Pink
    '#6B7280', // Gray
  ];

  const getColorForUserIndex = async (householdId: string): Promise<string> => {
    try {
      // Count existing members to determine next color index
      const membersRef = collection(db, 'households', householdId, 'members');
      const membersSnap = await getDocs(membersRef);

      const memberCount = membersSnap.size;

      // Assign color based on member count (owner is index 0, next member is index 1, etc.)
      const colorIndex = memberCount % USER_COLORS.length;

      return USER_COLORS[colorIndex];
    } catch (error) {
      console.error('Error getting color for user:', error);
      // Fallback to first color
      return USER_COLORS[0];
    }
  };

  const handleApproveApplication = async (application: Application) => {
    if (!user || !isOwner || processingAppId) return;

    setProcessingAppId(application.id);

    try {
      console.log(`✅ Approving application from ${application.displayName}`);

      // Get color based on current member count
      const memberColor = await getColorForUserIndex(householdId);

      // Create member document
      const memberDocRef = doc(
        db,
        'households',
        householdId,
        'members',
        application.userId
      );
      const memberData: HouseholdMember = {
        role: 'member',
        addedAt: serverTimestamp() as Timestamp,
        displayName: application.displayName,
        email: application.email,
        photoURL: application.photoURL,
        // Financial defaults for new members
        monthlyIncome: 0,
        municipalTaxRate: 0.32, // Default Swedish tax rate
        color: memberColor, // Unique color for this member
      };

      await setDoc(memberDocRef, memberData);

      // Update application status
      const appDocRef = doc(
        db,
        'households',
        householdId,
        'applications',
        application.id
      );
      await updateDoc(appDocRef, {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: user.uid,
      });

      console.log(
        `✅ Successfully approved application from ${application.displayName}`
      );
    } catch (error) {
      console.error('Error approving application:', error);
      alert('Failed to approve application. Please try again.');
    } finally {
      setProcessingAppId(null);
    }
  };

  const handleRejectApplication = async (application: Application) => {
    if (!user || !isOwner || processingAppId) return;

    setProcessingAppId(application.id);

    try {
      console.log(`❌ Rejecting application from ${application.displayName}`);

      // Update application status
      const appDocRef = doc(
        db,
        'households',
        householdId,
        'applications',
        application.id
      );
      await updateDoc(appDocRef, {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: user.uid,
      });

      console.log(
        `❌ Successfully rejected application from ${application.displayName}`
      );
    } catch (error) {
      console.error('Error rejecting application:', error);
      alert('Failed to reject application. Please try again.');
    } finally {
      setProcessingAppId(null);
    }
  };

  const handleDeleteApplication = async (applicationId: string) => {
    if (!user || !isOwner || processingAppId) return;

    if (
      !confirm(
        'Are you sure you want to delete this application? This cannot be undone.'
      )
    ) {
      return;
    }

    setProcessingAppId(applicationId);

    try {
      console.log(`🗑️ Deleting application: ${applicationId}`);

      const appDocRef = doc(
        db,
        'households',
        householdId,
        'applications',
        applicationId
      );
      await deleteDoc(appDocRef);

      console.log(`🗑️ Successfully deleted application`);
    } catch (error) {
      console.error('Error deleting application:', error);
      alert('Failed to delete application. Please try again.');
    } finally {
      setProcessingAppId(null);
    }
  };

  if (!isOwner) {
    return null; // Don't show to non-owners
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Household Applications
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const pendingApplications = applications.filter(
    (app) => app.status === 'pending'
  );
  const processedApplications = applications.filter(
    (app) => app.status !== 'pending'
  );

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <UserPlus className="w-5 h-5" />
        Household Applications
        {pendingApplications.length > 0 && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            {pendingApplications.length} pending
          </span>
        )}
      </h3>

      {applications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No applications yet.</p>
          <p className="text-xs mt-1">
            Share your household URL with family members so they can apply to
            join.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Applications */}
          {pendingApplications.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                Pending Applications ({pendingApplications.length})
              </h4>
              <div className="space-y-3">
                {pendingApplications.map((app) => (
                  <div
                    key={app.id}
                    className="border border-yellow-200 rounded-lg p-4 bg-yellow-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {app.photoURL ? (
                          <img
                            src={app.photoURL}
                            alt={app.displayName}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-gray-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-medium text-gray-900">
                              {app.displayName}
                            </h5>
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <Mail className="w-3 h-3" />
                              {app.email}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">
                            {app.message}
                          </p>
                          <p className="text-xs text-gray-500">
                            Applied{' '}
                            {app.appliedAt.toDate().toLocaleDateString()} at{' '}
                            {app.appliedAt.toDate().toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleApproveApplication(app)}
                          disabled={processingAppId === app.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 disabled:opacity-50"
                        >
                          <Check className="w-3 h-3" />
                          {processingAppId === app.id
                            ? 'Approving...'
                            : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleRejectApplication(app)}
                          disabled={processingAppId === app.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                          {processingAppId === app.id
                            ? 'Rejecting...'
                            : 'Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Processed Applications */}
          {processedApplications.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Recent Decisions ({processedApplications.length})
              </h4>
              <div className="space-y-2">
                {processedApplications.slice(0, 5).map((app) => (
                  <div
                    key={app.id}
                    className={`border rounded-lg p-3 ${
                      app.status === 'approved'
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {app.photoURL ? (
                          <img
                            src={app.photoURL}
                            alt={app.displayName}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-gray-600" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {app.displayName}
                          </p>
                          <p className="text-xs text-gray-500">{app.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            app.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {app.status === 'approved' ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          {app.status === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                        <button
                          onClick={() => handleDeleteApplication(app.id)}
                          disabled={processingAppId === app.id}
                          className="text-gray-400 hover:text-gray-600 p-1"
                          title="Delete application"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
