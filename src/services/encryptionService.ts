export interface HouseholdData {
  encryptedData: string;
  iv: string;
  salt: string; // For password-based key derivation
  algorithm: 'AES-GCM';
  keyVersion: number;
  members: string[]; // User IDs for Firebase rules
  createdAt: number;
  updatedAt: number;
}

class EncryptionService {
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;
  private readonly IV_LENGTH = 12;

  // In-memory password storage per household
  private householdPasswords = new Map<string, string>();

  /**
   * Encrypt household data with password
   */
  async encryptHouseholdData(
    data: any,
    password: string
  ): Promise<HouseholdData> {
    // Generate a random salt for this household
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const key = await this.deriveKeyFromPassword(password, salt);

    // Convert data to JSON string and encode
    const jsonString = JSON.stringify(data);
    const dataBytes = new TextEncoder().encode(jsonString);

    // Generate IV for encryption
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    // Encrypt the household data
    const encryptedBytes = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv },
      key,
      dataBytes
    );

    return {
      encryptedData: Array.from(new Uint8Array(encryptedBytes), (b) =>
        b.toString(16).padStart(2, '0')
      ).join(''),
      iv: Array.from(iv, (b) => b.toString(16).padStart(2, '0')).join(''),
      salt: Array.from(salt, (b) => b.toString(16).padStart(2, '0')).join(''),
      algorithm: this.ALGORITHM,
      keyVersion: 1,
      members: [], // Empty array - not used in password-only system
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Decrypt household data with password
   */
  async decryptHouseholdData(
    householdData: HouseholdData,
    password: string
  ): Promise<any> {
    // Convert hex salt back to Uint8Array
    const salt = new Uint8Array(
      householdData.salt.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
    );
    const key = await this.deriveKeyFromPassword(password, salt);

    // Convert hex strings back to Uint8Array
    const encryptedBytes = new Uint8Array(
      householdData.encryptedData
        .match(/.{2}/g)!
        .map((byte) => parseInt(byte, 16))
    );
    const iv = new Uint8Array(
      householdData.iv.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
    );

    // Decrypt the household data
    const decryptedBytes = await crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv },
      key,
      encryptedBytes
    );

    // Convert back to string and parse JSON
    const jsonString = new TextDecoder().decode(decryptedBytes);
    return JSON.parse(jsonString);
  }

  /**
   * Test if password can decrypt household data (for join validation)
   */
  async testPassword(
    householdData: HouseholdData,
    password: string
  ): Promise<boolean> {
    try {
      await this.decryptHouseholdData(householdData, password);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Set password for a household (stored in memory and session storage)
   */
  setHouseholdPassword(householdId: string, password: string): void {
    this.householdPasswords.set(householdId, password);
    // Also store in session storage for page refresh persistence
    try {
      sessionStorage.setItem(`household_password_${householdId}`, password);
    } catch (error) {
      console.warn('Failed to store password in session storage:', error);
    }
  }

  /**
   * Check if password is available for household (memory or session storage)
   */
  hasHouseholdPassword(householdId: string): boolean {
    if (this.householdPasswords.has(householdId)) {
      return true;
    }
    // Check session storage as fallback
    try {
      return (
        sessionStorage.getItem(`household_password_${householdId}`) !== null
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get password for a household (from memory or session storage)
   */
  getHouseholdPassword(householdId: string): string | null {
    // Try memory first
    const memoryPassword = this.householdPasswords.get(householdId);
    if (memoryPassword) {
      return memoryPassword;
    }

    // Fallback to session storage
    try {
      const sessionPassword = sessionStorage.getItem(
        `household_password_${householdId}`
      );
      if (sessionPassword) {
        // Restore to memory for faster future access
        this.householdPasswords.set(householdId, sessionPassword);
        return sessionPassword;
      }
    } catch (error) {
      console.warn('Failed to retrieve password from session storage:', error);
    }

    return null;
  }

  /**
   * Clear password for a household (from memory and session storage)
   */
  clearHouseholdPassword(householdId: string): void {
    this.householdPasswords.delete(householdId);
    try {
      sessionStorage.removeItem(`household_password_${householdId}`);
    } catch (error) {
      console.warn('Failed to clear password from session storage:', error);
    }
  }

  /**
   * Clear all stored passwords (from memory and session storage)
   */
  clearAllPasswords(): void {
    this.householdPasswords.clear();
    try {
      // Clear all household passwords from session storage
      const keys = Object.keys(sessionStorage);
      keys.forEach((key) => {
        if (key.startsWith('household_password_')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear passwords from session storage:', error);
    }
  }

  /**
   * Derive encryption key from password
   */
  private async deriveKeyFromPassword(
    password: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    // Import the password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive a key using PBKDF2 with proper salt
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false, // not extractable
      ['encrypt', 'decrypt']
    );
  }
}

export const encryptionService = new EncryptionService();
