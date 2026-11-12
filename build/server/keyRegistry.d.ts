/**
 * Server-side Public Key Registry for client devices.
 * Manages registered public keys (ECDSA P-256) per device and user.
 */
export interface RegisteredDeviceKey {
    deviceId: string;
    userId: string;
    publicKey: string;
    algorithm: 'ECDSA_P256_SHA256';
    isHardwareBacked: boolean;
    isStrongBoxBacked?: boolean;
    registeredAt: string;
    revokedAt?: string | null;
    keyVersion: number;
}
export declare class DeviceKeyRegistry {
    private keys;
    private makeKey;
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
    }): RegisteredDeviceKey;
    /**
     * Retrieves the active (non-revoked) key for a device and user.
     */
    getActiveKey(deviceId: string, userId: string): RegisteredDeviceKey | undefined;
    /**
     * Rotates an existing key to a new public key.
     */
    rotateKey(deviceId: string, userId: string, newPublicKey: string, isHardwareBacked: boolean, isStrongBoxBacked?: boolean): RegisteredDeviceKey;
    /**
     * Revokes / invalidates a device key.
     */
    revokeKey(deviceId: string, userId: string): boolean;
    /**
     * Clears all registered keys (for testing).
     */
    clear(): void;
}
//# sourceMappingURL=keyRegistry.d.ts.map