/**
 * Server-side Public Key Registry for client devices.
 * Manages registered public keys (ECDSA P-256) per device and user.
 */

export interface RegisteredDeviceKey {
  deviceId: string;
  userId: string;
  publicKey: string; // Base64 SPKI or raw point
  algorithm: 'ECDSA_P256_SHA256';
  isHardwareBacked: boolean;
  isStrongBoxBacked?: boolean;
  registeredAt: string;
  revokedAt?: string | null;
  keyVersion: number;
}

export class DeviceKeyRegistry {
  private keys = new Map<string, RegisteredDeviceKey>();

  private makeKey(deviceId: string, userId: string): string {
    return `${deviceId}:${userId}`;
  }

  /**
   * Registers a new device public key.
   */
  registerKey(info: {
    deviceId: string;
    userId: string;
    publicKey: string;
    isHardwareBacked: boolean;
    isStrongBoxBacked?: boolean;
    algorithm?: 'ECDSA_P256_SHA256';
  }): RegisteredDeviceKey {
    const {
      deviceId,
      userId,
      publicKey,
      isHardwareBacked,
      isStrongBoxBacked = false,
      algorithm = 'ECDSA_P256_SHA256',
    } = info;

    if (!deviceId || !userId || !publicKey) {
      throw new Error('[face-liveness-recognition] deviceId, userId, and publicKey are required for key registration.');
    }

    const mapKey = this.makeKey(deviceId, userId);
    const existing = this.keys.get(mapKey);

    const record: RegisteredDeviceKey = {
      deviceId,
      userId,
      publicKey,
      algorithm,
      isHardwareBacked,
      isStrongBoxBacked,
      registeredAt: new Date().toISOString(),
      revokedAt: null,
      keyVersion: existing ? existing.keyVersion + 1 : 1,
    };

    this.keys.set(mapKey, record);
    return { ...record };
  }

  /**
   * Retrieves the active (non-revoked) key for a device and user.
   */
  getActiveKey(deviceId: string, userId: string): RegisteredDeviceKey | undefined {
    const record = this.keys.get(this.makeKey(deviceId, userId));
    if (record && !record.revokedAt) {
      return { ...record };
    }
    return undefined;
  }

  /**
   * Rotates an existing key to a new public key.
   */
  rotateKey(
    deviceId: string,
    userId: string,
    newPublicKey: string,
    isHardwareBacked: boolean,
    isStrongBoxBacked: boolean = false
  ): RegisteredDeviceKey {
    return this.registerKey({
      deviceId,
      userId,
      publicKey: newPublicKey,
      isHardwareBacked,
      isStrongBoxBacked,
    });
  }

  /**
   * Revokes / invalidates a device key.
   */
  revokeKey(deviceId: string, userId: string): boolean {
    const mapKey = this.makeKey(deviceId, userId);
    const record = this.keys.get(mapKey);
    if (record && !record.revokedAt) {
      record.revokedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Clears all registered keys (for testing).
   */
  clear(): void {
    this.keys.clear();
  }
}
