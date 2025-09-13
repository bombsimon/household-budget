import { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  Link as LinkIcon,
  Copy,
  Clock,
  Users,
  Trash2,
  Plus,
  Check,
} from 'lucide-react';
import { inviteService } from '../services/inviteService';

interface InviteManagerProps {
  householdId: string;
  isOwner: boolean;
  householdKey?: CryptoKey;
}

interface InviteWithTimestamp {
  inviteCode: string;
  householdId: string;
  createdBy: string;
  targetEmail: string;
  encryptedHouseholdKey: string;
  keyIv: string;
  keyVersion: number;
  expiresAt: number;
  maxUses: number;
  usedCount: number;
  createdAt: { toDate(): Date };
}

export function InviteManager({
  householdId,
  isOwner,
  householdKey,
}: InviteManagerProps) {
  const { user } = useAuth();
  const [invites, setInvites] = useState<InviteWithTimestamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');

  // Listen to invites for this household
  useEffect(() => {
    if (!isOwner || !user) {
      setLoading(false);
      return;
    }

    console.log(`🔗 Loading invites for household: ${householdId}`);

    const invitesRef = collection(db, 'invites');
    const q = query(
      invitesRef,
      where('householdId', '==', householdId),
      where('createdBy', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const inviteList: InviteWithTimestamp[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          inviteList.push({
            inviteCode: doc.id,
            householdId: data.householdId,
            createdBy: data.createdBy,
            targetEmail: data.targetEmail,
            encryptedHouseholdKey: data.encryptedHouseholdKey,
            keyIv: data.keyIv,
            keyVersion: data.keyVersion,
            expiresAt: data.expiresAt,
            maxUses: data.maxUses,
            usedCount: data.usedCount,
            createdAt: data.createdAt,
          });
        });

        console.log(`🔗 Loaded ${inviteList.length} invites`);
        setInvites(inviteList);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading invites:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [householdId, isOwner, user]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !householdKey || creating || !targetEmail.trim()) return;

    setCreating(true);

    try {
      console.log(
        `🎫 Creating invite for ${targetEmail} in household: ${householdId}`
      );

      const inviteCode = await inviteService.createInvite({
        householdId,
        createdBy: user.uid,
        householdKey,
        targetEmail: targetEmail.trim(),
        expiresInDays: 7,
        maxUses: 1,
      });

      console.log(`✅ Successfully created invite: ${inviteCode}`);

      // Reset form
      setTargetEmail('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating invite:', error);
      alert('Failed to create invite. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyInviteUrl = async (inviteCode: string) => {
    const url = inviteService.generateInviteUrl(inviteCode);

    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(inviteCode);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedCode(inviteCode);
        setTimeout(() => setCopiedCode(null), 2000);
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError);
        alert(`Copy this URL to share: ${url}`);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleDeleteInvite = async (inviteCode: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this invite? This cannot be undone.'
      )
    ) {
      return;
    }

    try {
      console.log(`🗑️ Deleting invite: ${inviteCode}`);
      await inviteService.deleteInvite(inviteCode);
      console.log(`✅ Successfully deleted invite`);
    } catch (error) {
      console.error('Error deleting invite:', error);
      alert('Failed to delete invite. Please try again.');
    }
  };

  const isInviteExpired = (invite: InviteWithTimestamp): boolean => {
    return invite.expiresAt < Date.now();
  };

  const isInviteExhausted = (invite: InviteWithTimestamp): boolean => {
    return invite.usedCount >= invite.maxUses;
  };

  const formatTimeRemaining = (expiresAt: number): string => {
    const now = Date.now();
    const remaining = expiresAt - now;

    if (remaining <= 0) {
      return 'Expired';
    }

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else {
      return `${hours}h remaining`;
    }
  };

  if (!isOwner) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <LinkIcon className="w-5 h-5" />
          Household Invites
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const activeInvites = invites.filter(
    (invite) => !isInviteExpired(invite) && !isInviteExhausted(invite)
  );
  const inactiveInvites = invites.filter(
    (invite) => isInviteExpired(invite) || isInviteExhausted(invite)
  );

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <LinkIcon className="w-5 h-5" />
          Household Invites
          {activeInvites.length > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {activeInvites.length} active
            </span>
          )}
        </h3>

        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          disabled={!householdKey}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Invite
        </button>
      </div>

      {/* Create Invite Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateInvite}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
        >
          <h4 className="text-sm font-medium text-blue-900 mb-3">
            Create New Invite
          </h4>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="targetEmail"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                type="email"
                id="targetEmail"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                placeholder="Enter the recipient's email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Only this person will be able to use the invite link
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={creating || !targetEmail.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : (
                  'Create Invite'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setTargetEmail('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {invites.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <LinkIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No invites created yet.</p>
          <p className="text-xs mt-1">
            Create an invite link to share with family members.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Invites */}
          {activeInvites.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-500" />
                Active Invites ({activeInvites.length})
              </h4>
              <div className="space-y-3">
                {activeInvites.map((invite) => (
                  <div
                    key={invite.inviteCode}
                    className="border border-green-200 rounded-lg p-4 bg-green-50"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                            {invite.inviteCode}
                          </code>
                          <span className="text-xs text-gray-500">
                            {formatTimeRemaining(invite.expiresAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>
                              {invite.usedCount}/{invite.maxUses} uses
                            </span>
                          </div>
                          <div>
                            Created{' '}
                            {invite.createdAt?.toDate()?.toLocaleDateString() ||
                              'Unknown'}
                          </div>
                        </div>

                        <div className="text-sm text-gray-700 mb-3">
                          <strong>For:</strong> {invite.targetEmail}
                        </div>

                        <div className="text-xs text-gray-500">
                          Share this link:{' '}
                          {inviteService.generateInviteUrl(invite.inviteCode)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:flex-shrink-0">
                        <button
                          onClick={() => handleCopyInviteUrl(invite.inviteCode)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        >
                          {copiedCode === invite.inviteCode ? (
                            <>
                              <Check className="w-3 h-3" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy Link
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteInvite(invite.inviteCode)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inactive Invites */}
          {inactiveInvites.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Expired/Used Invites ({inactiveInvites.length})
              </h4>
              <div className="space-y-2">
                {inactiveInvites.slice(0, 3).map((invite) => (
                  <div
                    key={invite.inviteCode}
                    className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <code className="text-sm font-mono text-gray-500">
                            {invite.inviteCode}
                          </code>
                          <div className="text-xs text-gray-500">
                            {isInviteExpired(invite) ? 'Expired' : 'Fully used'}{' '}
                            •{' '}
                            {invite.createdAt?.toDate()?.toLocaleDateString() ||
                              'Unknown'}
                          </div>
                          <div className="text-xs text-gray-600">
                            For: {invite.targetEmail}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteInvite(invite.inviteCode)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="Delete invite"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-6">
        <div className="text-sm text-blue-800">
          <p className="mb-2">
            <strong>🔗 How invites work:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Create invite links for specific email addresses</li>
            <li>Only the person with that email can use the invite link</li>
            <li>Each invite expires in 7 days and can be used once</li>
            <li>
              Invites are automatically deleted after successful use for
              security
            </li>
            <li>All household data is automatically encrypted and secure</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
