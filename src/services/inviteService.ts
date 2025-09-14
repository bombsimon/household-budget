import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { encryptionService, type InviteInfo } from './encryptionService';

export interface CreateInviteOptions {
  householdId: string;
  createdBy: string;
  householdKey: CryptoKey;
  targetEmail: string;
  expiresInDays?: number;
  maxUses?: number;
}

export interface RedeemInviteResult {
  success: boolean;
  householdKey?: CryptoKey;
  error?: string;
}

class InviteService {
  /**
   * Create a new invite for a household
   */
  async createInvite({
    householdId,
    createdBy,
    householdKey,
    targetEmail,
    expiresInDays = 7,
    maxUses = 1,
  }: CreateInviteOptions): Promise<string> {
    const inviteCode = encryptionService.generateInviteCode();
    const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;

    // Encrypt household key with invite code
    const { encryptedKey, iv } =
      await encryptionService.encryptHouseholdKeyForInvite(
        householdKey,
        inviteCode
      );

    // Store invite info in Firebase
    const inviteDocRef = doc(db, 'invites', inviteCode);
    const inviteData: Omit<InviteInfo, 'inviteCode'> & { createdAt: any } = {
      householdId,
      createdBy,
      targetEmail: targetEmail.toLowerCase(), // Normalize email case
      encryptedHouseholdKey: encryptedKey,
      keyIv: iv,
      keyVersion: 1,
      expiresAt,
      maxUses,
      usedCount: 0,
      createdAt: serverTimestamp(),
    };

    await setDoc(inviteDocRef, inviteData);

    console.log(`✅ Created invite ${inviteCode} for household ${householdId}`);
    return inviteCode;
  }

  /**
   * Get invite information
   */
  async getInvite(inviteCode: string): Promise<InviteInfo | null> {
    try {
      const inviteDocRef = doc(db, 'invites', inviteCode);
      const inviteSnap = await getDoc(inviteDocRef);

      if (!inviteSnap.exists()) {
        return null;
      }

      const data = inviteSnap.data();
      return {
        inviteCode,
        householdId: data.householdId,
        createdBy: data.createdBy,
        targetEmail: data.targetEmail,
        encryptedHouseholdKey: data.encryptedHouseholdKey,
        keyIv: data.keyIv,
        keyVersion: data.keyVersion,
        expiresAt: data.expiresAt,
        maxUses: data.maxUses,
        usedCount: data.usedCount,
      };
    } catch (error) {
      console.error('Error getting invite:', error);
      return null;
    }
  }

  /**
   * Check if invite is valid and not expired
   */
  isInviteValid(invite: InviteInfo): boolean {
    const now = Date.now();

    // Check if expired
    if (invite.expiresAt < now) {
      return false;
    }

    // Check if max uses exceeded
    if (invite.usedCount >= invite.maxUses) {
      return false;
    }

    return true;
  }

  /**
   * Redeem an invite to get household key
   */
  async redeemInvite(
    inviteCode: string,
    userEmail: string
  ): Promise<RedeemInviteResult> {
    try {
      const invite = await this.getInvite(inviteCode);

      if (!invite) {
        return { success: false, error: 'Invite not found' };
      }

      // Verify that the user's email matches the invite's target email
      if (invite.targetEmail.toLowerCase() !== userEmail.toLowerCase()) {
        return {
          success: false,
          error: 'This invite is not for your email address',
        };
      }

      if (!this.isInviteValid(invite)) {
        return { success: false, error: 'Invite expired or fully used' };
      }

      // Decrypt household key using invite code
      const householdKey =
        await encryptionService.decryptHouseholdKeyFromInvite(
          invite.encryptedHouseholdKey,
          invite.keyIv,
          inviteCode
        );

      // Increment usage count
      const inviteDocRef = doc(db, 'invites', inviteCode);
      await updateDoc(inviteDocRef, {
        usedCount: increment(1),
      });

      console.log(
        `✅ Redeemed invite ${inviteCode} for household ${invite.householdId}`
      );

      return {
        success: true,
        householdKey,
      };
    } catch (error) {
      console.error('Error redeeming invite:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to redeem invite',
      };
    }
  }

  /**
   * Delete an invite (e.g., when it expires or is no longer needed)
   */
  async deleteInvite(inviteCode: string): Promise<void> {
    try {
      const inviteDocRef = doc(db, 'invites', inviteCode);
      await deleteDoc(inviteDocRef);
      console.log(`🗑️ Deleted invite ${inviteCode}`);
    } catch (error) {
      console.error('Error deleting invite:', error);
      throw error;
    }
  }

  /**
   * Generate invite URL for sharing
   */
  generateInviteUrl(inviteCode: string): string {
    // Get the full base URL including any sub-path (e.g., /household-budget on GitHub Pages)
    const baseUrl =
      window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
    return `${baseUrl}/invite/${inviteCode}`;
  }

  /**
   * Parse invite code from URL
   */
  parseInviteFromUrl(url: string): string | null {
    const match = url.match(/\/invite\/([a-f0-9]{32})/i);
    return match ? match[1] : null;
  }
}

export const inviteService = new InviteService();
