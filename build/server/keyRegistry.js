"use strict";
/**
 * Server-side Public Key Registry for client devices.
 * Manages registered public keys (ECDSA P-256) per device and user.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceKeyRegistry = void 0;
class DeviceKeyRegistry {
    constructor() {
        this.keys = new Map();
    }
    makeKey(deviceId, userId) {
        return `${deviceId}:${userId}`;
    }
    /**
     * Registers a new device public key.
     */
    registerKey(info) {
        const { deviceId, userId, publicKey, isHardwareBacked, isStrongBoxBacked = false, algorithm = 'ECDSA_P256_SHA256', } = info;
        if (!deviceId || !userId || !publicKey) {
            throw new Error('[face-liveness-recognition] deviceId, userId, and publicKey are required for key registration.');
        }
        const mapKey = this.makeKey(deviceId, userId);
        const existing = this.keys.get(mapKey);
        const record = {
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
    getActiveKey(deviceId, userId) {
        const record = this.keys.get(this.makeKey(deviceId, userId));
        if (record && !record.revokedAt) {
            return { ...record };
        }
        return undefined;
    }
    /**
     * Rotates an existing key to a new public key.
     */
    rotateKey(deviceId, userId, newPublicKey, isHardwareBacked, isStrongBoxBacked = false) {
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
    revokeKey(deviceId, userId) {
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
    clear() {
        this.keys.clear();
    }
}
exports.DeviceKeyRegistry = DeviceKeyRegistry;
//# sourceMappingURL=keyRegistry.js.map