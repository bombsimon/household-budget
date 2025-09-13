import { getAuth } from 'firebase/auth';

export interface EncryptedData {
  encryptedData: string;
  iv: string;
  algorithm: 'AES-GCM';
  keyVersion: number;
}

export interface HouseholdKeyInfo {
  encryptedKey: string;
  iv: string;
  keyVersion: number;
  createdAt: number;
}

export interface InviteInfo {
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
}

class EncryptionService {
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;
  private readonly IV_LENGTH = 12;

  /**
   * Generate a secure random household key
   */
  async generateHouseholdKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate a secure random invite code
   */
  generateInviteCode(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
      ''
    );
  }

  /**
   * Derive encryption key from user's auth token
   */
  private async deriveKeyFromToken(
    token: string,
    salt: string
  ): Promise<CryptoKey> {
    // Import the token as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(token + salt),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive a key using PBKDF2
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode(salt),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false, // not extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt household key with user's auth token
   */
  async encryptHouseholdKeyForUser(
    householdKey: CryptoKey,
    userToken: string,
    householdId: string
  ): Promise<HouseholdKeyInfo> {
    const salt = `household-${householdId}`;
    const userKey = await this.deriveKeyFromToken(userToken, salt);

    // Export household key as raw data
    const keyData = await crypto.subtle.exportKey('raw', householdKey);

    // Generate IV for encryption
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    // Encrypt the household key
    const encryptedKey = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv },
      userKey,
      keyData
    );

    return {
      encryptedKey: Array.from(new Uint8Array(encryptedKey), (b) =>
        b.toString(16).padStart(2, '0')
      ).join(''),
      iv: Array.from(iv, (b) => b.toString(16).padStart(2, '0')).join(''),
      keyVersion: 1,
      createdAt: Date.now(),
    };
  }

  /**
   * Decrypt household key using user's auth token
   */
  async decryptHouseholdKeyForUser(
    encryptedKeyInfo: HouseholdKeyInfo,
    userToken: string,
    householdId: string
  ): Promise<CryptoKey> {
    const salt = `household-${householdId}`;
    const userKey = await this.deriveKeyFromToken(userToken, salt);

    // Convert hex strings back to Uint8Array
    const encryptedKey = new Uint8Array(
      encryptedKeyInfo.encryptedKey
        .match(/.{2}/g)!
        .map((byte) => parseInt(byte, 16))
    );
    const iv = new Uint8Array(
      encryptedKeyInfo.iv.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
    );

    // Decrypt the household key data
    const keyData = await crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv },
      userKey,
      encryptedKey
    );

    // Import the decrypted key data back as CryptoKey (extractable for invites)
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: this.ALGORITHM },
      true, // extractable for invite creation
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt household key with invite code (temporary)
   */
  async encryptHouseholdKeyForInvite(
    householdKey: CryptoKey,
    inviteCode: string
  ): Promise<{ encryptedKey: string; iv: string }> {
    // Use invite code as key material
    const inviteKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(inviteCode),
      { name: this.ALGORITHM },
      false,
      ['encrypt']
    );

    // Export household key as raw data
    const keyData = await crypto.subtle.exportKey('raw', householdKey);

    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    // Encrypt with invite code
    const encryptedKey = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv },
      inviteKey,
      keyData
    );

    return {
      encryptedKey: Array.from(new Uint8Array(encryptedKey), (b) =>
        b.toString(16).padStart(2, '0')
      ).join(''),
      iv: Array.from(iv, (b) => b.toString(16).padStart(2, '0')).join(''),
    };
  }

  /**
   * Decrypt household key using invite code
   */
  async decryptHouseholdKeyFromInvite(
    encryptedKey: string,
    iv: string,
    inviteCode: string
  ): Promise<CryptoKey> {
    // Use invite code as key material
    const inviteKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(inviteCode),
      { name: this.ALGORITHM },
      false,
      ['decrypt']
    );

    // Convert hex strings back to Uint8Array
    const encryptedKeyBytes = new Uint8Array(
      encryptedKey.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
    );
    const ivBytes = new Uint8Array(
      iv.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
    );

    // Decrypt the household key data
    const keyData = await crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv: ivBytes },
      inviteKey,
      encryptedKeyBytes
    );

    // Import the decrypted key data back as CryptoKey (extractable for user storage)
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: this.ALGORITHM },
      true, // extractable for user key storage
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data using household key
   */
  async encryptData(
    data: any,
    householdKey: CryptoKey
  ): Promise<EncryptedData> {
    const jsonString = JSON.stringify(data);
    const dataBytes = new TextEncoder().encode(jsonString);

    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    // Encrypt
    const encryptedBytes = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv },
      householdKey,
      dataBytes
    );

    return {
      encryptedData: Array.from(new Uint8Array(encryptedBytes), (b) =>
        b.toString(16).padStart(2, '0')
      ).join(''),
      iv: Array.from(iv, (b) => b.toString(16).padStart(2, '0')).join(''),
      algorithm: this.ALGORITHM,
      keyVersion: 1,
    };
  }

  /**
   * Decrypt data using household key
   */
  async decryptData(
    encryptedData: EncryptedData,
    householdKey: CryptoKey
  ): Promise<any> {
    // Convert hex strings back to Uint8Array
    const encryptedBytes = new Uint8Array(
      encryptedData.encryptedData
        .match(/.{2}/g)!
        .map((byte) => parseInt(byte, 16))
    );
    const iv = new Uint8Array(
      encryptedData.iv.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
    );

    // Decrypt
    const decryptedBytes = await crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv },
      householdKey,
      encryptedBytes
    );

    // Convert back to string and parse JSON
    const jsonString = new TextDecoder().decode(decryptedBytes);
    return JSON.parse(jsonString);
  }

  /**
   * Get current user's auth token
   */
  async getCurrentUserToken(): Promise<string> {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('No authenticated user');
    }
    return await auth.currentUser.getIdToken();
  }
}

export const encryptionService = new EncryptionService();
